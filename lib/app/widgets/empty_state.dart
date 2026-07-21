import 'package:flutter/material.dart';

import '../app_spacing.dart';
import '../theme.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.subtitle,
    this.mark,
  });

  final String title;
  final String subtitle;
  /// Optional large typographic mark (letter/number), not an icon-first look.
  final String? mark;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 480),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 18 * (1 - value)),
            child: child,
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.md,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        child: Align(
          alignment: Alignment.centerLeft,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (mark != null) ...[
                  Text(
                    mark!,
                    style: theme.textTheme.displayLarge?.copyWith(
                      color: AppColors.accent.withValues(alpha: 0.18),
                      fontSize: 96,
                      height: 0.85,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                Text(title, style: theme.textTheme.headlineMedium),
                const SizedBox(height: AppSpacing.sm),
                Text(subtitle, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
