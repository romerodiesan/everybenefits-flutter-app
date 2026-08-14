import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_breakpoints.dart';
import '../../app/layout/pulse_constrained.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'course_detail_screen.dart';
import 'course_models.dart';
import 'course_repository.dart';
import 'course_search_screen.dart';
import 'learning_path_screen.dart';
import 'my_learning_screen.dart';
import 'path_detail_screen.dart';
import '../notifications/notification_bell_button.dart';
import '../promo/promo_banner_models.dart';
import '../promo/promo_banner_repository.dart';
import '../promo/widgets/promo_banner_slot.dart';
import 'widgets/course_card.dart';
import 'widgets/course_cover.dart';
import 'widgets/course_manage_menu.dart';

/// Academy home: published catalog, progress and authoring shortcuts.
class UniversityScreen extends StatefulWidget {
  const UniversityScreen({
    super.key,
    required this.profile,
    this.courseRepository,
    this.promoBannerRepository,
    this.notificationUnread = 0,
    this.onOpenNotifications,
  });

  final UserProfile profile;
  final CourseRepository? courseRepository;
  final PromoBannerRepository? promoBannerRepository;
  final int notificationUnread;
  final VoidCallback? onOpenNotifications;

  @override
  State<UniversityScreen> createState() => _UniversityScreenState();
}

class _UniversityScreenState extends State<UniversityScreen> {
  late final CourseRepository _repository =
      widget.courseRepository ?? CourseRepository();

  final _subscriptions = <StreamSubscription<void>>[];
  bool _active = false;

  List<Course> _published = const [];
  List<Course> _authored = const [];
  List<Course> _pending = const [];
  List<LearningPath> _paths = const [];
  Map<String, Enrollment> _enrollments = const {};

  bool _loading = true;
  Object? _error;
  CourseLevel? _levelFilter;

  Object get _access => AccessScope.accessOf(
        context,
        fallbackRoleId: widget.profile.roleId,
      );
  bool get _canAuthor => canAuthorCourses(_access);
  bool get _isAdmin => canManageCourses(_access);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final active = TickerMode.valuesOf(context).enabled;
    if (active == _active) return;
    _active = active;
    if (active) {
      _listen();
    } else {
      _cancelListeners();
    }
  }

  void _listen() {
    if (_subscriptions.isNotEmpty) return;
    _subscriptions.add(
      _repository.watchPublishedCourses().listen(
        (courses) {
          if (!mounted) return;
          setState(() {
            _published = courses;
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
      _repository.watchEnrollments(widget.profile.uid).listen(
        (list) {
          if (!mounted) return;
          setState(() {
            _enrollments = {for (final e in list) e.courseId: e};
          });
        },
        // Guests may not read enrollments; the catalog still works.
        onError: (Object _) {},
      ),
    );

    _subscriptions.add(
      _repository.watchPaths().listen(
        (paths) {
          if (!mounted) return;
          setState(() => _paths = paths);
        },
        onError: (Object _) {},
      ),
    );

    if (_canAuthor) {
      _subscriptions.add(
        _repository.watchAuthoredCourses(widget.profile.uid).listen(
          (courses) {
            if (!mounted) return;
            setState(() => _authored = courses);
          },
          onError: (Object _) {},
        ),
      );
    }

    if (_isAdmin) {
      _subscriptions.add(
        _repository.watchPendingCourses().listen(
          (courses) {
            if (!mounted) return;
            setState(() => _pending = courses);
          },
          onError: (Object _) {},
        ),
      );
    }
  }

  void _cancelListeners() {
    for (final sub in _subscriptions) {
      unawaited(sub.cancel());
    }
    _subscriptions.clear();
  }

  @override
  void dispose() {
    _cancelListeners();
    super.dispose();
  }

  List<Course> get _filtered {
    final level = _levelFilter;
    if (level == null) return _published;
    return _published.where((course) => course.level == level).toList();
  }

  /// Courses started but not finished, most recent first.
  List<EnrolledCourse> get _continueLearning {
    final byId = {for (final course in _published) course.id: course};
    final out = <EnrolledCourse>[];
    for (final enrollment in _enrollments.values) {
      final course = byId[enrollment.courseId];
      if (course == null) continue;
      final enrolled = EnrolledCourse(course: course, enrollment: enrollment);
      if (enrolled.progress >= 1) continue;
      out.add(enrolled);
    }
    out.sort(
      (a, b) => b.enrollment.updatedAt.compareTo(a.enrollment.updatedAt),
    );
    return out;
  }

  /// Author drafts and reviews that are not in the public catalog yet.
  List<Course> get _myUnpublished =>
      _authored.where((course) => !course.isPublished).toList();

  void _openCourse(Course course) {
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
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CourseSearchScreen(
          profile: widget.profile,
          courseRepository: _repository,
        ),
      ),
    );
  }

  void _openPath(LearningPath path) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PathDetailScreen(
          path: path,
          profile: widget.profile,
          courseRepository: _repository,
        ),
      ),
    );
  }

  int _pathMinutes(LearningPath path) {
    final byId = {for (final course in _published) course.id: course};
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
    final filtered = _filtered;
    final continueLearning = _continueLearning;
    final myUnpublished = _myUnpublished;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.academyTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
          if (_canAuthor)
            IconButton(
              tooltip: l10n.academyStudio,
              onPressed: () => openPulseStudio(),
              icon: const Icon(Icons.auto_awesome_motion_outlined),
            ),
          IconButton(
            tooltip: l10n.actionSearch,
            onPressed: _openSearch,
            icon: const Icon(Icons.search),
          ),
          if (widget.onOpenNotifications != null)
            NotificationBellButton(
              unreadCount: widget.notificationUnread,
              onPressed: widget.onOpenNotifications!,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Streams are live; the pull gesture is a reassurance affordance.
          await Future<void>.delayed(const Duration(milliseconds: 350));
        },
        child: PulseConstrained(
          maxWidth: PulseContentWidth.shell,
          padding: EdgeInsets.zero,
          child: ListView(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            pulseShellListBottomPad(context, hasFab: true),
          ),
          children: [
            PromoBannerSlot(
              surface: PromoBannerSurface.academy,
              profile: widget.profile,
              repository: widget.promoBannerRepository,
              courseRepository: _repository,
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _NavTile(
                    icon: Icons.school_outlined,
                    label: l10n.academyMyLearning,
                    tint: AppColors.brandOf(context),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => MyLearningScreen(
                            profile: widget.profile,
                            courseRepository: _repository,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _NavTile(
                    icon: Icons.route_outlined,
                    label: l10n.academyPaths,
                    tint: colors.ink,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => LearningPathScreen(
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
            if (continueLearning.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xl),
              _SectionTitle(l10n.academyContinueLearning),
              const SizedBox(height: AppSpacing.sm),
              for (final entry in continueLearning.take(3)) ...[
                _ContinueRow(
                  entry: entry,
                  repository: _repository,
                  onTap: () => _openCourse(entry.course),
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
            ],
            if (_isAdmin && _pending.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xl),
              _SectionTitle(l10n.academyPendingReview),
              const SizedBox(height: AppSpacing.sm),
              _CourseGrid(
                courses: _pending,
                itemBuilder: (course) => CourseCard(
                  course: course,
                  repository: _repository,
                  showStatus: true,
                  onTap: () => _openCourse(course),
                  trailing: CourseManageMenu(
                    course: course,
                    profile: widget.profile,
                    repository: _repository,
                  ),
                ),
              ),
            ],
            if (myUnpublished.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xl),
              _SectionTitle(l10n.academyMyCourses),
              const SizedBox(height: AppSpacing.sm),
              _CourseGrid(
                courses: myUnpublished,
                itemBuilder: (course) => CourseCard(
                  course: course,
                  repository: _repository,
                  showStatus: true,
                  onTap: () => _openCourse(course),
                  trailing: CourseManageMenu(
                    course: course,
                    profile: widget.profile,
                    repository: _repository,
                  ),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                Expanded(child: _SectionTitle(l10n.academyPaths)),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => LearningPathScreen(
                          profile: widget.profile,
                          courseRepository: _repository,
                        ),
                      ),
                    );
                  },
                  child: Text(l10n.academySeeAll),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            if (_paths.isEmpty)
              _AcademyMessage(
                icon: Icons.route_outlined,
                message: l10n.pathsEmpty,
              )
            else
              for (final path in _paths.take(4)) ...[
                PulseSheet(
                  onTap: () => _openPath(path),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              path.title,
                              style: theme.textTheme.titleMedium?.copyWith(
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
                          (_pathMinutes(path) / 60).round(),
                        ),
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                Expanded(child: _SectionTitle(l10n.academyCourses)),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            _LevelFilters(
              selected: _levelFilter,
              onSelect: (level) => setState(() => _levelFilter = level),
            ),
            const SizedBox(height: AppSpacing.md),
            if (_loading)
              const PulseCatalogSkeleton()
            else if (_error != null)
              _AcademyMessage(
                icon: Icons.cloud_off_rounded,
                message: friendlyCourseError(_error!, l10n),
              )
            else if (filtered.isEmpty)
              _AcademyMessage(
                icon: Icons.school_outlined,
                message: l10n.academyCatalogEmpty,
              )
            else
              _CourseGrid(
                courses: filtered,
                itemBuilder: (course) => CourseCard(
                  course: course,
                  repository: _repository,
                  progress: _enrollments[course.id]
                      ?.progressFor(course.lessonCount),
                  onTap: () => _openCourse(course),
                  trailing: canEditCourse(
                    course: course,
                    uid: widget.profile.uid,
                    roleOrPermissions: _access,
                  )
                      ? CourseManageMenu(
                          course: course,
                          profile: widget.profile,
                          repository: _repository,
                        )
                      : null,
                ),
              ),
          ],
        ),
        ),
      ),
    );
  }
}

class _CourseGrid extends StatelessWidget {
  const _CourseGrid({
    required this.courses,
    required this.itemBuilder,
  });

  final List<Course> courses;
  final Widget Function(Course course) itemBuilder;

  @override
  Widget build(BuildContext context) {
    final cols = PulseWindowClass.of(context).catalogColumns;
    if (cols <= 1) {
      return Column(
        children: [
          for (final course in courses) ...[
            itemBuilder(course),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: courses.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: cols,
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
        childAspectRatio: 0.78,
      ),
      itemBuilder: (context, index) => itemBuilder(courses[index]),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(label, style: Theme.of(context).textTheme.titleLarge);
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.tint,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PulseSheet(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: tint),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LevelFilters extends StatelessWidget {
  const _LevelFilters({required this.selected, required this.onSelect});

  final CourseLevel? selected;
  final ValueChanged<CourseLevel?> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(
            label: l10n.academyFilterAll,
            selected: selected == null,
            onTap: () => onSelect(null),
          ),
          for (final level in CourseLevel.values) ...[
            const SizedBox(width: 8),
            _FilterChip(
              label: level.label(l10n),
              selected: selected == level,
              onTap: () => onSelect(level),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Material(
      color: selected ? brand.withValues(alpha: 0.16) : colors.sheet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: selected ? brand : colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: selected ? brand : colors.ink,
            ),
          ),
        ),
      ),
    );
  }
}

class _ContinueRow extends StatelessWidget {
  const _ContinueRow({
    required this.entry,
    required this.repository,
    required this.onTap,
  });

  final EnrolledCourse entry;
  final CourseRepository repository;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseSheet(
      onTap: onTap,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          SizedBox(
            width: 76,
            child: CourseCover(
              course: entry.course,
              repository: repository,
              height: 54,
              borderRadius: 10,
              showLevel: false,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.course.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                AcademyProgressBar(value: entry.progress),
                const SizedBox(height: 4),
                Text(
                  l10n.courseProgressPercent((entry.progress * 100).round()),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.play_circle_fill_rounded,
              color: AppColors.brandOf(context)),
        ],
      ),
    );
  }
}

class _AcademyMessage extends StatelessWidget {
  const _AcademyMessage({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Column(
        children: [
          Icon(icon, size: 40, color: colors.muted),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
        ],
      ),
    );
  }
}

/// Shared empty / error block for the academy screens.
class AcademyMessage extends StatelessWidget {
  const AcademyMessage({
    super.key,
    required this.icon,
    required this.message,
  });

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) =>
      _AcademyMessage(icon: icon, message: message);
}
