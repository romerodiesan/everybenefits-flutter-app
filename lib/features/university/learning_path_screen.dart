import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';

class LearningPathScreen extends StatelessWidget {
  const LearningPathScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final paths = [
      (l10n.pathNewAgent, l10n.pathMetaCoursesHours(5, 28), 0.2),
      (l10n.pathClosing, l10n.pathMetaCoursesHours(4, 18), 0.0),
      (l10n.pathLeadership, l10n.pathMetaCoursesHours(6, 32), 0.55),
    ];

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.academyPaths)),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: paths.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final path = paths[index];
          return PulseSheet(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  path.$1,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(path.$2, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: path.$3,
                  color: AppColors.brandOf(context),
                  backgroundColor: colors.border,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
