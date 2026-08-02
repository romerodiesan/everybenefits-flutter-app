import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../course_models.dart';
import '../course_repository.dart';
import 'course_cover.dart';

/// Catalog card: cover, title, teacher, meta and optional progress.
class CourseCard extends StatelessWidget {
  const CourseCard({
    super.key,
    required this.course,
    required this.repository,
    required this.onTap,
    this.progress,
    this.showStatus = false,
    this.trailing,
  });

  final Course course;
  final CourseRepository repository;
  final VoidCallback onTap;

  /// Non-null renders the learner's progress bar.
  final double? progress;

  /// Draft / review badge, for authors and admins.
  final bool showStatus;

  /// Management menu slot.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final value = progress;

    return PulseSheet(
      onTap: onTap,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CourseCover(course: course, repository: repository),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _meta(l10n),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(color: colors.muted),
                    ),
                  ],
                ),
              ),
              if (showStatus && !course.isPublished) ...[
                const SizedBox(width: 8),
                CourseStatusChip(status: course.status),
              ],
              ?trailing,
            ],
          ),
          if (value != null) ...[
            const SizedBox(height: 12),
            AcademyProgressBar(value: value),
            const SizedBox(height: 6),
            Text(
              value >= 1
                  ? l10n.courseCompletedBadge
                  : l10n.courseProgressPercent((value * 100).round()),
              style: theme.textTheme.labelMedium?.copyWith(
                color: value >= 1 ? AppColors.brandOf(context) : colors.muted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _meta(AppLocalizations l10n) {
    final parts = <String>[
      if (course.teacherName.isNotEmpty) course.teacherName,
      l10n.courseLessonsPlural(course.lessonCount),
      if (course.durationMinutes > 0)
        courseDurationLabel(l10n, course.durationMinutes),
    ];
    return parts.join(' · ');
  }
}

class AcademyProgressBar extends StatelessWidget {
  const AcademyProgressBar({super.key, required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: value.clamp(0.0, 1.0)),
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeOutCubic,
        builder: (context, animated, _) => LinearProgressIndicator(
          value: animated,
          minHeight: 6,
          backgroundColor: colors.border,
          color: AppColors.brandOf(context),
        ),
      ),
    );
  }
}

class CourseStatusChip extends StatelessWidget {
  const CourseStatusChip({super.key, required this.status});

  final CourseStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final tint = switch (status) {
      CourseStatus.draft => colors.muted,
      CourseStatus.pending => const Color(0xFFFFB84D),
      CourseStatus.published => AppColors.brandOf(context),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: tint.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.label(context.l10n),
        style: theme.textTheme.labelSmall?.copyWith(
          color: tint,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

/// Small pill used for level / duration / students metadata.
class AcademyChip extends StatelessWidget {
  const AcademyChip(this.label, {super.key, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.sheet,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: colors.muted),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(fontSize: 12),
          ),
        ],
      ),
    );
  }
}
