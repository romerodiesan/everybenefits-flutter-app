import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_breakpoints.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import 'course_models.dart';
import 'course_player_screen.dart';
import 'course_repository.dart';
import 'university_screen.dart';
import 'widgets/course_card.dart';
import 'widgets/course_cover.dart';
import 'widgets/course_manage_menu.dart';
import 'widgets/lesson_stages.dart';

/// Course landing page: syllabus, enrollment CTA and progress.
class CourseDetailScreen extends StatefulWidget {
  const CourseDetailScreen({
    super.key,
    required this.courseId,
    required this.profile,
    this.initialCourse,
    this.courseRepository,
  });

  final String courseId;
  final UserProfile profile;

  /// Renders immediately while the live document loads.
  final Course? initialCourse;
  final CourseRepository? courseRepository;

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  late final CourseRepository _repository =
      widget.courseRepository ?? CourseRepository();

  final _subscriptions = <StreamSubscription<void>>[];

  Course? _course;
  CourseContent _content = CourseContent.empty;
  Enrollment? _enrollment;
  bool _loadingContent = true;
  bool _enrolling = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _course = widget.initialCourse;
    _subscriptions.add(
      _repository.watchCourse(widget.courseId).listen(
        (course) {
          if (!mounted || course == null) return;
          setState(() => _course = course);
        },
        onError: (Object error) {
          if (!mounted) return;
          setState(() => _error = error);
        },
      ),
    );
    _subscriptions.add(
      _repository
          .watchEnrollment(uid: widget.profile.uid, courseId: widget.courseId)
          .listen(
        (enrollment) {
          if (!mounted) return;
          setState(() => _enrollment = enrollment);
        },
        onError: (Object _) {},
      ),
    );
    _loadContent();
  }

  Future<void> _loadContent() async {
    try {
      final content = await _repository.fetchCourseContent(widget.courseId);
      if (!mounted) return;
      setState(() {
        _content = content;
        _loadingContent = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingContent = false;
        _error = error;
      });
    }
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }

  /// Resume point: last unlocked lesson, else the first unfinished unlocked one.
  Lesson? _resumeLesson() {
    final enrollment = _enrollment;
    if (_content.lessons.isEmpty) return null;
    bool unlocked(Lesson lesson) =>
        _content.isLessonUnlocked(lesson, enrollment);
    if (enrollment != null) {
      final last = _content.lessonById(enrollment.lastLessonId);
      if (last != null && unlocked(last)) return last;
      for (final lesson in _content.lessons) {
        if (!enrollment.hasCompleted(lesson.id) && unlocked(lesson)) {
          return lesson;
        }
      }
    }
    for (final lesson in _content.lessons) {
      if (unlocked(lesson)) return lesson;
    }
    return _content.lessons.first;
  }

  Future<void> _startOrContinue({Lesson? lesson}) async {
    final course = _course;
    if (course == null) return;
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);

    if (lesson != null &&
        !_content.isLessonUnlocked(lesson, _enrollment)) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.moduleLocked)));
      return;
    }

    var enrollment = _enrollment;
    if (enrollment == null) {
      setState(() => _enrolling = true);
      try {
        enrollment = await _repository.enroll(
          profile: widget.profile,
          course: course,
        );
        if (!mounted) return;
        setState(() {
          _enrollment = enrollment;
          _enrolling = false;
        });
      } catch (error) {
        if (!mounted) return;
        setState(() => _enrolling = false);
        messenger.showSnackBar(
          SnackBar(content: Text(friendlyCourseError(error, l10n))),
        );
        return;
      }
    }

    final target = lesson ?? _resumeLesson();
    if (target == null) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.courseNoLessons)));
      return;
    }
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CoursePlayerScreen(
          course: course,
          content: _content,
          enrollment: enrollment!,
          initialLessonId: target.id,
          profile: widget.profile,
          courseRepository: _repository,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final course = _course;

    if (course == null) {
      return PulseScaffold(
        appBar: AppBar(title: Text(l10n.courseDetailTitle)),
        body: _error != null
            ? AcademyMessage(
                icon: Icons.cloud_off_rounded,
                message: friendlyCourseError(_error!, l10n),
              )
            : const PulseCatalogSkeleton(),
      );
    }

    final enrollment = _enrollment;
    final progress = enrollment?.progressFor(course.lessonCount);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(l10n.courseDetailTitle),
        actions: [
          CourseManageMenu(
            course: course,
            profile: widget.profile,
            repository: _repository,
            onChanged: _loadContent,
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final split = PulseWindowClass.of(context) == PulseWindowClass.expanded &&
              constraints.maxWidth >= 840;
          final hero = <Widget>[
          CourseCover(
            course: course,
            repository: _repository,
            height: 168,
            borderRadius: 18,
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(course.title, style: theme.textTheme.headlineMedium),
              ),
              if (!course.isPublished) CourseStatusChip(status: course.status),
            ],
          ),
          if (course.teacherName.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              l10n.courseByTeacher(course.teacherName),
              style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AcademyChip(course.level.label(l10n)),
              AcademyChip(l10n.courseLessonsPlural(course.lessonCount)),
              if (course.durationMinutes > 0)
                AcademyChip(
                  courseDurationLabel(l10n, course.durationMinutes),
                  icon: Icons.schedule_rounded,
                ),
              AcademyChip(
                l10n.courseStudentsPlural(course.studentCount),
                icon: Icons.people_outline_rounded,
              ),
            ],
          ),
          if (progress != null) ...[
            const SizedBox(height: AppSpacing.lg),
            AcademyProgressBar(value: progress),
            const SizedBox(height: 6),
            Text(
              progress >= 1
                  ? l10n.courseCompletedBadge
                  : l10n.courseProgressPercent((progress * 100).round()),
              style: theme.textTheme.labelMedium?.copyWith(
                color: progress >= 1
                    ? AppColors.brandOf(context)
                    : colors.muted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          SignalButton(
            label: enrollment == null ? l10n.courseStart : l10n.courseContinue,
            onPressed: _enrolling || _content.lessons.isEmpty
                ? null
                : () => _startOrContinue(),
          ),
          if (course.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xl),
            Text(l10n.courseAbout, style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              course.description,
              style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
            ),
          ],
          ];
          final syllabus = <Widget>[
          const SizedBox(height: AppSpacing.xl),
          Text(l10n.playerClasses, style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.sm),
          if (_loadingContent)
            const PulseCatalogSkeleton(itemCount: 3)
          else if (_content.lessons.isEmpty)
            AcademyMessage(
              icon: Icons.playlist_add_rounded,
              message: l10n.courseNoLessons,
            )
          else ...[
            for (var i = 0; i < _content.modules.length; i++)
              _ModuleBlock(
                index: i + 1,
                module: _content.modules[i],
                lessons: _content.lessonsOf(_content.modules[i].id),
                enrollment: enrollment,
                locked: !_content.isModuleUnlocked(
                  _content.modules[i].id,
                  enrollment,
                ),
                onLesson: (lesson) => _startOrContinue(lesson: lesson),
              ),
            if (_content.orphanLessons.isNotEmpty)
              for (final lesson in _content.orphanLessons)
                _LessonTile(
                  lesson: lesson,
                  completed: enrollment?.hasCompleted(lesson.id) ?? false,
                  locked: false,
                  onTap: () => _startOrContinue(lesson: lesson),
                ),
          ],
          ];
          if (!split) {
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [...hero, ...syllabus],
            );
          }
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 5,
                  child: ListView(children: hero),
                ),
                const SizedBox(width: AppSpacing.lg),
                Expanded(
                  flex: 4,
                  child: ListView(children: syllabus),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ModuleBlock extends StatefulWidget {
  const _ModuleBlock({
    required this.index,
    required this.module,
    required this.lessons,
    required this.enrollment,
    required this.locked,
    required this.onLesson,
  });

  final int index;
  final CourseModule module;
  final List<Lesson> lessons;
  final Enrollment? enrollment;
  final bool locked;
  final ValueChanged<Lesson> onLesson;

  @override
  State<_ModuleBlock> createState() => _ModuleBlockState();
}

class _ModuleBlockState extends State<_ModuleBlock> {
  late bool _expanded = widget.index == 1 && !widget.locked;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  AnimatedRotation(
                    turns: _expanded ? 0.25 : 0,
                    duration: const Duration(milliseconds: 160),
                    child: Icon(
                      Icons.chevron_right_rounded,
                      color: colors.muted,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.courseModule(widget.index),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: colors.muted,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.module.title,
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                  if (widget.locked)
                    Text(
                      l10n.moduleLockedShort,
                      style: theme.textTheme.labelSmall
                          ?.copyWith(color: colors.muted),
                    ),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            if (widget.locked)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 2),
                child: Text(
                  l10n.moduleLocked,
                  style:
                      theme.textTheme.bodySmall?.copyWith(color: colors.muted),
                ),
              ),
            for (final lesson in widget.lessons)
              _LessonTile(
                lesson: lesson,
                completed:
                    widget.enrollment?.hasCompleted(lesson.id) ?? false,
                locked: widget.locked,
                onTap: () => widget.onLesson(lesson),
              ),
          ],
        ],
      ),
    );
  }
}

class _LessonTile extends StatelessWidget {
  const _LessonTile({
    required this.lesson,
    required this.completed,
    required this.locked,
    required this.onTap,
  });

  final Lesson lesson;
  final bool completed;
  final bool locked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final durationLabel = lessonDurationLabel(
      context.l10n,
      lesson.durationSeconds,
    );

    return ListTile(
      contentPadding: EdgeInsets.zero,
      onTap: locked ? null : onTap,
      leading: Icon(
        completed
            ? Icons.check_circle_rounded
            : locked
                ? Icons.lock_outline_rounded
                : lesson.hasContent
                    ? lessonTypeIcon(lesson.type)
                    : Icons.lock_clock,
        color: completed ? brand : colors.muted,
      ),
      title: Text(
        lesson.title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodyLarge?.copyWith(
          color: locked ? colors.muted : null,
        ),
      ),
      trailing: durationLabel.isNotEmpty
          ? Text(
              durationLabel,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            )
          : null,
    );
  }
}
