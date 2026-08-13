import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../forum_models.dart';

/// Fresh | Pulse | Saved segment control for the home feed.
class ForumFeedModeBar extends StatelessWidget {
  const ForumFeedModeBar({
    super.key,
    required this.mode,
    required this.onChanged,
  });

  final ForumFeedMode mode;
  final ValueChanged<ForumFeedMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final theme = Theme.of(context);

    Widget chip(ForumFeedMode value, String label) {
      final selected = mode == value;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: selected ? brand.withValues(alpha: 0.14) : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelLarge?.copyWith(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                color: selected ? brand : colors.muted,
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.sheet,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(3),
          child: Row(
            children: [
              chip(ForumFeedMode.fresh, l10n.forumsModeFresh),
              chip(ForumFeedMode.pulse, l10n.forumsModePulse),
              chip(ForumFeedMode.saved, l10n.forumsModeSaved),
            ],
          ),
        ),
      ),
    );
  }
}
