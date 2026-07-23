import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import 'chat_conversation_screen.dart';
import 'chat_models.dart';
import 'chat_new_chat_screen.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

/// Chat inbox backed by [ChatRepository].
class ChatsScreen extends StatefulWidget {
  const ChatsScreen({
    super.key,
    required this.profile,
    this.chatRepository,
    this.userRepository,
    this.showFab = true,
  });

  final UserProfile profile;
  final ChatRepository? chatRepository;
  final UserRepository? userRepository;

  /// When false, the shell owns the FAB.
  final bool showFab;

  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  late final ChatRepository _repo =
      widget.chatRepository ?? ChatRepository();
  late final Stream<List<ChatConversation>> _source =
      _repo.watchChats(widget.profile.uid);
  final _gate = StreamController<List<ChatConversation>>.broadcast();
  StreamSubscription<List<ChatConversation>>? _sub;
  List<ChatConversation>? _latest;
  bool? _listening;

  void _syncListen(bool shouldListen) {
    if (_listening == shouldListen) return;
    _listening = shouldListen;
    if (shouldListen) {
      _sub = _source.listen(
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

  @override
  Widget build(BuildContext context) {
    _syncListen(TickerMode.valuesOf(context).enabled);
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final profile = widget.profile;
    final canChat = canParticipateInChats(
      role: profile.role,
      isAnonymous: profile.isAnonymous,
    );

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          'Chats',
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
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
              tooltip: 'Nuevo chat',
              child: const Icon(Icons.chat_rounded),
            )
          : null,
      body: !canChat
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text(
                  'Regístrate con una cuenta para enviar y recibir mensajes.',
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
                        friendlyChatError(snapshot.error!),
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
                              'Aún no tienes chats',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Toca + para escribirle a un compañero.',
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
                    final pinned =
                        chats.where((c) => c.isPinnedFor(profile.uid)).toList();
                    final rest = chats
                        .where((c) => !c.isPinnedFor(profile.uid))
                        .toList();
                    child = ListView.builder(
                      key: const ValueKey('list'),
                      padding: EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        AppSpacing.sm,
                        AppSpacing.md,
                        pulseShellListBottomPad(context, hasFab: true),
                      ),
                      itemCount: _inboxItemCount(pinned, rest),
                      itemBuilder: (context, index) {
                        return _inboxItem(
                          context,
                          index: index,
                          pinned: pinned,
                          rest: rest,
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

  int _inboxItemCount(List<ChatConversation> pinned, List<ChatConversation> rest) {
    if (pinned.isEmpty) return rest.length;
    // section + gap + pinned rows + gap + section + gap + rest
    return 1 + pinned.length + 1 + rest.length;
  }

  Widget _inboxItem(
    BuildContext context, {
    required int index,
    required List<ChatConversation> pinned,
    required List<ChatConversation> rest,
    required UserProfile profile,
  }) {
    if (pinned.isEmpty) {
      final chat = rest[index];
      return Padding(
        key: ValueKey(chat.id),
        padding: const EdgeInsets.only(bottom: 8),
        child: _ChatRow(
          chat: chat,
          viewerUid: profile.uid,
          onTap: () => openChat(
            context,
            chat: chat,
            profile: profile,
            chatRepository: _repo,
          ),
        ),
      );
    }

    if (index == 0) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 8),
        child: _SectionLabel(label: 'Fijados'),
      );
    }
    if (index <= pinned.length) {
      final chat = pinned[index - 1];
      return Padding(
        key: ValueKey('pin-${chat.id}'),
        padding: const EdgeInsets.only(bottom: 8),
        child: _ChatRow(
          chat: chat,
          viewerUid: profile.uid,
          onTap: () => openChat(
            context,
            chat: chat,
            profile: profile,
            chatRepository: _repo,
          ),
        ),
      );
    }
    if (index == pinned.length + 1) {
      return const Padding(
        padding: EdgeInsets.only(top: 8, bottom: 8),
        child: _SectionLabel(label: 'Recientes'),
      );
    }
    final chat = rest[index - pinned.length - 2];
    return Padding(
      key: ValueKey(chat.id),
      padding: const EdgeInsets.only(bottom: 8),
      child: _ChatRow(
        chat: chat,
        viewerUid: profile.uid,
        onTap: () => openChat(
          context,
          chat: chat,
          profile: profile,
          chatRepository: _repo,
        ),
      ),
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
  });

  final ChatConversation chat;
  final String viewerUid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final unread = chat.unreadFor(viewerUid);
    final hasUnread = unread > 0;
    final title = chat.titleFor(viewerUid);
    final preview = chat.lastMessage.isEmpty
        ? 'Sin mensajes todavía'
        : chat.lastMessage;

    return Material(
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
                initials: chat.initialsFor(viewerUid),
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
                        if (chat.isPinnedFor(viewerUid)) ...[
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
                          formatChatTime(chat.lastMessageAt),
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
  }
}
