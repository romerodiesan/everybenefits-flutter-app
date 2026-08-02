import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'path_detail_screen.dart';
import 'university_screen.dart';
import 'widgets/course_card.dart';

/// Curated learning paths with the learner's aggregate progress.
class LearningPathScreen extends StatefulWidget {
  const LearningPathScreen({
    super.key,
    required this.profile,
    this.courseRepository,
  });

  final UserProfile profile;
  final CourseRepository? courseRepository;

  @override
  State<LearningPathScreen> createState() => _LearningPathScreenState();
}

class _LearningPathScreenState extends State<LearningPathScreen> {
  late final CourseRepository _repository =
      widget.courseRepository ?? CourseRepository();

  final _subscriptions = <StreamSubscription<void>>[];

  List<LearningPath> _paths = const [];
  List<Course> _courses = const [];
  Map<String, Enrollment> _enrollments = const {};
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _subscriptions.add(
      _repository.watchPaths().listen(
        (paths) {
          if (!mounted) return;
          setState(() {
            _paths = paths;
            _loading = false;
            _error = null;
          });
        },
        onError: (Object error) {
          if (!mounted) return;
          setState(() {
            _loading = false;
            _error = error;
          });
        },
      ),
    );
    _subscriptions.add(
      _repository.watchPublishedCourses().listen(
        (courses) {
          if (!mounted) return;
          setState(() => _courses = courses);
        },
        onError: (Object _) {},
      ),
    );
    _subscriptions.add(
      _repository.watchEnrollments(widget.profile.uid).listen(
        (list) {
          if (!mounted) return;
          setState(() {
            _enrollments = {for (final e in list) e.courseId: e};
          });
        },
        onError: (Object _) {},
      ),
    );
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }

  /// Aggregate progress = completed lessons / lessons across the path courses.
  double _progressOf(LearningPath path) {
    final byId = {for (final course in _courses) course.id: course};
    var total = 0;
    var done = 0;
    for (final id in path.courseIds) {
      final course = byId[id];
      if (course == null) continue;
      total += course.lessonCount;
      done += _enrollments[id]?.completedLessonIds.length ?? 0;
    }
    if (total == 0) return 0;
    return (done / total).clamp(0.0, 1.0);
  }

  int _minutesOf(LearningPath path) {
    final byId = {for (final course in _courses) course.id: course};
    var minutes = 0;
    for (final id in path.courseIds) {
      minutes += byId[id]?.durationMinutes ?? 0;
    }
    return minutes;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.academyPaths)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AcademyMessage(
                  icon: Icons.cloud_off_rounded,
                  message: friendlyCourseError(_error!, l10n),
                )
              : _paths.isEmpty
                  ? AcademyMessage(
                      icon: Icons.route_outlined,
                      message: l10n.pathsEmpty,
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      itemCount: _paths.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final path = _paths[index];
                        final hours = (_minutesOf(path) / 60).round();
                        return PulseSheet(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => PathDetailScreen(
                                  path: path,
                                  profile: widget.profile,
                                  courseRepository: _repository,
                                ),
                              ),
                            );
                          },
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      path.title,
                                      style: theme.textTheme.titleMedium
                                          ?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  AcademyChip(path.level.label(l10n)),
                                ],
                              ),
                              if (path.description.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  path.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodyMedium
                                      ?.copyWith(color: colors.muted),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Text(
                                l10n.pathMetaCoursesHours(
                                  path.courseIds.length,
                                  hours,
                                ),
                                style: theme.textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 12),
                              AcademyProgressBar(value: _progressOf(path)),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}
