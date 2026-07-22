import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import 'forum_filter_chip.dart';

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
          letterSpacing: 0.2,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      );
    }

    final visible =
        maxVisible == null ? tags : tags.take(maxVisible!).toList();
    final overflow =
        maxVisible == null ? 0 : (tags.length - visible.length).clamp(0, 99);

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final tag in visible)
          ForumTagPill(
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
              fontWeight: FontWeight.w600,
            ),
          ),
      ],
    );
  }
}
