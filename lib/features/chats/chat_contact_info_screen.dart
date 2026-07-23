import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/user_profile.dart';
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
        SnackBar(content: Text(friendlyChatError(error))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final uid = widget.profile.uid;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          'Info',
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
                  initials: chat.initialsFor(uid),
                  isGroup: chat.isGroup,
                  size: 84,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                chat.titleFor(uid),
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                chat.isGroup ? 'Grupo' : 'Chat privado',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
              ),
              const SizedBox(height: AppSpacing.xl),
              PulseSheet(
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        pinned
                            ? Icons.push_pin_rounded
                            : Icons.push_pin_outlined,
                        color: colors.muted,
                      ),
                      title: Text(pinned ? 'Quitar de fijados' : 'Fijar chat'),
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
