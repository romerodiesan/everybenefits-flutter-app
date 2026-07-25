import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import 'course_detail_screen.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'university_screen.dart';
import 'widgets/course_card.dart';

/// The learner's enrolled courses, split into in-progress and completed.
class MyLearningScreen extends StatefulWidget {
  const MyLearningScreen({
    super.key,
    required this.profile,
    this.courseRepository,
  });

  final UserProfile profile;
  final CourseRepository? courseRepository;

  @override
  State<MyLearningScreen> createState() => _MyLearningScreenState();
}

class _MyLearningScreenState extends State<MyLearningScreen> {
  late final CourseRepository _repository =
      widget.courseRepository ?? CourseRepository();

  final _subscriptions = <StreamSubscription<void>>[];

  List<Course> _courses = const [];
  Map<String, Enrollment> _enrollments = const {};
  bool _loading = true;
  Object? _error;

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
      _repository.watchEnrollments(widget.profile.uid).listen(
        (list) {
          if (!mounted) return;
          setState(() {
            _enrollments = {for (final e in list) e.courseId: e};
            _loading = false;
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
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }

  List<EnrolledCourse> get _enrolled {
    final byId = {for (final course in _courses) course.id: course};
    final out = <EnrolledCourse>[];
    for (final enrollment in _enrollments.values) {
      final course = byId[enrollment.courseId];
      if (course == null) continue;
      out.add(EnrolledCourse(course: course, enrollment: enrollment));
    }
    out.sort(
      (a, b) => b.enrollment.updatedAt.compareTo(a.enrollment.updatedAt),
    );
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final enrolled = _enrolled;
    final inProgress = enrolled.where((e) => e.progress < 1).toList();
    final completed = enrolled.where((e) => e.progress >= 1).toList();

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.academyMyLearning)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AcademyMessage(
                  icon: Icons.cloud_off_rounded,
                  message: friendlyCourseError(_error!, l10n),
                )
              : enrolled.isEmpty
                  ? AcademyMessage(
                      icon: Icons.school_outlined,
                      message: l10n.myLearningEmpty,
                    )
                  : ListView(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      children: [
                        if (inProgress.isNotEmpty) ...[
                          Text(
                            l10n.myLearningInProgress,
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          for (final entry in inProgress) ...[
                            _card(entry),
                            const SizedBox(height: AppSpacing.sm),
                          ],
                        ],
                        if (completed.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            l10n.myLearningCompleted,
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          for (final entry in completed) ...[
                            _card(entry),
                            const SizedBox(height: AppSpacing.sm),
                          ],
                        ],
                      ],
                    ),
    );
  }

  Widget _card(EnrolledCourse entry) {
    return CourseCard(
      course: entry.course,
      repository: _repository,
      progress: entry.progress,
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CourseDetailScreen(
              courseId: entry.course.id,
              initialCourse: entry.course,
              profile: widget.profile,
              courseRepository: _repository,
            ),
          ),
        );
      },
    );
  }
}
