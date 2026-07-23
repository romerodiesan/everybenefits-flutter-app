import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import 'course_player_screen.dart';

class CourseDetailScreen extends StatelessWidget {
  const CourseDetailScreen({super.key, required this.course});

  final DemoCourse course;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.courseDetailTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            course.title,
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.courseByTeacher(course.teacher),
            style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            children: [
              _Chip(courseLevelLabel(l10n, course.level)),
              _Chip(course.hours),
              _Chip(l10n.courseStudents(course.students)),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          SignalButton(
            label: course.progress == null
                ? l10n.courseStart
                : l10n.courseContinue,
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CoursePlayerScreen(course: course),
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(l10n.courseAbout, style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            l10n.courseAboutDemo,
            style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          for (var i = 1; i <= 4; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: colors.sheet,
                child: Text('$i', style: theme.textTheme.labelLarge),
              ),
              title: Text(l10n.courseModule(i)),
              subtitle: Text(l10n.courseLessonsCount),
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label);
  final String label;

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
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(fontSize: 12),
      ),
    );
  }
}
