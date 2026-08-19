import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_constrained.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'chat_conversation_screen.dart';
import 'chat_default_group_callable.dart';
import 'chat_models.dart';
import 'chat_manage_groups_screen.dart';
import 'chat_new_chat_screen.dart';
import 'chat_new_group_screen.dart';
import 'chat_people_screen.dart';
import 'chat_repository.dart';
import '../notifications/notification_bell_button.dart';
import 'widgets/chat_inbox_widgets.dart';

/// Chat inbox backed by [ChatRepository].
class ChatsScreen extends StatefulWidget {
  const ChatsScreen({
    super.key,
    required this.profile,
    this.chatRepository,
    this.userRepository,
    this.socialRepository,
    this.showFab = true,
    this.notificationUnread = 0,
    this.onOpenNotifications,
  });

  final UserProfile profile;
  final ChatRepository? chatRepository;
  final UserRepository? userRepository;
  final SocialRepository? socialRepository;

  /// When false, the shell owns the FAB.
  final bool showFab;
  final int notificationUnread;
  final VoidCallback? onOpenNotifications;

  @override
  State<ChatsScreen> createState() => ChatsScreenState();
}

class ChatsScreenState extends State<ChatsScreen> {
  late final ChatRepository _repo = widget.chatRepository ?? ChatRepository();
  late final UserRepository _users = widget.userRepository ?? UserRepository();
  final _gate = StreamController<List<ChatConversation>>.broadcast();
  StreamSubscription<List<ChatConversation>>? _sub;
  List<ChatConversation>? _latest;
  bool? _listening;
  bool _defaultJoinAttempted = false;
  ChatConversation? _selectedChat;
  final _search = TextEditingController();
  ChatInboxFilter _filter = ChatInboxFilter.all;

  void selectConversation(ChatConversation chat) {
    if (!pulseUseMasterDetail(context)) {
      openChat(
        context,
        chat: chat,
        profile: widget.profile,
        chatRepository: _repo,
      );
      return;
    }
    setState(() => _selectedChat = chat);
  }

  @override
  void initState() {
    super.initState();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _maybeJoinDefaultAgentGroup();
  }

  Future<void> _maybeJoinDefaultAgentGroup() async {
    if (_defaultJoinAttempted) return;
    if (!belongsInDefaultAgentGroup(
      AccessScope.accessOf(context, fallbackRoleId: widget.profile.roleId),
    )) {
      return;
    }
    _defaultJoinAttempted = true;
    try {
      await DefaultAgentGroupCallable().ensureMembership();
    } catch (_) {
      // Soft backfill — inbox still works without membership.
    }
  }

  void _syncListen(bool shouldListen) {
    if (_listening == shouldListen) return;
    _listening = shouldListen;
    if (shouldListen) {
      // Fresh RTDB subscription each time TickerMode re-enables the tab.
      _sub = _repo
          .watchChats(widget.profile.uid)
          .listen(
            (chats) {
              _latest = chats;
              if (!_gate.isClosed) _gate.add(chats);
            },
            onError: (Object error, StackTrace stack) {
              if (!_gate.isClosed) _gate.addError(error, stack);
            },
          );
    } else {
      _sub?.cancel();
      _sub = null;
    }
  }

  void _retryInbox() {
    _sub?.cancel();
    _sub = null;
    _listening = null;
    _syncListen(true);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _gate.close();
    _search.dispose();
    super.dispose();
  }

  bool _canSwipe(ChatConversation chat) => !chat.isDefaultAgentGroup;

  Future<void> _togglePin(ChatConversation chat) async {
    final l10n = context.l10n;
    final pinned = chat.isPinnedFor(widget.profile.uid);
    PulseHaptics.selection();
    try {
      await _repo.setPinned(
        chatId: chat.id,
        uid: widget.profile.uid,
        pinned: !pinned,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(pinned ? l10n.chatUnpinned : l10n.chatPinned)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyChatError(error, l10n))));
    }
  }

  Future<void> _confirmDelete(ChatConversation chat) async {
    final l10n = context.l10n;
    PulseHaptics.medium();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(l10n.chatDeleteConfirmTitle),
          content: Text(l10n.chatDeleteConfirmBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.chatDeleteCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.chatDeleteConfirmAction),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !mounted) return;
    try {
      await _repo.hideChatForMe(chatId: chat.id, uid: widget.profile.uid);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.chatDeleted)));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(friendlyChatError(error, l10n))));
    }
  }

  @override
  Widget build(BuildContext context) {
    _syncListen(TickerMode.valuesOf(context).enabled);
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final profile = widget.profile;
    final canChat = canParticipateInChats(
      roleOrPermissions: AccessScope.accessOf(
        context,
        fallbackRoleId: profile.roleId,
      ),
      isAnonymous: profile.isAnonymous,
    );
    final split = pulseUseMasterDetail(context);
    final dense = PulseWindowClass.of(context).useRail;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.chatsTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
          if (canChat)
            IconButton(
              tooltip: l10n.peopleTitle,
              onPressed: () {
                PulseHaptics.light();
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ChatPeopleScreen(
                      profile: profile,
                      chatRepository: _repo,
                      userRepository: _users,
                      socialRepository: widget.socialRepository,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.people_alt_outlined),
            ),
          if (canManageChatGroups(
            AccessScope.accessOf(context, fallbackRoleId: profile.roleId),
          ))
            IconButton(
              tooltip: l10n.chatManageGroupsTitle,
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ChatManageGroupsScreen(
                      profile: profile,
                      chatRepository: _repo,
                      userRepository: _users,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.admin_panel_settings_outlined),
            ),
          if (widget.onOpenNotifications != null)
            NotificationBellButton(
              unreadCount: widget.notificationUnread,
              onPressed: widget.onOpenNotifications!,
            ),
        ],
      ),
      floatingActionButton: canChat && widget.showFab
          ? FloatingActionButton(
              heroTag: 'fab-chats-new',
              onPressed: () {
                PulseHaptics.light();
                openNewChat(
                  context,
                  profile: profile,
                  chatRepository: _repo,
                  userRepository: _users,
                );
              },
              tooltip: l10n.fabNewChat,
              child: const Icon(Icons.chat_rounded),
            )
          : null,
      body: _wrapInbox(
        context,
        split: split,
        profile: profile,
        inbox: !canChat
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Text(
                    l10n.chatsGuestPrompt,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colors.muted,
                      height: 1.4,
                    ),
                  ),
                ),
              )
            : StreamBuilder<List<ChatConversation>>(
                stream: _gate.stream,
                initialData: _latest,
                builder: (context, snapshot) {
                  Widget child;
                  if (snapshot.hasError) {
                    child = Center(
                      key: const ValueKey('error'),
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              friendlyChatError(snapshot.error!, l10n),
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: colors.muted,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            FilledButton.tonalIcon(
                              onPressed: _retryInbox,
                              icon: const Icon(Icons.refresh_rounded),
                              label: Text(l10n.actionRetry),
                            ),
                          ],
                        ),
                      ),
                    );
                  } else if (!snapshot.hasData) {
                    child = const PulseChatListSkeleton(
                      key: ValueKey('loading'),
                    );
                  } else {
                    final chats = snapshot.data!;
                    if (chats.isEmpty) {
                      child = Center(
                        key: const ValueKey('empty'),
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                l10n.chatsEmptyTitle,
                                style: theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                l10n.chatsEmptySubtitle,
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: colors.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    } else {
                      child = _InboxList(
                        key: const ValueKey('list'),
                        chats: chats,
                        profile: profile,
                        dense: dense,
                        selectedId: _selectedChat?.id,
                        search: _search,
                        filter: _filter,
                        onFilter: (next) => setState(() => _filter = next),
                        onSearch: (_) => setState(() {}),
                        onSelect: selectConversation,
                        onPin: _togglePin,
                        onDelete: _confirmDelete,
                        canSwipe: _canSwipe,
                      );
                    }
                  }

                  return AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: child,
                  );
                },
              ),
      ),
    );
  }

  Widget _wrapInbox(
    BuildContext context, {
    required bool split,
    required UserProfile profile,
    required Widget inbox,
  }) {
    if (!split) return inbox;
    final l10n = context.l10n;
    return PulseSplitView(
      masterWidth: PulseContentWidth.inbox,
      master: inbox,
      detail: _selectedChat == null
          ? EmptyState(
              mark: 'C',
              title: l10n.chatsSelectTitle,
              subtitle: l10n.chatsSelectSubtitle,
            )
          : ChatConversationScreen(
              key: ValueKey(_selectedChat!.id),
              chat: _selectedChat!,
              profile: profile,
              chatRepository: _repo,
              embedded: true,
            ),
    );
  }
}

class _InboxList extends StatelessWidget {
  const _InboxList({
    super.key,
    required this.chats,
    required this.profile,
    required this.dense,
    required this.selectedId,
    required this.search,
    required this.filter,
    required this.onFilter,
    required this.onSearch,
    required this.onSelect,
    required this.onPin,
    required this.onDelete,
    required this.canSwipe,
  });

  final List<ChatConversation> chats;
  final UserProfile profile;
  final bool dense;
  final String? selectedId;
  final TextEditingController search;
  final ChatInboxFilter filter;
  final ValueChanged<ChatInboxFilter> onFilter;
  final ValueChanged<String> onSearch;
  final ValueChanged<ChatConversation> onSelect;
  final ValueChanged<ChatConversation> onPin;
  final ValueChanged<ChatConversation> onDelete;
  final bool Function(ChatConversation) canSwipe;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final uid = profile.uid;
    final query = search.text;
    bool matches(ChatConversation chat) {
      final title = chat.titleFor(uid, l10n: l10n);
      return chatMatchesInboxFilter(chat, filter, uid) &&
          chatMatchesInboxQuery(chat, query, uid, title: title);
    }

    final sections = partitionChatInbox(chats, uid);
    final community = sections.community.where(matches).toList();
    final pinned = sections.pinned.where(matches).toList();
    final recent = sections.recent.where(matches).toList();
    final empty = community.isEmpty && pinned.isEmpty && recent.isEmpty;

    return ListView(
      padding: EdgeInsets.fromLTRB(
        dense ? AppSpacing.sm : AppSpacing.md,
        AppSpacing.sm,
        dense ? AppSpacing.sm : AppSpacing.md,
        pulseShellListBottomPad(context, hasFab: true),
      ),
      children: [
        ChatInboxSearchBar(controller: search, onChanged: onSearch),
        const SizedBox(height: 10),
        ChatInboxFilterChips(value: filter, onChanged: onFilter),
        const SizedBox(height: 14),
        if (empty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Text(
              l10n.chatsInboxFilterEmpty,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.of(context).muted,
              ),
            ),
          )
        else ...[
          for (final chat in community) ...[
            ChatCommunityHero(
              chat: chat,
              viewerUid: uid,
              selected: selectedId == chat.id,
              onTap: () => onSelect(chat),
            ),
            const SizedBox(height: 16),
          ],
          if (pinned.isNotEmpty) ...[
            ChatPinnedRail(
              chats: pinned,
              viewerUid: uid,
              selectedId: selectedId,
              onTap: onSelect,
            ),
            const SizedBox(height: 8),
          ],
          if (recent.isNotEmpty) ...[
            Text(
              l10n.chatsSectionRecent.toUpperCase(),
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: AppColors.of(context).muted,
                fontSize: 11,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            for (final chat in recent)
              ChatInboxRow(
                key: ValueKey(chat.id),
                chat: chat,
                viewerUid: uid,
                selected: selectedId == chat.id,
                dense: dense,
                swipeEnabled: canSwipe(chat),
                onTap: () => onSelect(chat),
                onPin: () => onPin(chat),
                onDelete: () => onDelete(chat),
              ),
          ],
        ],
      ],
    );
  }
}

void openNewChat(
  BuildContext context, {
  required UserProfile profile,
  ChatRepository? chatRepository,
  UserRepository? userRepository,
}) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ChatNewChatScreen(
        profile: profile,
        chatRepository: chatRepository,
        userRepository: userRepository ?? UserRepository(),
      ),
    ),
  );
}

void openNewGroup(
  BuildContext context, {
  required UserProfile profile,
  ChatRepository? chatRepository,
  UserRepository? userRepository,
}) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ChatNewGroupScreen(
        profile: profile,
        chatRepository: chatRepository,
        userRepository: userRepository ?? UserRepository(),
      ),
    ),
  );
}

void openChat(
  BuildContext context, {
  required ChatConversation chat,
  required UserProfile profile,
  required ChatRepository chatRepository,
}) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ChatConversationScreen(
        chat: chat,
        profile: profile,
        chatRepository: chatRepository,
      ),
    ),
  );
}
