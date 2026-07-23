import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';

class CoursePlayerScreen extends StatelessWidget {
  const CoursePlayerScreen({super.key, required this.course});

  final DemoCourse course;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(course.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          PulseSheet(
            child: Column(
              children: [
                Icon(Icons.play_circle_outline, size: 56, color: colors.muted),
                const SizedBox(height: 12),
                Text(
                  l10n.playerVideoSoon,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.playerVideoSoonBody,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(l10n.playerClasses, style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.sm),
          for (var i = 1; i <= 5; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                i == 1 ? Icons.pause_circle_outline : Icons.play_circle_outline,
                color: AppColors.brandOf(context),
              ),
              title: Text(l10n.playerClass(i)),
              trailing: Text(
                '${4 + i} min',
                style: theme.textTheme.bodyMedium,
              ),
            ),
        ],
      ),
    );
  }
}
