import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:flutter/foundation.dart' as foundation;
import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../../../users/profile_validation.dart';
import '../chat_models.dart';
import 'chat_avatar.dart';

class ChatComposer extends StatefulWidget {
  const ChatComposer({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.emojiOpen,
    required this.onToggleEmoji,
    required this.onSend,
    required this.replyTo,
    required this.onClearReply,
    required this.onChanged,
    this.mentionMembers = const [],
    this.viewerUid = '',
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final bool emojiOpen;
  final VoidCallback onToggleEmoji;
  final VoidCallback onSend;
  final ChatMessage? replyTo;
  final VoidCallback onClearReply;
  final ValueChanged<String> onChanged;
  final List<MentionCandidate> mentionMembers;
  final String viewerUid;

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  var _mentionIndex = 0;

  List<MentionCandidate> get _hits {
    final selection = widget.controller.selection;
    final cursor = selection.isValid
        ? selection.baseOffset
        : widget.controller.text.length;
    final query = mentionQueryAt(widget.controller.text, cursor);
    if (query == null) return const [];
    return filterMentionCandidates(
      widget.mentionMembers,
      query.prefix,
      widget.viewerUid,
    );
  }

  MentionQuery? get _query {
    final selection = widget.controller.selection;
    final cursor = selection.isValid
        ? selection.baseOffset
        : widget.controller.text.length;
    return mentionQueryAt(widget.controller.text, cursor);
  }

  void _applyMention(MentionCandidate person) {
    final selection = widget.controller.selection;
    final cursor = selection.isValid
        ? selection.baseOffset
        : widget.controller.text.length;
    final next = insertMention(
      widget.controller.text,
      cursor,
      person.username,
    );
    widget.controller.value = TextEditingValue(
      text: next.text,
      selection: TextSelection.collapsed(offset: next.cursor),
    );
    widget.onChanged(next.text);
    setState(() => _mentionIndex = 0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final hasText = widget.controller.text.trim().isNotEmpty;
    final hits = _hits;
    final query = _query;
    final active = hits.isEmpty
        ? null
        : hits[_mentionIndex.clamp(0, hits.length - 1)];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.replyTo != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: colors.border),
              ),
              child: ListTile(
                dense: true,
                title: Text(
                  l10n.chatReplyTo(widget.replyTo!.senderName),
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: brand,
                  ),
                ),
                subtitle: Text(
                  ChatReplyTo.previewOf(widget.replyTo!),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: IconButton(
                  tooltip: l10n.chatReplyDismiss,
                  onPressed: widget.onClearReply,
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ),
          ),
        if (hits.isNotEmpty)
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: colors.sheet,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: colors.border),
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: hits.length,
                  itemBuilder: (context, index) {
                    final person = hits[index];
                    final selected = person.uid == active?.uid;
                    return ListTile(
                      dense: true,
                      selected: selected,
                      leading: ChatAvatar(
                        initials: chatInitials(person.name),
                        name: person.name,
                        photoUrl: person.photoUrl,
                        size: 32,
                      ),
                      title: Text(person.name),
                      subtitle: Text('@${person.username}'),
                      onTap: () => _applyMention(person),
                    );
                  },
                ),
              ),
            ),
          )
        else if (query != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                l10n.chatMentionEmpty,
                style: theme.textTheme.bodySmall?.copyWith(color: colors.muted),
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.sheet.withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: colors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 4, 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  IconButton(
                    tooltip: l10n.chatEmojiPicker,
                    onPressed: widget.onToggleEmoji,
                    icon: Icon(
                      widget.emojiOpen
                          ? Icons.keyboard_rounded
                          : Icons.emoji_emotions_outlined,
                      color: widget.emojiOpen ? brand : colors.muted,
                    ),
                  ),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      focusNode: widget.focusNode,
                      minLines: 1,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      enabled: !widget.sending,
                      onChanged: (value) {
                        setState(() => _mentionIndex = 0);
                        widget.onChanged(value);
                      },
                      onTap: () {
                        if (widget.emojiOpen) widget.onToggleEmoji();
                        setState(() {});
                      },
                      decoration: InputDecoration(
                        hintText: l10n.chatMessageHint,
                        hintStyle: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                        ),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 12,
                        ),
                      ),
                      onSubmitted: (_) {
                        if (hits.isNotEmpty && active != null) {
                          _applyMention(active);
                          return;
                        }
                        widget.onSend();
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2, right: 2),
                    child: AnimatedScale(
                      scale: hasText || widget.sending ? 1 : 0.86,
                      duration: const Duration(milliseconds: 180),
                      child: Material(
                        color: hasText ? brand : colors.glassFill,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: widget.sending || !hasText
                              ? null
                              : widget.onSend,
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child: widget.sending
                                ? Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.onBrandOf(context),
                                    ),
                                  )
                                : Icon(
                                    Icons.send_rounded,
                                    size: 18,
                                    color: hasText
                                        ? AppColors.onBrandOf(context)
                                        : colors.muted,
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (widget.emojiOpen)
          SizedBox(
            height: 280,
            child: EmojiPicker(
              textEditingController: widget.controller,
              onEmojiSelected: (_, _) {
                widget.onChanged(widget.controller.text);
                setState(() {});
              },
              config: Config(
                height: 280,
                checkPlatformCompatibility: true,
                emojiViewConfig: EmojiViewConfig(
                  backgroundColor: colors.sheet,
                  columns: 8,
                  emojiSizeMax: 28 *
                      (foundation.defaultTargetPlatform == TargetPlatform.iOS
                          ? 1.2
                          : 1.0),
                ),
                categoryViewConfig: CategoryViewConfig(
                  backgroundColor: colors.sheet,
                  indicatorColor: brand,
                  iconColorSelected: brand,
                ),
                bottomActionBarConfig: const BottomActionBarConfig(
                  enabled: false,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
