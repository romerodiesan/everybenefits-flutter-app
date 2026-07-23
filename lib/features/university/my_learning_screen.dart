import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import 'course_detail_screen.dart';

class MyLearningScreen extends StatelessWidget {
  const MyLearningScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final mine = demoCourses.where((c) => c.progress != null).toList();

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.academyMyLearning)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(l10n.myLearningInProgress, style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.md),
          if (mine.isEmpty)
            Text(
              l10n.myLearningEmpty,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            )
          else
            for (final course in mine) ...[
              PulseSheet(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => CourseDetailScreen(course: course),
                    ),
                  );
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(
                      value: course.progress,
                      color: AppColors.brandOf(context),
                      backgroundColor: colors.border,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
        ],
      ),
    );
  }
}
