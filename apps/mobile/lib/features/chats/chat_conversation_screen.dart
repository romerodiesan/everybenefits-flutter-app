import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:flutter/foundation.dart' as foundation;
import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../forums/widgets/share_to_chat_sheet.dart';
import '../profile/public_profile_screen.dart';
import 'chat_contact_info_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';
import 'widgets/reaction_popup.dart';

class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({
    super.key,
    required this.chat,
    required this.profile,
    this.chatRepository,
    this.forumRepository,
    this.initialSharedPost,
    this.embedded = false,
  });

  final ChatConversation chat;
  final UserProfile profile;
  final ChatRepository? chatRepository;
  final ForumRepository? forumRepository;
  final SharedPostPreview? initialSharedPost;
  final bool embedded;

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  late final ChatRepository _repo =
      widget.chatRepository ?? ChatRepository();
  late final Stream<ChatConversation?> _chatStream =
      _repo.watchChat(widget.chat.id);
  late final Stream<List<ChatMessage>> _messagesStream =
      _repo.watchMessages(widget.chat.id);
  var _sending = false;
  var _sharedBootstrapped = false;
  var _emojiOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _repo.markRead(chatId: widget.chat.id, uid: widget.profile.uid);
      _bootstrapSharedPost();
    });
  }

  Future<void> _bootstrapSharedPost() async {
    final preview = widget.initialSharedPost;
    if (preview == null || _sharedBootstrapped) return;
    _sharedBootstrapped = true;
    try {
      await _repo.sharePost(
        chatId: widget.chat.id,
        author: widget.profile,
        preview: preview,
      );
      await _repo.markRead(chatId: widget.chat.id, uid: widget.profile.uid);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _toggleEmojiPicker() {
    PulseHaptics.selection();
    setState(() => _emojiOpen = !_emojiOpen);
    if (_emojiOpen) {
      _focusNode.unfocus();
    } else {
      _focusNode.requestFocus();
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    PulseHaptics.light();
    final l10n = context.l10n;
    setState(() {
      _sending = true;
      _emojiOpen = false;
    });
    try {
      await _repo.sendMessage(
        chatId: widget.chat.id,
        body: text,
        author: widget.profile,
      );
      _controller.clear();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_scrollController.hasClients) return;
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, l10n))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _react(ChatMessage msg, String emoji) async {
    PulseHaptics.selection();
    try {
      await _repo.toggleReaction(
        chatId: widget.chat.id,
        messageId: msg.id,
        uid: widget.profile.uid,
        emoji: emoji,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    }
  }

  /// Long-press opens an animated WhatsApp-style bubble anchored to the message.
  Future<void> _showReactionPicker(ChatMessage msg, Rect anchor) async {
    final mine = msg.isMine(widget.profile.uid);
    final picked = await showReactionPopup(
      context: context,
      anchor: anchor,
      mine: mine,
      selected: msg.reactions[widget.profile.uid],
    );
    if (picked != null) {
      await _react(msg, picked);
    }
  }

  void _openSharedPost(SharedPostPreview preview) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: preview.threadId,
          profile: widget.profile,
          forumRepository: widget.forumRepository ?? ForumRepository(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            size: Size(constraints.maxWidth, constraints.maxHeight),
          ),
          child: _conversationScaffold(context),
        );
      },
    );
  }

  Widget _conversationScaffold(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final uid = widget.profile.uid;

    return PulseScaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.embedded,
        titleSpacing: 0,
        title: StreamBuilder<ChatConversation?>(
          stream: _chatStream,
          initialData: widget.chat,
          builder: (context, snapshot) {
            final chat = snapshot.data ?? widget.chat;
            return InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) {
                      final other = chat.memberIds
                          .where((id) => id != uid)
                          .toList();
                      if (!chat.isGroup && other.isNotEmpty) {
                        return PublicProfileScreen(
                          uid: other.first,
                          viewer: widget.profile,
                          chatRepository: _repo,
                        );
                      }
                      return ChatContactInfoScreen(
                        chat: chat,
                        profile: widget.profile,
                        chatRepository: _repo,
                      );
                    },
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: Row(
                  children: [
                    ChatAvatar(
                      initials: chat.initialsFor(uid, l10n: context.l10n),
                      isGroup: chat.isGroup,
                      size: 38,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            chat.titleFor(uid, l10n: l10n),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                          ),
                          Text(
                            chat.isDefaultAgentGroup
                                ? l10n.chatsDefaultGroupBadge
                                : (chat.isGroup
                                    ? l10n.chatTypeGroup
                                    : l10n.chatTypePrivate),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colors.muted,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<ChatMessage>>(
              stream: _messagesStream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      friendlyChatError(snapshot.error!, l10n),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  );
                }
                final messages = snapshot.data;
                if (messages == null) {
                  return const PulseMessageListSkeleton();
                }
                if (messages.isEmpty) {
                  return Center(
                    child: Text(
                      l10n.chatEmptyThread,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  );
                }

                return StreamBuilder<ChatConversation?>(
                  stream: _chatStream,
                  initialData: widget.chat,
                  builder: (context, chatSnap) {
                    final chat = chatSnap.data ?? widget.chat;
                    final showSenderNames = chat.isGroup;

                    return ListView.builder(
                      controller: _scrollController,
                      reverse: true,
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        AppSpacing.md,
                        AppSpacing.md,
                        AppSpacing.sm,
                      ),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final msg = messages[index];
                        final mine = msg.isMine(uid);
                        final shared = msg.sharedPost;
                        final time = formatChatTime(msg.createdAt, l10n);
                        final showName = showSenderNames &&
                            !mine &&
                            msg.senderName.trim().isNotEmpty;

                        final reactionsEnabled = true;

                        return _MessageRow(
                          key: ValueKey(msg.id),
                          msg: msg,
                          mine: mine,
                          time: time,
                          showName: showName,
                          shared: shared,
                          viewerUid: uid,
                          reactionsEnabled: reactionsEnabled,
                          onOpenShared: shared == null
                              ? null
                              : () => _openSharedPost(shared),
                          onLongPress: (anchor) =>
                              _showReactionPicker(msg, anchor),
                          onTapReaction: (emoji) => _react(msg, emoji),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: colors.sheet.withValues(alpha: 0.96),
              border: Border(top: BorderSide(color: colors.border)),
            ),
            child: SafeArea(
              top: false,
              child: StreamBuilder<ChatConversation?>(
                stream: _chatStream,
                initialData: widget.chat,
                builder: (context, snap) {
                  final liveChat = snap.data ?? widget.chat;
                  if (!liveChat.canSendMessages) {
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      child: Column(
                        children: [
                          Text(
                            l10n.chatsDmDisabled,
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.muted,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              final other = liveChat.memberIds
                                  .where((id) => id != uid)
                                  .toList();
                              if (other.isEmpty) return;
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => PublicProfileScreen(
                                    uid: other.first,
                                    viewer: widget.profile,
                                    chatRepository: _repo,
                                  ),
                                ),
                              );
                            },
                            child: Text(l10n.memberViewProfile),
                          ),
                        ],
                      ),
                    );
                  }
                  return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 10, 10, 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        IconButton(
                          tooltip: l10n.chatEmojiPicker,
                          onPressed: _toggleEmojiPicker,
                          icon: Icon(
                            _emojiOpen
                                ? Icons.keyboard_rounded
                                : Icons.emoji_emotions_outlined,
                            color: _emojiOpen ? brand : colors.muted,
                          ),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            focusNode: _focusNode,
                            minLines: 1,
                            maxLines: 4,
                            textCapitalization: TextCapitalization.sentences,
                            enabled: !_sending,
                            onTap: () {
                              if (_emojiOpen) {
                                setState(() => _emojiOpen = false);
                              }
                            },
                            decoration: InputDecoration(
                              hintText: l10n.chatMessageHint,
                              hintStyle: theme.textTheme.bodyMedium?.copyWith(
                                color: colors.muted,
                              ),
                              filled: true,
                              fillColor: colors.glassFill,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: BorderSide(color: colors.border),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: BorderSide(color: colors.border),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide:
                                    BorderSide(color: brand, width: 1.4),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                            ),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Material(
                          color: brand,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: InkWell(
                            onTap: _sending ? null : _send,
                            borderRadius: BorderRadius.circular(16),
                            child: SizedBox(
                              width: 48,
                              height: 48,
                              child: _sending
                                  ? Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.onBrandOf(context),
                                      ),
                                    )
                                  : Icon(
                                      Icons.send_rounded,
                                      size: 20,
                                      color: AppColors.onBrandOf(context),
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_emojiOpen)
                    SizedBox(
                      height: 280,
                      child: EmojiPicker(
                        textEditingController: _controller,
                        config: Config(
                          height: 280,
                          checkPlatformCompatibility: true,
                          emojiViewConfig: EmojiViewConfig(
                            backgroundColor: colors.sheet,
                            columns: 8,
                            emojiSizeMax: 28 *
                                (foundation.defaultTargetPlatform ==
                                        TargetPlatform.iOS
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
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageRow extends StatefulWidget {
  const _MessageRow({
    super.key,
    required this.msg,
    required this.mine,
    required this.time,
    required this.showName,
    required this.shared,
    required this.viewerUid,
    required this.reactionsEnabled,
    this.onLongPress,
    this.onTapReaction,
    this.onOpenShared,
  });

  final ChatMessage msg;
  final bool mine;
  final String time;
  final bool showName;
  final SharedPostPreview? shared;
  final String viewerUid;
  final bool reactionsEnabled;

  /// Passes the on-screen rect of the pressed bubble so the picker can anchor.
  final ValueChanged<Rect>? onLongPress;
  final ValueChanged<String>? onTapReaction;
  final VoidCallback? onOpenShared;

  @override
  State<_MessageRow> createState() => _MessageRowState();
}

class _MessageRowState extends State<_MessageRow> {
  final _bubbleKey = GlobalKey();

  void _handleLongPress() {
    final onLongPress = widget.onLongPress;
    if (onLongPress == null) return;
    final box = _bubbleKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return;
    final topLeft = box.localToGlobal(Offset.zero);
    onLongPress(topLeft & box.size);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final msg = widget.msg;
    final mine = widget.mine;
    final shared = widget.shared;
    final showName = widget.showName;
    final time = widget.time;
    final onTapReaction = widget.onTapReaction;
    final onOpenShared = widget.onOpenShared;
    final counts =
        widget.reactionsEnabled ? msg.reactionCounts() : const <String, int>{};
    final myEmoji =
        widget.reactionsEnabled ? msg.reactions[widget.viewerUid] : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Align(
        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.82,
          ),
          child: GestureDetector(
            onLongPress: widget.onLongPress == null ? null : _handleLongPress,
            child: Column(
              key: _bubbleKey,
              crossAxisAlignment:
                  mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (showName)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 4),
                    child: Text(
                      msg.senderName,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ),
                if (shared != null)
                  SharedPostCard(
                    preview: shared,
                    onTap: onOpenShared,
                  ),
                if (shared != null && msg.body.trim().isNotEmpty)
                  const SizedBox(height: 6),
                if (msg.body.trim().isNotEmpty || shared == null)
                  _MessageBubble(text: msg.body, mine: mine),
                if (counts.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      for (final entry in counts.entries)
                        InkWell(
                          onTap: onTapReaction == null
                              ? null
                              : () => onTapReaction(entry.key),
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
                const SizedBox(height: 4),
                Text(
                  time,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.muted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.text, required this.mine});

  final String text;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
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
      child: Text(
        text,
        style: theme.textTheme.bodyLarge?.copyWith(
          color: colors.ink,
          height: 1.4,
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
