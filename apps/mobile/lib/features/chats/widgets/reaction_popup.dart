import 'package:flutter/material.dart';

import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../chat_models.dart';

/// WhatsApp-style reaction picker: an animated bubble that pops above (or
/// below) the long-pressed message and returns the chosen emoji.
Future<String?> showReactionPopup({
  required BuildContext context,
  required Rect anchor,
  required bool mine,
  String? selected,
}) {
  PulseHaptics.medium();
  return showGeneralDialog<String>(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black.withValues(alpha: 0.32),
    transitionDuration: const Duration(milliseconds: 240),
    pageBuilder: (ctx, animation, _) => _ReactionPopupLayer(
      anchor: anchor,
      mine: mine,
      selected: selected,
      animation: animation,
    ),
  );
}

class _ReactionPopupLayer extends StatelessWidget {
  const _ReactionPopupLayer({
    required this.anchor,
    required this.mine,
    required this.selected,
    required this.animation,
  });

  final Rect anchor;
  final bool mine;
  final String? selected;
  final Animation<double> animation;

  static const double _itemSize = 44;
  static const double _barPadding = 6;
  static const double _barBorder = 1;
  static const double _gap = 10;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final size = media.size;
    final emojis = ChatMessage.reactionEmojis;

    final barWidth =
        emojis.length * _itemSize + (_barPadding + _barBorder) * 2;
    const barHeight = _itemSize + (_barPadding + _barBorder) * 2;

    // Prefer floating above the bubble; drop below when it would clip the top.
    final safeTop = media.padding.top + 8;
    double top = anchor.top - barHeight - _gap;
    if (top < safeTop) {
      top = anchor.bottom + _gap;
    }
    top = top.clamp(
      safeTop,
      size.height - barHeight - media.padding.bottom - 8,
    );

    // Keep the bar hugging the bubble's side, but never off-screen.
    double left = mine ? anchor.right - barWidth : anchor.left;
    left = left.clamp(8.0, size.width - barWidth - 8);

    return SizedBox.expand(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            left: left,
            top: top,
            width: barWidth,
            height: barHeight,
            child: _ReactionBar(
              emojis: emojis,
              selected: selected,
              animation: animation,
              alignRight: mine,
              onPick: (emoji) => Navigator.of(context).pop(emoji),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReactionBar extends StatelessWidget {
  const _ReactionBar({
    required this.emojis,
    required this.selected,
    required this.animation,
    required this.alignRight,
    required this.onPick,
  });

  final List<String> emojis;
  final String? selected;
  final Animation<double> animation;
  final bool alignRight;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    // The whole bar scales up from the bubble's side as it fades in.
    final barScale = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutBack,
    );

    return FadeTransition(
      opacity: animation,
      child: ScaleTransition(
        scale: barScale,
        alignment: alignRight ? Alignment.bottomRight : Alignment.bottomLeft,
        child: Material(
          color: Colors.transparent,
          child: Container(
            decoration: BoxDecoration(
              color: colors.sheet,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: colors.border,
                width: _ReactionPopupLayer._barBorder,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.28),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            padding: const EdgeInsets.all(_ReactionPopupLayer._barPadding),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < emojis.length; i++)
                  _ReactionItem(
                    emoji: emojis[i],
                    isSelected: selected == emojis[i],
                    // Stagger each emoji so they cascade in like WhatsApp.
                    interval: Interval(
                      (i / emojis.length) * 0.5,
                      0.5 + (i / emojis.length) * 0.5,
                      curve: Curves.easeOutBack,
                    ),
                    animation: animation,
                    brand: brand,
                    onTap: () {
                      PulseHaptics.selection();
                      onPick(emojis[i]);
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ReactionItem extends StatelessWidget {
  const _ReactionItem({
    required this.emoji,
    required this.isSelected,
    required this.interval,
    required this.animation,
    required this.brand,
    required this.onTap,
  });

  final String emoji;
  final bool isSelected;
  final Interval interval;
  final Animation<double> animation;
  final Color brand;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final entrance = CurvedAnimation(parent: animation, curve: interval);

    return AnimatedBuilder(
      animation: entrance,
      builder: (context, child) {
        return Opacity(
          opacity: entrance.value.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(0, (1 - entrance.value) * 12),
            child: Transform.scale(scale: entrance.value, child: child),
          ),
        );
      },
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: _ReactionPopupLayer._itemSize,
          height: _ReactionPopupLayer._itemSize,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? brand.withValues(alpha: 0.16) : null,
            shape: BoxShape.circle,
          ),
          child: Text(emoji, style: const TextStyle(fontSize: 26)),
        ),
      ),
    );
  }
}
