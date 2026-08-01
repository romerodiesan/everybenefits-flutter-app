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
    required this.courseRepository,
  });

  final UserProfile profile;
  final CourseRepository courseRepository;

  @override
  State<MyLearningScreen> createState() => _MyLearningScreenState();
}

class _MyLearningScreenState extends State<MyLearningScreen> {
  late final CourseRepository _repository =
      widget.courseRepository;

  final _subscriptions = <StreamSubscription<void>>[];

  List<Course> _courses = const [];
  Map<String, Enrollment> _enrollments = const {};
  bool _loading = true;
  Object? _error;
  static const _enrollmentPageSize = 50;
  int _enrollmentLimit = _enrollmentPageSize;
  bool _hasMoreEnrollments = false;
  bool _loadingMore = false;

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
    _listenEnrollments();
  }

  void _listenEnrollments() {
    final sub = _repository
        .watchEnrollments(widget.profile.uid, limit: _enrollmentLimit)
        .listen(
      (list) {
        if (!mounted) return;
        setState(() {
          _enrollments = {for (final e in list) e.courseId: e};
          _hasMoreEnrollments = list.length >= _enrollmentLimit;
          _loading = false;
          _loadingMore = false;
        });
      },
      onError: (Object error) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _loadingMore = false;
          _error = error;
        });
      },
    );
    _subscriptions.add(sub);
  }

  void _loadMoreEnrollments() {
    if (_loadingMore || !_hasMoreEnrollments) return;
    setState(() {
      _loadingMore = true;
      _enrollmentLimit += _enrollmentPageSize;
    });
    // Cancel prior enrollment listener (last subscription).
    if (_subscriptions.length > 1) {
      unawaited(_subscriptions.removeLast().cancel());
    }
    _listenEnrollments();
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
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      itemCount: _myLearningItemCount(
                        inProgress: inProgress,
                        completed: completed,
                      ),
                      itemBuilder: (context, index) {
                        return _myLearningItemAt(
                          index: index,
                          inProgress: inProgress,
                          completed: completed,
                          theme: theme,
                          l10n: l10n,
                        );
                      },
                    ),
    );
  }

  int _myLearningItemCount({
    required List<EnrolledCourse> inProgress,
    required List<EnrolledCourse> completed,
  }) {
    var count = 0;
    if (inProgress.isNotEmpty) {
      count += 1 + inProgress.length; // header + cards
    }
    if (completed.isNotEmpty) {
      count += 1 + completed.length;
    }
    if (_hasMoreEnrollments) count += 1;
    return count;
  }

  Widget _myLearningItemAt({
    required int index,
    required List<EnrolledCourse> inProgress,
    required List<EnrolledCourse> completed,
    required ThemeData theme,
    required AppLocalizations l10n,
  }) {
    var cursor = index;
    if (inProgress.isNotEmpty) {
      if (cursor == 0) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: Text(
            l10n.myLearningInProgress,
            style: theme.textTheme.titleLarge,
          ),
        );
      }
      cursor -= 1;
      if (cursor < inProgress.length) {
        return Padding(
          key: ValueKey('ip-${inProgress[cursor].course.id}'),
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: _card(inProgress[cursor]),
        );
      }
      cursor -= inProgress.length;
    }
    if (completed.isNotEmpty) {
      if (cursor == 0) {
        return Padding(
          padding: EdgeInsets.only(
            top: inProgress.isNotEmpty ? AppSpacing.md : 0,
            bottom: AppSpacing.md,
          ),
          child: Text(
            l10n.myLearningCompleted,
            style: theme.textTheme.titleLarge,
          ),
        );
      }
      cursor -= 1;
      if (cursor < completed.length) {
        return Padding(
          key: ValueKey('done-${completed[cursor].course.id}'),
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: _card(completed[cursor]),
        );
      }
      cursor -= completed.length;
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Center(
        child: _loadingMore
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : TextButton(
                onPressed: _loadMoreEnrollments,
                child: Text(l10n.forumsLoadMore),
              ),
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
