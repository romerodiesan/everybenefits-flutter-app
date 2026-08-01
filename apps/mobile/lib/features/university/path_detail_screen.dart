import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import 'course_detail_screen.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'university_screen.dart';
import 'widgets/course_card.dart';

/// A learning path with its ordered courses and the learner's progress.
class PathDetailScreen extends StatefulWidget {
  const PathDetailScreen({
    super.key,
    required this.path,
    required this.profile,
    required this.courseRepository,
  });

  final LearningPath path;
  final UserProfile profile;
  final CourseRepository courseRepository;

  @override
  State<PathDetailScreen> createState() => _PathDetailScreenState();
}

class _PathDetailScreenState extends State<PathDetailScreen> {
  late final CourseRepository _repository =
      widget.courseRepository;

  final _subscriptions = <StreamSubscription<void>>[];

  List<Course> _courses = const [];
  Map<String, Enrollment> _enrollments = const {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _subscriptions.add(
      _repository.watchPublishedCourses().listen(
        (courses) {
          if (!mounted) return;
          setState(() {
            _courses = courses;
            _loading = false;
          });
        },
        onError: (Object _) {
          if (!mounted) return;
          setState(() => _loading = false);
        },
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

  /// Path order comes from `courseIds`; unknown ids are skipped.
  List<Course> get _ordered {
    final byId = {for (final course in _courses) course.id: course};
    return [
      for (final id in widget.path.courseIds)
        if (byId[id] != null) byId[id]!,
    ];
  }

  double get _progress {
    var total = 0;
    var done = 0;
    for (final course in _ordered) {
      total += course.lessonCount;
      done += _enrollments[course.id]?.completedLessonIds.length ?? 0;
    }
    if (total == 0) return 0;
    return (done / total).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final path = widget.path;
    final courses = _ordered;
    final minutes = courses.fold<int>(0, (a, c) => a + c.durationMinutes);

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.pathDetailTitle)),
      body: _loading
          ? const PulseCatalogSkeleton(showProgress: true)
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Text(path.title, style: theme.textTheme.headlineMedium),
                if (path.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    path.description,
                    style: theme.textTheme.bodyLarge
                        ?.copyWith(color: colors.muted),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    AcademyChip(path.level.label(l10n)),
                    AcademyChip(
                      l10n.pathMetaCoursesHours(
                        courses.length,
                        (minutes / 60).round(),
                      ),
                      icon: Icons.schedule_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                AcademyProgressBar(value: _progress),
                const SizedBox(height: 6),
                Text(
                  l10n.courseProgressPercent((_progress * 100).round()),
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: colors.muted),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  l10n.pathIncludedCourses,
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: AppSpacing.md),
                if (courses.isEmpty)
                  AcademyMessage(
                    icon: Icons.school_outlined,
                    message: l10n.academyCatalogEmpty,
                  )
                else
                  for (var i = 0; i < courses.length; i++) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 20, right: 10),
                          child: CircleAvatar(
                            radius: 14,
                            backgroundColor: colors.sheet,
                            child: Text(
                              '${i + 1}',
                              style: theme.textTheme.labelMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: CourseCard(
                            course: courses[i],
                            repository: _repository,
                            progress: _enrollments[courses[i].id]
                                ?.progressFor(courses[i].lessonCount),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => CourseDetailScreen(
                                    courseId: courses[i].id,
                                    initialCourse: courses[i],
                                    profile: widget.profile,
                                    courseRepository: _repository,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                  ],
              ],
            ),
    );
  }
}
