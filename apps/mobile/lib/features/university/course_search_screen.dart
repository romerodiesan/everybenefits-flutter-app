import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import 'course_detail_screen.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'university_screen.dart';
import 'widgets/course_card.dart';

/// Text + level search over the published catalog.
class CourseSearchScreen extends StatefulWidget {
  const CourseSearchScreen({
    super.key,
    required this.profile,
    required this.courseRepository,
  });

  final UserProfile profile;
  final CourseRepository courseRepository;

  @override
  State<CourseSearchScreen> createState() => _CourseSearchScreenState();
}

class _CourseSearchScreenState extends State<CourseSearchScreen> {
  late final CourseRepository _repository =
      widget.courseRepository;
  final _controller = TextEditingController();

  StreamSubscription<List<Course>>? _subscription;
  List<Course> _courses = const [];
  bool _loading = true;
  Object? _error;
  String _query = '';
  CourseLevel? _level;

  @override
  void initState() {
    super.initState();
    _subscription = _repository.watchPublishedCourses().listen(
      (courses) {
        if (!mounted) return;
        setState(() {
          _courses = courses;
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
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _controller.dispose();
    super.dispose();
  }

  List<Course> get _results {
    final level = _level;
    return _courses
        .where((course) => course.matchesQuery(_query))
        .where((course) => level == null || course.level == level)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final results = _results;

    return PulseScaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onChanged: (value) => setState(() => _query = value),
          decoration: InputDecoration(
            hintText: l10n.searchCoursesHint,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            isDense: true,
            contentPadding: EdgeInsets.zero,
          ),
        ),
        actions: [
          if (_query.isNotEmpty)
            IconButton(
              tooltip: l10n.actionCancel,
              onPressed: () {
                _controller.clear();
                setState(() => _query = '');
              },
              icon: const Icon(Icons.close_rounded),
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xs,
              AppSpacing.lg,
              AppSpacing.sm,
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _LevelPill(
                    label: l10n.academyFilterAll,
                    selected: _level == null,
                    onTap: () => setState(() => _level = null),
                  ),
                  for (final level in CourseLevel.values) ...[
                    const SizedBox(width: 8),
                    _LevelPill(
                      label: level.label(l10n),
                      selected: _level == level,
                      onTap: () => setState(() => _level = level),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const PulseCatalogSkeleton(
                    padding: EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      0,
                      AppSpacing.lg,
                      AppSpacing.xl,
                    ),
                  )
                : _error != null
                    ? AcademyMessage(
                        icon: Icons.cloud_off_rounded,
                        message: friendlyCourseError(_error!, l10n),
                      )
                    : results.isEmpty
                        ? AcademyMessage(
                            icon: Icons.search_off_rounded,
                            message: _query.trim().isEmpty
                                ? l10n.academyCatalogEmpty
                                : l10n.searchNoResults(_query.trim()),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg,
                              0,
                              AppSpacing.lg,
                              AppSpacing.xl,
                            ),
                            itemCount: results.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: AppSpacing.sm),
                            itemBuilder: (context, index) {
                              final course = results[index];
                              return CourseCard(
                                course: course,
                                repository: _repository,
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => CourseDetailScreen(
                                        courseId: course.id,
                                        initialCourse: course,
                                        profile: widget.profile,
                                        courseRepository: _repository,
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

class _LevelPill extends StatelessWidget {
  const _LevelPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}
