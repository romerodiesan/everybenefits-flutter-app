import 'package:flutter/material.dart';

import '../../../app/theme.dart';

/// Tappable `#tag` wrap used across list, detail, and create screens.
class ForumTagWrap extends StatelessWidget {
  const ForumTagWrap({
    super.key,
    required this.tags,
    this.maxVisible,
    this.onTagTap,
    this.onTagRemove,
    this.emptyLabel,
  });

  final List<String> tags;
  final int? maxVisible;
  final ValueChanged<String>? onTagTap;
  final ValueChanged<String>? onTagRemove;
  final String? emptyLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (tags.isEmpty) {
      if (emptyLabel == null) return const SizedBox.shrink();
      return Text(
        emptyLabel!,
        style: theme.textTheme.labelLarge?.copyWith(
          color: AppColors.of(context).muted,
          letterSpacing: 1.2,
          fontSize: 11,
        ),
      );
    }

    final visible =
        maxVisible == null ? tags : tags.take(maxVisible!).toList();
    final overflow =
        maxVisible == null ? 0 : (tags.length - visible.length).clamp(0, 99);

    return Wrap(
      spacing: 10,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final tag in visible)
          _TagChip(
            tag: tag,
            removable: onTagRemove != null,
            onTap: onTagRemove != null
                ? () => onTagRemove!(tag)
                : (onTagTap == null ? null : () => onTagTap!(tag)),
          ),
        if (overflow > 0)
          Text(
            '+$overflow',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: 12,
              color: AppColors.of(context).muted,
            ),
          ),
      ],
    );
  }
}

class _TagChip extends StatelessWidget {
  const _TagChip({
    required this.tag,
    required this.removable,
    this.onTap,
  });

  final String tag;
  final bool removable;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = removable ? '#$tag  ×' : '#$tag';

    final text = Text(
      label,
      style: theme.textTheme.bodyMedium?.copyWith(
        fontSize: 12,
        color: AppColors.brandOf(context),
        fontWeight: FontWeight.w700,
      ),
    );

    if (onTap == null) return text;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: text,
      ),
    );
  }
}
