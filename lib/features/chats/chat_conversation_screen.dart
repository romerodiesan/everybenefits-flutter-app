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
import 'chat_contact_info_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({
    super.key,
    required this.chat,
    required this.profile,
    this.chatRepository,
    this.forumRepository,
    this.initialSharedPost,
  });

  final ChatConversation chat;
  final UserProfile profile;
  final ChatRepository? chatRepository;
  final ForumRepository? forumRepository;
  final SharedPostPreview? initialSharedPost;

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  late final ChatRepository _repo =
      widget.chatRepository ?? ChatRepository();
  late final Stream<ChatConversation?> _chatStream =
      _repo.watchChat(widget.chat.id);
  late final Stream<List<ChatMessage>> _messagesStream =
      _repo.watchMessages(widget.chat.id);
  var _sending = false;
  var _sharedBootstrapped = false;

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
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    PulseHaptics.light();
    setState(() => _sending = true);
    try {
      await _repo.sendMessage(
        chatId: widget.chat.id,
        body: text,
        author: widget.profile,
      );
      _controller.clear();
      // reverse:true ListView — offset 0 is the newest (bottom).
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
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
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
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final uid = widget.profile.uid;

    return PulseScaffold(
      appBar: AppBar(
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
                    builder: (_) => ChatContactInfoScreen(
                      chat: chat,
                      profile: widget.profile,
                      chatRepository: _repo,
                    ),
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

                    if (shared != null) {
                      return Padding(
                        key: ValueKey(msg.id),
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Align(
                          alignment: mine
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.sizeOf(context).width * 0.82,
                            ),
                            child: Column(
                              crossAxisAlignment: mine
                                  ? CrossAxisAlignment.end
                                  : CrossAxisAlignment.start,
                              children: [
                                SharedPostCard(
                                  preview: shared,
                                  onTap: () => _openSharedPost(shared),
                                ),
                                if (msg.body.trim().isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  _MessageBubble(
                                    text: msg.body,
                                    mine: mine,
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
                      );
                    }

                    return Padding(
                      key: ValueKey(msg.id),
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Align(
                        alignment: mine
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth:
                                MediaQuery.sizeOf(context).width * 0.78,
                          ),
                          child: Column(
                            crossAxisAlignment: mine
                                ? CrossAxisAlignment.end
                                : CrossAxisAlignment.start,
                            children: [
                              _MessageBubble(text: msg.body, mine: mine),
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
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        enabled: !_sending,
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
                            borderSide: BorderSide(color: brand, width: 1.4),
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
            ),
          ),
        ],
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
