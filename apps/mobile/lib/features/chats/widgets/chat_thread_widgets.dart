import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../../../users/profile_validation.dart';
import '../../forums/widgets/share_to_chat_sheet.dart';
import '../chat_models.dart';
import 'chat_avatar.dart';

class ChatBubbleCluster extends StatefulWidget {
  const ChatBubbleCluster({
    super.key,
    required this.msg,
    required this.mine,
    required this.time,
    required this.showName,
    required this.showTime,
    required this.groupedWithOlder,
    required this.viewerUid,
    required this.onLongPress,
    required this.onTapReaction,
    required this.onSwipeReply,
    this.onOpenShared,
    this.onTapReply,
    this.onTapSender,
    this.senderPhotoUrl,
    this.onOpenMention,
  });

  final ChatMessage msg;
  final bool mine;
  final String time;
  final bool showName;
  final bool showTime;
  final bool groupedWithOlder;
  final String viewerUid;
  final ValueChanged<Rect> onLongPress;
  final ValueChanged<String> onTapReaction;
  final VoidCallback onSwipeReply;
  final VoidCallback? onOpenShared;
  final VoidCallback? onTapReply;
  final VoidCallback? onTapSender;
  final String? senderPhotoUrl;
  final ValueChanged<String>? onOpenMention;

  @override
  State<ChatBubbleCluster> createState() => _ChatBubbleClusterState();
}

class _ChatBubbleClusterState extends State<ChatBubbleCluster> {
  final _bubbleKey = GlobalKey();

  void _openMenu() {
    final box = _bubbleKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return;
    final topLeft = box.localToGlobal(Offset.zero);
    widget.onLongPress(topLeft & box.size);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final msg = widget.msg;
    final mine = widget.mine;
    final shared = msg.sharedPost;
    final counts = msg.reactionCounts();
    final myEmoji = msg.reactions[widget.viewerUid];
    final showBubble = msg.showsTextBubble;
    final shareOnly = shared != null && !showBubble;

    final column = Column(
      key: _bubbleKey,
      crossAxisAlignment: mine
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        if (widget.showName)
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 4),
            child: GestureDetector(
              onTap: widget.onTapSender,
              child: Text(
                msg.senderName,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colors.muted,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
              ),
            ),
          ),
        if (msg.replyTo != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: InkWell(
              onTap: widget.onTapReply,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
                decoration: BoxDecoration(
                  color: colors.glassFill,
                  borderRadius: BorderRadius.circular(12),
                  border: Border(left: BorderSide(color: brand, width: 3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      msg.replyTo!.senderName,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: brand,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      msg.replyTo!.bodyPreview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        if (shared != null)
          SharedPostCard(
            preview: shared,
            onTap: widget.onOpenShared,
            onLongPress: _openMenu,
            time: shareOnly && widget.showTime ? widget.time : null,
          ),
        if (shared != null && showBubble) const SizedBox(height: 6),
        if (showBubble)
          GestureDetector(
            onLongPress: _openMenu,
            child: _MessageBubble(
              text: msg.body,
              mine: mine,
              time: widget.showTime ? widget.time : null,
              onMentionTap: widget.onOpenMention,
            ),
          ),
        if (counts.isNotEmpty) ...[
          const SizedBox(height: 4),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              for (final entry in counts.entries)
                InkWell(
                  onTap: () => widget.onTapReaction(entry.key),
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: myEmoji == entry.key
                          ? brand.withValues(alpha: 0.16)
                          : colors.glassFill,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: myEmoji == entry.key
                            ? brand.withValues(alpha: 0.45)
                            : colors.border,
                      ),
                    ),
                    child: Text(
                      '${entry.key} ${entry.value}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );

    final replyPane = ActionPane(
      motion: const StretchMotion(),
      extentRatio: 0.18,
      children: [
        CustomSlidableAction(
          onPressed: (_) {
            PulseHaptics.selection();
            widget.onSwipeReply();
          },
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.onBrandOf(context),
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Semantics(
            label: l10n.chatReply,
            button: true,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: brand,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: brand.withValues(alpha: 0.28),
                    blurRadius: 12,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: const Icon(Icons.reply_rounded, size: 22),
            ),
          ),
        ),
      ],
    );

    final avatar = widget.groupedWithOlder
        ? const SizedBox(width: 28)
        : GestureDetector(
            onTap: widget.onTapSender,
            child: ChatAvatar(
              key: ValueKey('chat-avatar-${msg.senderId}'),
              initials: chatInitials(msg.senderName),
              name: msg.senderName,
              photoUrl: widget.senderPhotoUrl ?? msg.senderPhotoUrl,
              size: 28,
            ),
          );

    return Padding(
      padding: EdgeInsets.only(bottom: widget.groupedWithOlder ? 3 : 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine) ...[avatar, const SizedBox(width: 6)],
          Expanded(
            child: Slidable(
              key: ValueKey('reply-${msg.id}'),
              startActionPane: mine ? null : replyPane,
              endActionPane: mine ? replyPane : null,
              child: Align(
                alignment: mine
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width * 0.72,
                  ),
                  child: column,
                ),
              ),
            ),
          ),
          if (mine) ...[const SizedBox(width: 6), avatar],
        ],
      ),
    );
  }
}

class ChatDayPill extends StatelessWidget {
  const ChatDayPill({super.key, required this.at});

  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final label = formatChatDayLabel(at, context.l10n);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: colors.glassFill,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: colors.border),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: colors.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class ChatUnreadDivider extends StatelessWidget {
  const ChatUnreadDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(child: Divider(color: brand.withValues(alpha: 0.35))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              context.l10n.chatNewMessages,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: brand,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          Expanded(child: Divider(color: brand.withValues(alpha: 0.35))),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.text,
    required this.mine,
    this.time,
    this.onMentionTap,
  });

  final String text;
  final bool mine;
  final String? time;
  final ValueChanged<String>? onMentionTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 8),
      decoration: BoxDecoration(
        color: mine ? brand.withValues(alpha: 0.16) : colors.sheet,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(mine ? 18 : 5),
          bottomRight: Radius.circular(mine ? 5 : 18),
        ),
        border: Border.all(
          color: mine ? brand.withValues(alpha: 0.22) : colors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: mine
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          _LinkifiedText(
            text: text,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: colors.ink,
              height: 1.4,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
            linkColor: brand,
            onMentionTap: onMentionTap,
          ),
          if (time != null) ...[
            const SizedBox(height: 4),
            Text(
              time!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.muted,
                fontSize: 10.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LinkifiedText extends StatelessWidget {
  const _LinkifiedText({
    required this.text,
    required this.style,
    required this.linkColor,
    this.onMentionTap,
  });

  final String text;
  final TextStyle? style;
  final Color linkColor;
  final ValueChanged<String>? onMentionTap;

  @override
  Widget build(BuildContext context) {
    final pieces = splitChatBody(text);
    if (pieces.length == 1 && pieces.first is ChatBodyText) {
      return Text((pieces.first as ChatBodyText).value, style: style);
    }
    final spans = <InlineSpan>[];
    for (final piece in pieces) {
      switch (piece) {
        case ChatBodyText(:final value):
          if (value.isNotEmpty) spans.add(TextSpan(text: value));
        case ChatBodyUrl(:final value):
          spans.add(
            TextSpan(
              text: value,
              style: style?.copyWith(
                color: linkColor,
                decoration: TextDecoration.underline,
              ),
              recognizer: TapGestureRecognizer()
                ..onTap = () {
                  final uri = Uri.tryParse(value);
                  if (uri != null) {
                    launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
            ),
          );
        case ChatBodyMention(:final handle, :final raw):
          spans.add(
            TextSpan(
              text: raw,
              style: style?.copyWith(
                color: linkColor,
                fontWeight: FontWeight.w700,
              ),
              recognizer: onMentionTap == null
                  ? null
                  : (TapGestureRecognizer()
                      ..onTap = () => onMentionTap!(handle)),
            ),
          );
      }
    }
    return Text.rich(TextSpan(style: style, children: spans));
  }
}
