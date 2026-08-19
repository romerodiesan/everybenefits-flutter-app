import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/access_scope.dart';
import '../../users/user_role.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../profile/public_profile_screen.dart';
import 'chat_contact_info_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'chat_timeline.dart';
import 'widgets/chat_avatar.dart';
import 'widgets/chat_composer.dart';
import 'widgets/chat_message_menu.dart';
import 'widgets/chat_thread_widgets.dart';

const _typingStale = Duration(seconds: 4);

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
  final _threadSearch = TextEditingController();
  late final ChatRepository _repo = widget.chatRepository ?? ChatRepository();
  late Stream<ChatConversation?> _chatStream;
  late Stream<List<ChatMessage>> _messagesStream;
  late Stream<Map<String, int>> _typingStream;
  final _sharedSubs = <StreamSubscription<void>>[];
  final _sharedControllers = <StreamController<dynamic>>[];
  var _sending = false;
  var _sharedBootstrapped = false;
  var _emojiOpen = false;
  var _searchOpen = false;
  ChatMessage? _replyTo;
  late final int _unreadSnapshot;
  Timer? _typingIdle;
  var _typingSent = false;
  final _unreadKey = GlobalKey();
  final _messageKeys = <String, GlobalKey>{};

  Stream<List<ChatMessage>> _watchVisibleMessages() {
    return Stream<List<ChatMessage>>.multi((controller) {
      List<ChatMessage>? messages;
      Set<String> hidden = const {};
      void emit() {
        final current = messages;
        if (current == null) return;
        controller.add(
          current.where((message) => !hidden.contains(message.id)).toList(),
        );
      }

      final messagesSub = _repo.watchMessages(widget.chat.id).listen((value) {
        messages = value;
        emit();
      }, onError: controller.addError);
      final hiddenSub = _repo
          .watchHiddenMessageIds(
            chatId: widget.chat.id,
            uid: widget.profile.uid,
          )
          .listen((value) {
            hidden = value;
            emit();
          }, onError: controller.addError);
      controller.onCancel = () async {
        await messagesSub.cancel();
        await hiddenSub.cancel();
      };
    }, isBroadcast: true);
  }

  GlobalKey _keyForMessage(String id) {
    return _messageKeys.putIfAbsent(id, GlobalKey.new);
  }

  void _scrollToKey(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(
      ctx,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
      alignment: 0.25,
    );
  }

  @override
  void initState() {
    super.initState();
    _resetStreams();
    _unreadSnapshot = widget.chat.unreadFor(widget.profile.uid);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _repo.markRead(chatId: widget.chat.id, uid: widget.profile.uid);
      _bootstrapSharedPost();
    });
  }

  /// Keeps a single source subscription alive for the screen lifetime.
  ///
  /// `watchChat` / `watchTyping` are single-subscription (`async*`). AppBar,
  /// thread, and composer all listen, and [LayoutBuilder] can remount those
  /// [StreamBuilder]s — `asBroadcastStream()` then throws "already listened to".
  Stream<T> _share<T>(Stream<T> source) {
    final controller = StreamController<T>.broadcast();
    _sharedControllers.add(controller);
    _sharedSubs.add(
      source.listen(
        controller.add,
        onError: controller.addError,
        onDone: () {
          if (!controller.isClosed) controller.close();
        },
      ),
    );
    return controller.stream;
  }

  void _releaseSharedStreams() {
    for (final sub in _sharedSubs) {
      unawaited(sub.cancel());
    }
    _sharedSubs.clear();
    for (final controller in _sharedControllers) {
      if (!controller.isClosed) unawaited(controller.close());
    }
    _sharedControllers.clear();
  }

  void _resetStreams() {
    _releaseSharedStreams();
    _chatStream = _share(_repo.watchChat(widget.chat.id));
    _messagesStream = _share(_watchVisibleMessages());
    _typingStream = _share(_repo.watchTyping(widget.chat.id));
  }

  void _retryStreams() {
    setState(_resetStreams);
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
    _releaseSharedStreams();
    _typingIdle?.cancel();
    if (_typingSent) {
      unawaited(
        _repo.setTyping(
          chatId: widget.chat.id,
          uid: widget.profile.uid,
          typing: false,
        ),
      );
    }
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _threadSearch.dispose();
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

  void _onComposerChanged(String value) {
    setState(() {});
    final typing = value.trim().isNotEmpty;
    _typingIdle?.cancel();
    if (typing) {
      if (!_typingSent) {
        _typingSent = true;
        unawaited(
          _repo.setTyping(
            chatId: widget.chat.id,
            uid: widget.profile.uid,
            typing: true,
          ),
        );
      }
      _typingIdle = Timer(const Duration(seconds: 3), () {
        _typingSent = false;
        unawaited(
          _repo.setTyping(
            chatId: widget.chat.id,
            uid: widget.profile.uid,
            typing: false,
          ),
        );
      });
    } else if (_typingSent) {
      _typingSent = false;
      unawaited(
        _repo.setTyping(
          chatId: widget.chat.id,
          uid: widget.profile.uid,
          typing: false,
        ),
      );
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    PulseHaptics.light();
    final l10n = context.l10n;
    final reply = _replyTo;
    setState(() {
      _sending = true;
      _emojiOpen = false;
      _replyTo = null;
    });
    try {
      await _repo.sendMessage(
        chatId: widget.chat.id,
        body: text,
        author: widget.profile,
        replyTo: reply == null
            ? null
            : ChatReplyTo(
                messageId: reply.id,
                senderName: reply.senderName,
                bodyPreview: ChatReplyTo.previewOf(reply),
              ),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyChatError(error, l10n))));
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

  Future<void> _showMessageMenu(ChatMessage msg, Rect anchor) async {
    final mine = msg.isMine(widget.profile.uid);
    final canModerate = canModerateChatMessages(
      AccessScope.accessOf(context, fallbackRoleId: widget.profile.roleId),
    );
    final result = await showChatMessageMenu(
      context: context,
      anchor: anchor,
      mine: mine,
      canDelete: mine || canModerate,
      selected: msg.reactions[widget.profile.uid],
    );
    if (result == null || !mounted) return;
    switch (result.action) {
      case ChatMessageMenuAction.react:
        if (result.emoji != null) await _react(msg, result.emoji!);
      case ChatMessageMenuAction.copy:
        final text = msg.sharedPost?.title.trim().isNotEmpty == true
            ? msg.sharedPost!.title
            : msg.body;
        await Clipboard.setData(ClipboardData(text: text));
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(context.l10n.chatCopied)));
      case ChatMessageMenuAction.reply:
        setState(() => _replyTo = msg);
        _focusNode.requestFocus();
      case ChatMessageMenuAction.share:
        final text = msg.sharedPost?.title.trim().isNotEmpty == true
            ? msg.sharedPost!.title
            : msg.body;
        await SharePlus.instance.share(ShareParams(text: text));
      case ChatMessageMenuAction.delete:
        await _chooseMessageDeletion(
          msg,
          canDeleteForEveryone: mine || canModerate,
        );
    }
  }

  Future<void> _chooseMessageDeletion(
    ChatMessage msg, {
    required bool canDeleteForEveryone,
  }) async {
    final l10n = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.chatDeleteMessageTitle,
                style: Theme.of(
                  sheetContext,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.visibility_off_outlined),
                title: Text(l10n.chatDeleteForMe),
                subtitle: Text(l10n.chatDeleteForMeHint),
                onTap: () => Navigator.pop(sheetContext, 'me'),
              ),
              if (canDeleteForEveryone)
                ListTile(
                  leading: Icon(
                    Icons.delete_forever_outlined,
                    color: Theme.of(sheetContext).colorScheme.error,
                  ),
                  title: Text(l10n.chatDeleteForEveryone),
                  subtitle: Text(l10n.chatDeleteForEveryoneHint),
                  onTap: () => Navigator.pop(sheetContext, 'everyone'),
                ),
            ],
          ),
        ),
      ),
    );
    if (choice == null || !mounted) return;
    try {
      if (choice == 'me') {
        await _repo.hideMessageForMe(
          chatId: widget.chat.id,
          messageId: msg.id,
          uid: widget.profile.uid,
        );
      } else {
        await _repo.deleteMessageForEveryone(
          chatId: widget.chat.id,
          messageId: msg.id,
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyChatError(error, l10n))));
    }
  }

  Future<void> _confirmClearHistory() async {
    final l10n = context.l10n;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.chatClearHistoryTitle),
        content: Text(l10n.chatClearHistoryBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(MaterialLocalizations.of(context).cancelButtonLabel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.chatDeleteConfirmAction),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await _repo.clearMessages(widget.chat.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.chatHistoryCleared)));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyChatError(error, l10n))));
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

  void _openMember(String memberId) {
    if (memberId.isEmpty || memberId == widget.profile.uid) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicProfileScreen(
          uid: memberId,
          viewer: widget.profile,
          chatRepository: _repo,
        ),
      ),
    );
  }

  void _jumpToUnread() {
    _scrollToKey(_unreadKey);
  }

  List<String> _activeTypers(Map<String, int> raw) {
    final now = DateTime.now().toUtc().millisecondsSinceEpoch;
    final names = <String>[];
    for (final entry in raw.entries) {
      if (entry.key == widget.profile.uid) continue;
      if (now - entry.value > _typingStale.inMilliseconds) continue;
      final name = widget.chat.memberNames[entry.key] ?? '';
      if (name.isNotEmpty) names.add(name);
    }
    return names;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(size: Size(constraints.maxWidth, constraints.maxHeight)),
          child: _conversationScaffold(context),
        );
      },
    );
  }

  Widget _conversationScaffold(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
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
            final title = chat.titleFor(uid, l10n: l10n);
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
                      initials: chat.initialsFor(uid, l10n: l10n),
                      name: title,
                      photoUrl: chat.inboxPhotoUrl(uid),
                      isGroup: chat.isGroup,
                      size: 38,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                          ),
                          StreamBuilder<Map<String, int>>(
                            stream: _typingStream,
                            builder: (context, typingSnap) {
                              final typers = _activeTypers(
                                typingSnap.data ?? const {},
                              );
                              final subtitle = typers.isEmpty
                                  ? (chat.isDefaultAgentGroup
                                        ? l10n.chatsDefaultGroupBadge
                                        : (chat.isGroup
                                              ? l10n.chatTypeGroup
                                              : l10n.chatTypePrivate))
                                  : (typers.length == 1
                                        ? l10n.chatTypingOne(typers.first)
                                        : l10n.chatTypingMany);
                              return Text(
                                subtitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: typers.isEmpty
                                      ? colors.muted
                                      : AppColors.brandOf(context),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 11,
                                ),
                              );
                            },
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
        actions: [
          if (canModerateChatMessages(
            AccessScope.accessOf(
              context,
              fallbackRoleId: widget.profile.roleId,
            ),
          ))
            IconButton(
              tooltip: l10n.chatClearHistory,
              onPressed: _confirmClearHistory,
              icon: const Icon(Icons.delete_sweep_outlined),
            ),
          IconButton(
            tooltip: l10n.chatSearchThread,
            onPressed: () {
              setState(() {
                _searchOpen = !_searchOpen;
                if (!_searchOpen) _threadSearch.clear();
              });
            },
            icon: Icon(
              _searchOpen ? Icons.close_rounded : Icons.search_rounded,
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_searchOpen)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _threadSearch,
                autofocus: true,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: l10n.chatSearchThreadHint,
                  isDense: true,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
            ),
          Expanded(
            child: StreamBuilder<List<ChatMessage>>(
              stream: _messagesStream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            friendlyChatError(snapshot.error!, l10n),
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.muted,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          FilledButton.tonalIcon(
                            onPressed: _retryStreams,
                            icon: const Icon(Icons.refresh_rounded),
                            label: Text(l10n.actionRetry),
                          ),
                        ],
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

                final query = _threadSearch.text.trim().toLowerCase();
                final visible = query.isEmpty
                    ? messages
                    : messages
                          .where(
                            (m) =>
                                m.body.toLowerCase().contains(query) ||
                                m.senderName.toLowerCase().contains(query),
                          )
                          .toList();
                if (visible.isEmpty) {
                  return Center(
                    child: Text(
                      l10n.chatSearchThreadEmpty,
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
                    final items = buildChatTimelineNewestFirst(
                      newestFirst: visible,
                      viewerUid: uid,
                      isGroup: chat.isGroup,
                      unreadCount: query.isEmpty ? _unreadSnapshot : 0,
                    );
                    final unreadIndex = items.indexWhere(
                      (i) => i.kind == ChatTimelineKind.unread,
                    );

                    return Stack(
                      children: [
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: RadialGradient(
                              center: Alignment.topCenter,
                              radius: 1.2,
                              colors: [
                                AppColors.brandOf(
                                  context,
                                ).withValues(alpha: 0.05),
                                colors.canvas,
                              ],
                            ),
                          ),
                          child: SlidableAutoCloseBehavior(
                            child: ListView.builder(
                              controller: _scrollController,
                              reverse: true,
                              padding: const EdgeInsets.fromLTRB(
                                AppSpacing.md,
                                AppSpacing.md,
                                AppSpacing.md,
                                AppSpacing.sm,
                              ),
                              itemCount: items.length,
                              itemBuilder: (context, index) {
                                final item = items[index];
                                switch (item.kind) {
                                  case ChatTimelineKind.day:
                                    return ChatDayPill(at: item.day!);
                                  case ChatTimelineKind.unread:
                                    return ChatUnreadDivider(key: _unreadKey);
                                  case ChatTimelineKind.message:
                                    final msg = item.message!;
                                    final shared = msg.sharedPost;
                                    return ChatBubbleCluster(
                                      key: _keyForMessage(msg.id),
                                      msg: msg,
                                      mine: msg.isMine(uid),
                                      time: formatChatTime(msg.createdAt, l10n),
                                      showName: item.showSenderName,
                                      showTime: item.showTime,
                                      groupedWithOlder: item.groupedWithOlder,
                                      viewerUid: uid,
                                      senderPhotoUrl:
                                          msg.senderPhotoUrl ??
                                          chat.photoOf(msg.senderId),
                                      onTapSender: msg.isMine(uid)
                                          ? null
                                          : () => _openMember(msg.senderId),
                                      onOpenMention: (handle) => _openMember(
                                        chat.uidForUsername(handle) ?? handle,
                                      ),
                                      onOpenShared: shared == null
                                          ? null
                                          : () => _openSharedPost(shared),
                                      onLongPress: (anchor) =>
                                          _showMessageMenu(msg, anchor),
                                      onTapReaction: (emoji) =>
                                          _react(msg, emoji),
                                      onSwipeReply: () {
                                        setState(() => _replyTo = msg);
                                        _focusNode.requestFocus();
                                      },
                                      onTapReply: msg.replyTo == null
                                          ? null
                                          : () {
                                              _scrollToKey(
                                                _keyForMessage(
                                                  msg.replyTo!.messageId,
                                                ),
                                              );
                                            },
                                    );
                                }
                              },
                            ),
                          ),
                        ),
                        if (unreadIndex > 4)
                          Positioned(
                            right: 16,
                            bottom: 16,
                            child: FloatingActionButton.small(
                              heroTag: 'jump-unread-${widget.chat.id}',
                              onPressed: _jumpToUnread,
                              tooltip: l10n.chatJumpToNew,
                              child: const Icon(Icons.arrow_downward_rounded),
                            ),
                          ),
                      ],
                    );
                  },
                );
              },
            ),
          ),
          SafeArea(
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
                return ChatComposer(
                  controller: _controller,
                  focusNode: _focusNode,
                  sending: _sending,
                  emojiOpen: _emojiOpen,
                  onToggleEmoji: _toggleEmojiPicker,
                  onSend: _send,
                  replyTo: _replyTo,
                  onClearReply: () => setState(() => _replyTo = null),
                  onChanged: _onComposerChanged,
                  mentionMembers: liveChat.mentionCandidates(uid),
                  viewerUid: uid,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
