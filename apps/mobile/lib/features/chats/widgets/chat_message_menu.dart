import 'package:flutter/material.dart';

import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../chat_models.dart';

enum ChatMessageMenuAction { react, copy, reply }

class ChatMessageMenuResult {
  const ChatMessageMenuResult.react(this.emoji)
      : action = ChatMessageMenuAction.react;

  const ChatMessageMenuResult.copy()
      : action = ChatMessageMenuAction.copy,
        emoji = null;

  const ChatMessageMenuResult.reply()
      : action = ChatMessageMenuAction.reply,
        emoji = null;

  final ChatMessageMenuAction action;
  final String? emoji;
}

/// Animated bubble anchored to a long-pressed message.
Future<ChatMessageMenuResult?> showChatMessageMenu({
  required BuildContext context,
  required Rect anchor,
  required bool mine,
  String? selected,
}) {
  PulseHaptics.medium();
  return showGeneralDialog<ChatMessageMenuResult>(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black.withValues(alpha: 0.32),
    transitionDuration: const Duration(milliseconds: 240),
    pageBuilder: (ctx, animation, _) => _MenuLayer(
      anchor: anchor,
      mine: mine,
      selected: selected,
      animation: animation,
    ),
  );
}

class _MenuLayer extends StatelessWidget {
  const _MenuLayer({
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
  static const double _actionsHeight = 48;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final size = media.size;
    final emojis = ChatMessage.reactionEmojis;

    final barWidth =
        emojis.length * _itemSize + (_barPadding + _barBorder) * 2;
    const barHeight = _itemSize + (_barPadding + _barBorder) * 2;
    const totalHeight = barHeight + 8 + _actionsHeight;

    final safeTop = media.padding.top + 8;
    double top = anchor.top - totalHeight - _gap;
    if (top < safeTop) {
      top = anchor.bottom + _gap;
    }
    top = top.clamp(
      safeTop,
      size.height - totalHeight - media.padding.bottom - 8,
    );

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
            child: FadeTransition(
              opacity: animation,
              child: ScaleTransition(
                scale: CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOutBack,
                ),
                alignment:
                    mine ? Alignment.bottomRight : Alignment.bottomLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ReactionBar(
                      emojis: emojis,
                      selected: selected,
                      animation: animation,
                      onPick: (emoji) => Navigator.of(context).pop(
                        ChatMessageMenuResult.react(emoji),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _ActionRow(
                      mine: mine,
                      onCopy: () => Navigator.of(context).pop(
                        const ChatMessageMenuResult.copy(),
                      ),
                    ),
                  ],
                ),
              ),
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
    required this.onPick,
  });

  final List<String> emojis;
  final String? selected;
  final Animation<double> animation;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: colors.sheet,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: colors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.28),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        padding: const EdgeInsets.all(6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final emoji in emojis)
              InkWell(
                onTap: () {
                  PulseHaptics.selection();
                  onPick(emoji);
                },
                customBorder: const CircleBorder(),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected == emoji
                        ? brand.withValues(alpha: 0.16)
                        : null,
                    shape: BoxShape.circle,
                  ),
                  child: Text(emoji, style: const TextStyle(fontSize: 26)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.mine,
    required this.onCopy,
  });

  final bool mine;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    return Material(
      color: colors.sheet,
      borderRadius: BorderRadius.circular(16),
      child: Row(
        mainAxisAlignment:
            mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: onCopy,
            icon: const Icon(Icons.copy_rounded, size: 18),
            label: Text(l10n.chatCopy),
          ),
        ],
      ),
    );
  }
}
