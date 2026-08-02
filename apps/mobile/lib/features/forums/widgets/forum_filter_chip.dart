import 'package:flutter/material.dart';

import '../../../app/theme.dart';

/// Compact discovery chip for feed filters (mine / tags / sort).
class ForumFilterChip extends StatelessWidget {
  const ForumFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.leading,
    this.showHash = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? leading;
  final bool showHash;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final onBrand = AppColors.onBrandOf(context);

    return Material(
      color: selected ? brand : colors.sheet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: selected ? brand : colors.border,
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            leading != null ? 10 : 12,
            8,
            12,
            8,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[
                Icon(
                  leading,
                  size: 15,
                  color: selected ? onBrand : colors.muted,
                ),
                const SizedBox(width: 6),
              ],
              Text(
                showHash ? '#$label' : label,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.1,
                  color: selected ? onBrand : colors.ink.withValues(alpha: 0.82),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Soft tag pill used on cards, detail and create.
class ForumTagPill extends StatelessWidget {
  const ForumTagPill({
    super.key,
    required this.tag,
    this.onTap,
    this.removable = false,
    this.selected = false,
  });

  final String tag;
  final VoidCallback? onTap;
  final bool removable;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: selected
            ? brand.withValues(alpha: 0.14)
            : colors.meshBlob.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: selected ? brand.withValues(alpha: 0.35) : colors.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '#$tag',
            style: theme.textTheme.labelLarge?.copyWith(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.15,
              color: selected ? brand : colors.ink.withValues(alpha: 0.75),
            ),
          ),
          if (removable) ...[
            const SizedBox(width: 4),
            Icon(
              Icons.close_rounded,
              size: 13,
              color: colors.muted,
            ),
          ],
        ],
      ),
    );

    if (onTap == null) return child;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: child,
      ),
    );
  }
}
