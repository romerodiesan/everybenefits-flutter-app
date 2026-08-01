import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../forum_models.dart';

/// Stack Overflow–style relevance: up / score / down.
class RelevanceControls extends StatelessWidget {
  const RelevanceControls({
    super.key,
    required this.score,
    required this.vote,
    this.onUp,
    this.onDown,
    this.compact = false,
    this.enabled = true,
  });

  final int score;
  final RelevanceVote vote;
  final VoidCallback? onUp;
  final VoidCallback? onDown;
  final bool compact;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final iconSize = compact ? 20.0 : 24.0;
    final scoreStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w800,
          fontSize: compact ? 13 : 15,
          color: vote == RelevanceVote.none ? colors.ink : brand,
        );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: l10n.relevanceUpTooltip,
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          constraints: BoxConstraints.tightFor(
            width: compact ? 32 : 36,
            height: compact ? 28 : 32,
          ),
          onPressed: enabled ? onUp : null,
          icon: Icon(
            vote == RelevanceVote.up
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_up_outlined,
            size: iconSize,
            color: vote == RelevanceVote.up ? brand : colors.muted,
          ),
        ),
        Text('$score', style: scoreStyle),
        IconButton(
          tooltip: l10n.relevanceDownTooltip,
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          constraints: BoxConstraints.tightFor(
            width: compact ? 32 : 36,
            height: compact ? 28 : 32,
          ),
          onPressed: enabled ? onDown : null,
          icon: Icon(
            vote == RelevanceVote.down
                ? Icons.keyboard_arrow_down_rounded
                : Icons.keyboard_arrow_down_outlined,
            size: iconSize,
            color: vote == RelevanceVote.down ? brand : colors.muted,
          ),
        ),
      ],
    );
  }
}

