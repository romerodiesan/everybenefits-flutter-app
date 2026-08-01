import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import '../../users/user_role.dart';
import 'chat_conversation_screen.dart';
import 'chat_default_group_callable.dart';
import 'chat_models.dart';
import 'chat_new_chat_screen.dart';
import 'chat_new_group_screen.dart';
import 'chat_repository.dart';
import '../notifications/notification_bell_button.dart';
import 'widgets/chat_avatar.dart';

/// Chat inbox backed by [ChatRepository].
class ChatsScreen extends StatefulWidget {
  const ChatsScreen({
    super.key,
    required this.profile,
    required this.chatRepository,
    this.userRepository,
    this.showFab = true,
    this.notificationUnread = 0,
    this.onOpenNotifications,
  });

  final UserProfile profile;
  final ChatRepository chatRepository;
  final UserRepository? userRepository;

  /// When false, the shell owns the FAB.
  final bool showFab;
  final int notificationUnread;
  final VoidCallback? onOpenNotifications;

  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  late final ChatRepository _repo =
      widget.chatRepository;
  final _gate = StreamController<List<ChatConversation>>.broadcast();
  StreamSubscription<List<ChatConversation>>? _sub;
  List<ChatConversation>? _latest;
  bool? _listening;
  bool _defaultJoinAttempted = false;

  @override
  void initState() {
    super.initState();
    _maybeJoinDefaultAgentGroup();
  }

  Future<void> _maybeJoinDefaultAgentGroup() async {
    if (_defaultJoinAttempted) return;
    if (!belongsInDefaultAgentGroup(widget.profile.role)) return;
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
      _sub = _repo.watchChats(widget.profile.uid).listen(
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

  @override
  void dispose() {
    _sub?.cancel();
    _gate.close();
    super.dispose();
  }

  bool _canSwipe(ChatConversation chat) =>
      !chat.isSupportChat && !chat.isDefaultAgentGroup;

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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, l10n))),
      );
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
      await _repo.hideChatForMe(
        chatId: chat.id,
        uid: widget.profile.uid,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.chatDeleted)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, l10n))),
      );
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
      role: profile.role,
      isAnonymous: profile.isAnonymous,
    );

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.chatsTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
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
                  userRepository: widget.userRepository ?? UserRepository(),
                );
              },
              tooltip: l10n.fabNewChat,
              child: const Icon(Icons.chat_rounded),
            )
          : null,
      body: !canChat
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
                      child: Text(
                        friendlyChatError(snapshot.error!, l10n),
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: colors.muted,
                        ),
                      ),
                    ),
                  );
                } else if (!snapshot.hasData) {
                  child = const PulseChatListSkeleton(key: ValueKey('loading'));
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
                    final sections =
                        partitionChatInbox(chats, profile.uid);
                    child = ListView.builder(
                      key: const ValueKey('list'),
                      padding: EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        AppSpacing.sm,
                        AppSpacing.md,
                        pulseShellListBottomPad(context, hasFab: true),
                      ),
                      itemCount: _inboxItemCount(sections),
                      itemBuilder: (context, index) {
                        return _inboxItem(
                          context,
                          l10n,
                          index: index,
                          sections: sections,
                          profile: profile,
                        );
                      },
                    );
                  }
                }

                return AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child: child,
                );
              },
            ),
    );
  }

  int _inboxItemCount(ChatInboxSections sections) {
    if (sections.support.isEmpty &&
        sections.community.isEmpty &&
        sections.pinned.isEmpty) {
      return sections.recent.length;
    }
    var count = 0;
    if (sections.support.isNotEmpty) {
      count += 1 + sections.support.length;
    }
    if (sections.community.isNotEmpty) {
      count += 1 + sections.community.length;
    }
    if (sections.pinned.isNotEmpty) {
      count += 1 + sections.pinned.length;
    }
    if (sections.recent.isNotEmpty) {
      count += 1 + sections.recent.length;
    }
    return count;
  }

  Widget _inboxItem(
    BuildContext context,
    AppLocalizations l10n, {
    required int index,
    required ChatInboxSections sections,
    required UserProfile profile,
  }) {
    Widget row(ChatConversation chat, {String? keyPrefix}) {
      return Padding(
        key: ValueKey('${keyPrefix ?? ''}${chat.id}'),
        padding: const EdgeInsets.only(bottom: 8),
        child: _ChatRow(
          chat: chat,
          viewerUid: profile.uid,
          swipeEnabled: _canSwipe(chat),
          onTap: () => openChat(
            context,
            chat: chat,
            profile: profile,
            chatRepository: _repo,
          ),
          onPin: () => _togglePin(chat),
          onDelete: () => _confirmDelete(chat),
        ),
      );
    }

    if (sections.support.isEmpty &&
        sections.community.isEmpty &&
        sections.pinned.isEmpty) {
      return row(sections.recent[index]);
    }

    var cursor = 0;
    if (sections.support.isNotEmpty) {
      if (index == cursor) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _SectionLabel(label: l10n.chatsSectionSupport),
        );
      }
      cursor += 1;
      if (index < cursor + sections.support.length) {
        return row(
          sections.support[index - cursor],
          keyPrefix: 'support-',
        );
      }
      cursor += sections.support.length;
    }

    if (sections.community.isNotEmpty) {
      if (index == cursor) {
        return Padding(
          padding: EdgeInsets.only(
            top: sections.support.isEmpty ? 0 : 8,
            bottom: 8,
          ),
          child: _SectionLabel(label: l10n.chatsSectionCommunity),
        );
      }
      cursor += 1;
      if (index < cursor + sections.community.length) {
        return row(
          sections.community[index - cursor],
          keyPrefix: 'community-',
        );
      }
      cursor += sections.community.length;
    }

    if (sections.pinned.isNotEmpty) {
      if (index == cursor) {
        return Padding(
          padding: EdgeInsets.only(
            top: sections.support.isEmpty && sections.community.isEmpty
                ? 0
                : 8,
            bottom: 8,
          ),
          child: _SectionLabel(label: l10n.chatsSectionPinned),
        );
      }
      cursor += 1;
      if (index < cursor + sections.pinned.length) {
        return row(
          sections.pinned[index - cursor],
          keyPrefix: 'pin-',
        );
      }
      cursor += sections.pinned.length;
    }

    if (sections.recent.isNotEmpty) {
      if (index == cursor) {
        return Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 8),
          child: _SectionLabel(label: l10n.chatsSectionRecent),
        );
      }
      cursor += 1;
      return row(sections.recent[index - cursor]);
    }

    return const SizedBox.shrink();
  }
}

void openNewChat(
  BuildContext context, {
  required UserProfile profile,
  required ChatRepository chatRepository,
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
  required ChatRepository chatRepository,
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: AppColors.of(context).muted,
            fontSize: 11,
            letterSpacing: 1.1,
            fontWeight: FontWeight.w800,
          ),
    );
  }
}

class _ChatRow extends StatelessWidget {
  const _ChatRow({
    required this.chat,
    required this.viewerUid,
    required this.onTap,
    required this.swipeEnabled,
    required this.onPin,
    required this.onDelete,
  });

  final ChatConversation chat;
  final String viewerUid;
  final VoidCallback onTap;
  final bool swipeEnabled;
  final VoidCallback onPin;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final unread = chat.unreadFor(viewerUid);
    final hasUnread = unread > 0;
    final pinned = chat.isPinnedFor(viewerUid);
    final title = chat.titleFor(viewerUid, l10n: l10n);
    final preview = chat.isSupportChat
        ? (chat.lastMessage.isEmpty
            ? l10n.chatsSupportBadge
            : chat.lastMessage)
        : chat.isDefaultAgentGroup && chat.lastMessage.isEmpty
            ? l10n.chatsDefaultGroupBadge
            : (chat.lastMessage.isEmpty
                ? l10n.chatsNoMessagesYet
                : chat.lastMessage);

    final tile = Material(
      color: colors.sheet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
          child: Row(
            children: [
              ChatAvatar(
                initials: chat.initialsFor(viewerUid, l10n: l10n),
                isGroup: chat.isGroup,
                size: 50,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (pinned) ...[
                          Icon(
                            Icons.push_pin_rounded,
                            size: 13,
                            color: colors.muted,
                          ),
                          const SizedBox(width: 4),
                        ],
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: hasUnread
                                  ? FontWeight.w800
                                  : FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatChatTime(chat.lastMessageAt, l10n),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: hasUnread ? brand : colors.muted,
                            fontSize: 11.5,
                            fontWeight:
                                hasUnread ? FontWeight.w800 : FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: hasUnread
                                  ? colors.ink.withValues(alpha: 0.78)
                                  : colors.muted,
                              fontWeight:
                                  hasUnread ? FontWeight.w600 : FontWeight.w500,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                        if (hasUnread) ...[
                          const SizedBox(width: 8),
                          Container(
                            constraints: const BoxConstraints(minWidth: 22),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: brand,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$unread',
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: AppColors.onBrandOf(context),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (!swipeEnabled) return tile;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Slidable(
        key: ValueKey('slide-${chat.id}'),
        startActionPane: ActionPane(
          motion: const DrawerMotion(),
          extentRatio: 0.28,
          children: [
            CustomSlidableAction(
              onPressed: (_) => onPin(),
              backgroundColor: brand,
              foregroundColor: AppColors.onBrandOf(context),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    pinned ? Icons.push_pin_outlined : Icons.push_pin_rounded,
                    size: 22,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    pinned ? l10n.chatUnpin : l10n.chatPin,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        endActionPane: ActionPane(
          motion: const DrawerMotion(),
          extentRatio: 0.28,
          children: [
            CustomSlidableAction(
              onPressed: (_) => onDelete(),
              backgroundColor: const Color(0xFFB42318),
              foregroundColor: Colors.white,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.delete_outline_rounded, size: 22),
                  const SizedBox(height: 4),
                  Text(
                    l10n.chatDelete,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        child: tile,
      ),
    );
  }
}
