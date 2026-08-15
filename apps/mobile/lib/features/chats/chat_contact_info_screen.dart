import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../profile/public_profile_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatContactInfoScreen extends StatefulWidget {
  const ChatContactInfoScreen({
    super.key,
    required this.chat,
    required this.profile,
    this.chatRepository,
  });

  final ChatConversation chat;
  final UserProfile profile;
  final ChatRepository? chatRepository;

  @override
  State<ChatContactInfoScreen> createState() => _ChatContactInfoScreenState();
}

class _ChatContactInfoScreenState extends State<ChatContactInfoScreen> {
  late final ChatRepository _repo =
      widget.chatRepository ?? ChatRepository();
  var _busy = false;

  Future<void> _togglePin(ChatConversation chat) async {
    if (_busy) return;
    PulseHaptics.selection();
    setState(() => _busy = true);
    try {
      final pinned = !chat.isPinnedFor(widget.profile.uid);
      await _repo.setPinned(
        chatId: chat.id,
        uid: widget.profile.uid,
        pinned: pinned,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final uid = widget.profile.uid;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.chatInfoTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: StreamBuilder<ChatConversation?>(
        stream: _repo.watchChat(widget.chat.id),
        initialData: widget.chat,
        builder: (context, snapshot) {
          final chat = snapshot.data ?? widget.chat;
          final pinned = chat.isPinnedFor(uid);

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Center(
                child: ChatAvatar(
                  initials: chat.initialsFor(uid, l10n: l10n),
                  name: chat.titleFor(uid, l10n: l10n),
                  photoUrl: chat.inboxPhotoUrl(uid),
                  isGroup: chat.isGroup,
                  size: 84,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                chat.titleFor(uid, l10n: l10n),
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                chat.isDefaultAgentGroup
                    ? l10n.chatsDefaultGroupBadge
                    : (chat.isGroup ? l10n.chatTypeGroup : l10n.chatTypePrivate),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
              ),
              const SizedBox(height: AppSpacing.xl),
              PulseSheet(
                child: Column(
                  children: [
                    for (final memberId in chat.memberIds)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: ChatAvatar(
                          initials: chatInitials(
                            chat.memberNames[memberId] ?? memberId,
                          ),
                          name: chat.memberNames[memberId] ?? memberId,
                          photoUrl: chat.photoOf(memberId),
                          size: 40,
                        ),
                        title: Text(chat.memberNames[memberId] ?? memberId),
                        subtitle: chat.memberUsernames[memberId] != null
                            ? Text('@${chat.memberUsernames[memberId]}')
                            : null,
                        onTap: memberId == uid
                            ? null
                            : () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => PublicProfileScreen(
                                      uid: memberId,
                                      viewer: widget.profile,
                                      chatRepository: _repo,
                                    ),
                                  ),
                                );
                              },
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              if (!chat.isDefaultAgentGroup)
                PulseSheet(
                  child: Column(
                    children: [
                      if (!chat.isGroup)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          Icons.person_outline_rounded,
                          color: colors.muted,
                        ),
                        title: Text(l10n.memberViewProfile),
                        onTap: () {
                          final other = chat.memberIds
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
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          pinned
                              ? Icons.push_pin_rounded
                              : Icons.push_pin_outlined,
                          color: colors.muted,
                        ),
                        title: Text(pinned ? l10n.chatUnpin : l10n.chatPin),
                        trailing: _busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : null,
                        onTap: _busy ? null : () => _togglePin(chat),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
