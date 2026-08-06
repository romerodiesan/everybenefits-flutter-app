import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../privacy/academy_analytics.dart';
import '../../users/user_profile.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'widgets/lesson_stages.dart';

/// Persist cadence while playing, so a crash loses at most a few seconds.
const _saveInterval = Duration(seconds: 5);

/// Lesson player for video, reading and quiz lessons.
///
/// Video auto-completes past [kLessonCompleteThreshold], readings complete on
/// demand, and quizzes are graded (and completed) by the server callable.
class CoursePlayerScreen extends StatefulWidget {
  const CoursePlayerScreen({
    super.key,
    required this.course,
    required this.content,
    required this.enrollment,
    required this.initialLessonId,
    required this.profile,
    this.courseRepository,
  });

  final Course course;
  final CourseContent content;
  final Enrollment enrollment;
  final String initialLessonId;
  final UserProfile profile;
  final CourseRepository? courseRepository;

  @override
  State<CoursePlayerScreen> createState() => _CoursePlayerScreenState();
}

class _CoursePlayerScreenState extends State<CoursePlayerScreen> {
  late final CourseRepository _repository =
      widget.courseRepository ?? CourseRepository();

  VideoPlayerController? _controller;
  late Enrollment _enrollment;
  late Lesson _lesson;

  bool _initializing = true;
  bool _controlsVisible = true;
  Object? _error;
  DateTime _lastSaved = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastHeartbeat = DateTime.fromMillisecondsSinceEpoch(0);
  int _lastHeartbeatPos = 0;
  bool _saving = false;
  bool _advancing = false;
  final Set<String> _startedLessons = <String>{};
  final Set<String> _completedTracked = <String>{};

  @override
  void initState() {
    super.initState();
    _enrollment = widget.enrollment;
    final requested = widget.content.lessonById(widget.initialLessonId);
    _lesson = (requested != null &&
            widget.content.isLessonUnlocked(requested, _enrollment))
        ? requested
        : widget.content.lessons.firstWhere(
            (lesson) =>
                widget.content.isLessonUnlocked(lesson, _enrollment),
            orElse: () =>
                requested ?? widget.content.lessons.first,
          );
    _open(_lesson, resume: true);
    unawaited(
      trackCourseOpen(courseId: widget.course.id, source: 'direct'),
    );
  }

  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    if (controller != null) {
      controller.removeListener(_onTick);
      // Fire-and-forget: the screen is going away either way.
      _persist(
        positionSeconds: controller.value.position.inSeconds,
        completed: _reachedCompletion(controller.value),
      );
      controller.dispose();
    }
    super.dispose();
  }

  bool _reachedCompletion(VideoPlayerValue value) {
    final total = value.duration.inMilliseconds;
    if (total <= 0) return false;
    final ratio = value.position.inMilliseconds / total;
    return ratio >= kLessonCompleteThreshold;
  }

  Future<void> _open(Lesson lesson, {bool resume = false}) async {
    if (!widget.content.isLessonUnlocked(lesson, _enrollment)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.moduleLocked)),
      );
      return;
    }

    final previous = _controller;
    _controller = null;
    previous?.removeListener(_onTick);
    await previous?.dispose();

    if (!mounted) return;
    setState(() {
      _lesson = lesson;
      _initializing = lesson.isVideo;
      _error = null;
      _controlsVisible = true;
    });

    if (_startedLessons.add(lesson.id)) {
      _lastHeartbeat = DateTime.now();
      _lastHeartbeatPos = 0;
      unawaited(
        trackLessonStart(
          courseId: widget.course.id,
          lessonId: lesson.id,
          durationSeconds: lesson.durationSeconds,
        ),
      );
    }

    // Readings and quizzes have no media to fetch; the stage renders directly.
    if (!lesson.isVideo) {
      _markVisited(lesson);
      return;
    }

    try {
      final url = await _repository.resolveVideoUrl(lesson);
      if (!mounted) return;
      if (url == null) {
        setState(() {
          _initializing = false;
          _error = StateError('no-video');
        });
        return;
      }

      final controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }

      // Resume only where the learner actually left off.
      if (resume &&
          _enrollment.lastLessonId == lesson.id &&
          _enrollment.lastPositionSeconds > 0) {
        final target = Duration(seconds: _enrollment.lastPositionSeconds);
        if (target < controller.value.duration) {
          await controller.seekTo(target);
        }
      }

      controller.addListener(_onTick);
      setState(() {
        _controller = controller;
        _initializing = false;
      });
      await controller.play();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _error = error;
      });
    }
  }

  void _onTick() {
    final controller = _controller;
    if (controller == null || !mounted) return;
    final value = controller.value;
    if (!value.isInitialized) return;

    final completed = _reachedCompletion(value);
    final alreadyDone = _enrollment.hasCompleted(_lesson.id);
    final position = value.position.inSeconds;
    final duration = value.duration.inSeconds;

    if (completed && !alreadyDone) {
      _persist(positionSeconds: position, completed: true);
      if (_completedTracked.add(_lesson.id)) {
        unawaited(
          trackLessonComplete(
            courseId: widget.course.id,
            lessonId: _lesson.id,
            positionSeconds: position,
            durationSeconds: duration,
          ),
        );
      }
    } else if (value.isPlaying &&
        DateTime.now().difference(_lastSaved) > _saveInterval) {
      _persist(
        positionSeconds: position,
        completed: alreadyDone,
      );
    }

    if (value.isPlaying &&
        DateTime.now().difference(_lastHeartbeat) >=
            academyAnalyticsHeartbeat) {
      final delta = (position - _lastHeartbeatPos).clamp(0, 120);
      _lastHeartbeat = DateTime.now();
      _lastHeartbeatPos = position;
      if (delta > 0) {
        unawaited(
          trackLessonHeartbeat(
            courseId: widget.course.id,
            lessonId: _lesson.id,
            positionSeconds: position,
            durationSeconds: duration <= 0 ? 1 : duration,
            watchDeltaSeconds: delta,
          ),
        );
      }
    }

    final finished = value.position >= value.duration && !value.isPlaying;
    if (finished && !_advancing) {
      if (_completedTracked.add(_lesson.id)) {
        unawaited(
          trackLessonComplete(
            courseId: widget.course.id,
            lessonId: _lesson.id,
            positionSeconds: position,
            durationSeconds: duration,
          ),
        );
      }
      _advancing = true;
      _goNext();
    }
  }

  Future<void> _persist({
    required int positionSeconds,
    required bool completed,
  }) async {
    if (_saving) return;
    _saving = true;
    _lastSaved = DateTime.now();
    try {
      final next = await _repository.saveLessonProgress(
        uid: widget.profile.uid,
        course: widget.course,
        enrollment: _enrollment,
        lesson: _lesson,
        positionSeconds: positionSeconds,
        completed: completed,
      );
      if (!mounted) {
        _enrollment = next;
        return;
      }
      setState(() => _enrollment = next);
    } catch (_) {
      // Offline or rules: keep playing, retry on the next tick.
    } finally {
      _saving = false;
    }
  }

  /// Records the resume point for lessons that have no playback position.
  void _markVisited(Lesson lesson) {
    _persist(
      positionSeconds: 0,
      completed: _enrollment.hasCompleted(lesson.id),
    );
  }

  /// The callable already wrote the attempt; mirror it so the UI keeps up.
  void _onQuizGraded(QuizAttemptResult result) {
    final lessonId = _lesson.id;
    unawaited(
      trackQuizSubmit(
        courseId: widget.course.id,
        lessonId: lessonId,
        passed: result.passed,
        score: result.score,
      ),
    );
    if (result.passed) {
      _completedTracked.add(lessonId);
    }
    final completedIds = [..._enrollment.completedLessonIds];
    if (result.passed && !completedIds.contains(lessonId)) {
      completedIds.add(lessonId);
    }
    final allDone = widget.course.lessonCount > 0 &&
        completedIds.length >= widget.course.lessonCount;
    setState(() {
      _enrollment = _enrollment.copyWith(
        completedLessonIds: completedIds,
        lastLessonId: lessonId,
        quizAttempts: {
          ..._enrollment.quizAttempts,
          lessonId: QuizAttempt(
            score: result.score,
            passed: result.passed,
            at: DateTime.now().toUtc(),
          ),
        },
        updatedAt: DateTime.now().toUtc(),
        completedAt: allDone
            ? (_enrollment.completedAt ?? DateTime.now().toUtc())
            : null,
        clearCompletedAt: !allDone,
      );
    });
  }

  Future<void> _goNext() async {
    final next = widget.content.lessonAfterAccessible(_lesson.id, _enrollment);
    if (next == null) {
      if (!mounted) return;
      _advancing = false;
      final blocked = widget.content.lessonAfter(_lesson.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            blocked != null &&
                    !widget.content.isLessonUnlocked(blocked, _enrollment)
                ? context.l10n.moduleLocked
                : context.l10n.playerCourseCompleted,
          ),
        ),
      );
      return;
    }
    await _open(next);
    _advancing = false;
  }

  void _togglePlay() {
    final controller = _controller;
    if (controller == null) return;
    PulseHaptics.light();
    if (controller.value.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
    setState(() => _controlsVisible = true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final lessons = widget.content.lessons;
    final index = lessons.indexWhere((lesson) => lesson.id == _lesson.id);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          widget.course.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          switch (_lesson.type) {
            LessonType.reading => ReadingStage(
                key: ValueKey('reading-${_lesson.id}'),
                lesson: _lesson,
                completed: _enrollment.hasCompleted(_lesson.id),
                onComplete: () {
                  _persist(positionSeconds: 0, completed: true);
                  if (_completedTracked.add(_lesson.id)) {
                    unawaited(
                      trackLessonComplete(
                        courseId: widget.course.id,
                        lessonId: _lesson.id,
                        durationSeconds: _lesson.durationSeconds,
                      ),
                    );
                  }
                },
              ),
            LessonType.quiz => QuizStage(
                key: ValueKey('quiz-${_lesson.id}'),
                course: widget.course,
                lesson: _lesson,
                repository: _repository,
                onGraded: _onQuizGraded,
              ),
            LessonType.video => _Stage(
                controller: _controller,
                initializing: _initializing,
                error: _error,
                controlsVisible: _controlsVisible,
                onToggleControls: () =>
                    setState(() => _controlsVisible = !_controlsVisible),
                onTogglePlay: _togglePlay,
              ),
          },
          const SizedBox(height: AppSpacing.md),
          Text(
            _lesson.title,
            style: theme.textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            index >= 0
                ? l10n.playerLessonOf(index + 1, lessons.length)
                : widget.course.title,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          if (widget.content.lessonAfterAccessible(_lesson.id, _enrollment) !=
              null)
            OutlinedButton.icon(
              onPressed: () => _open(
                widget.content.lessonAfterAccessible(_lesson.id, _enrollment)!,
              ),
              icon: const Icon(Icons.skip_next_rounded, size: 18),
              label: Text(l10n.playerNextLesson),
            )
          else if (widget.content.lessonAfter(_lesson.id) != null &&
              !widget.content.isLessonUnlocked(
                widget.content.lessonAfter(_lesson.id)!,
                _enrollment,
              ))
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Text(
                l10n.moduleLocked,
                style: theme.textTheme.bodySmall?.copyWith(color: colors.muted),
              ),
            ),
          const SizedBox(height: AppSpacing.lg),
          Text(l10n.playerClasses, style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.xs),
          for (final lesson in lessons)
            _PlaylistTile(
              lesson: lesson,
              current: lesson.id == _lesson.id,
              completed: _enrollment.hasCompleted(lesson.id),
              locked: !widget.content.isLessonUnlocked(lesson, _enrollment),
              onTap: lesson.id == _lesson.id
                  ? null
                  : () => _open(lesson),
            ),
        ],
      ),
    );
  }
}

class _Stage extends StatelessWidget {
  const _Stage({
    required this.controller,
    required this.initializing,
    required this.error,
    required this.controlsVisible,
    required this.onToggleControls,
    required this.onTogglePlay,
  });

  final VideoPlayerController? controller;
  final bool initializing;
  final Object? error;
  final bool controlsVisible;
  final VoidCallback onToggleControls;
  final VoidCallback onTogglePlay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final value = controller?.value;

    Widget content;
    if (initializing) {
      content = _Placeholder(
        icon: Icons.hourglass_top_rounded,
        message: l10n.playerLoading,
        spinner: true,
      );
    } else if (error != null || controller == null || value == null) {
      final isMissingVideo = '$error'.contains('no-video');
      content = _Placeholder(
        icon: isMissingVideo
            ? Icons.videocam_off_outlined
            : Icons.error_outline_rounded,
        message: isMissingVideo ? l10n.playerNoVideo : l10n.playerError,
      );
    } else {
      content = GestureDetector(
        onTap: onToggleControls,
        child: Stack(
          fit: StackFit.expand,
          children: [
            FittedBox(
              fit: BoxFit.contain,
              child: SizedBox(
                width: value.size.width == 0 ? 16 : value.size.width,
                height: value.size.height == 0 ? 9 : value.size.height,
                child: VideoPlayer(controller!),
              ),
            ),
            if (value.isBuffering)
              const Center(
                child: SizedBox(
                  height: 28,
                  width: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                ),
              ),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: controlsVisible ? 1 : 0,
              child: IgnorePointer(
                ignoring: !controlsVisible,
                child: ValueListenableBuilder<VideoPlayerValue>(
                  valueListenable: controller!,
                  builder: (context, _, child) => _Controls(
                    controller: controller!,
                    onTogglePlay: onTogglePlay,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: ColoredBox(
          color: Colors.black,
          child: DefaultTextStyle(
            style: theme.textTheme.bodyMedium!.copyWith(color: Colors.white),
            child: content,
          ),
        ),
      ),
    );
  }
}

class _Controls extends StatelessWidget {
  const _Controls({required this.controller, required this.onTogglePlay});

  final VideoPlayerController controller;
  final VoidCallback onTogglePlay;

  String _clock(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString();
    final seconds =
        duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    final hours = duration.inHours;
    return hours > 0 ? '$hours:${minutes.padLeft(2, '0')}:$seconds'
        : '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final value = controller.value;
    final brand = AppColors.brandOf(context);
    final total = value.duration.inMilliseconds;
    final position = value.position.inMilliseconds.clamp(0, total <= 0 ? 1 : total);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.35),
            Colors.transparent,
            Colors.black.withValues(alpha: 0.65),
          ],
          stops: const [0, 0.45, 1],
        ),
      ),
      child: Column(
        children: [
          const Spacer(),
          IconButton.filled(
            onPressed: onTogglePlay,
            iconSize: 34,
            style: IconButton.styleFrom(
              backgroundColor: Colors.white.withValues(alpha: 0.16),
              foregroundColor: Colors.white,
            ),
            icon: Icon(
              value.isPlaying
                  ? Icons.pause_rounded
                  : Icons.play_arrow_rounded,
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                Text(_clock(value.position)),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 3,
                      activeTrackColor: brand,
                      inactiveTrackColor: Colors.white24,
                      thumbColor: Colors.white,
                      overlayShape: SliderComponentShape.noOverlay,
                      thumbShape:
                          const RoundSliderThumbShape(enabledThumbRadius: 6),
                    ),
                    child: Slider(
                      value: position.toDouble(),
                      max: total <= 0 ? 1 : total.toDouble(),
                      onChanged: (next) => controller.seekTo(
                        Duration(milliseconds: next.round()),
                      ),
                    ),
                  ),
                ),
                Text(_clock(value.duration)),
              ],
            ),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({
    required this.icon,
    required this.message,
    this.spinner = false,
  });

  final IconData icon;
  final String message;
  final bool spinner;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (spinner)
            const SizedBox(
              height: 26,
              width: 26,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: Colors.white,
              ),
            )
          else
            Icon(icon, size: 40, color: Colors.white70),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(message, textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }
}

class _PlaylistTile extends StatelessWidget {
  const _PlaylistTile({
    required this.lesson,
    required this.current,
    required this.completed,
    required this.locked,
    required this.onTap,
  });

  final Lesson lesson;
  final bool current;
  final bool completed;
  final bool locked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final minutes = (lesson.durationSeconds / 60).ceil();
    final l10n = context.l10n;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      onTap: onTap,
      leading: Icon(
        completed
            ? Icons.check_circle_rounded
            : locked
                ? Icons.lock_outline_rounded
                : lessonTypeIcon(lesson.type),
        color: completed || (current && !locked) ? brand : colors.muted,
      ),
      title: Text(
        lesson.title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodyLarge?.copyWith(
          fontWeight: current && !locked ? FontWeight.w800 : FontWeight.w500,
          color: locked ? colors.muted : null,
        ),
      ),
      trailing: locked
          ? Text(
              l10n.moduleLockedShort,
              style: theme.textTheme.labelSmall?.copyWith(color: colors.muted),
            )
          : minutes > 0
              ? Text(
                  l10n.courseDurationMinutes(minutes),
                  style:
                      theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
                )
              : null,
    );
  }
}
