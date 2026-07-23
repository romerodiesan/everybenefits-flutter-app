import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import 'chat_conversation_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatNewChatScreen extends StatefulWidget {
  const ChatNewChatScreen({
    super.key,
    required this.profile,
    this.chatRepository,
    this.userRepository,
  });

  final UserProfile profile;
  final ChatRepository? chatRepository;
  final UserRepository? userRepository;

  @override
  State<ChatNewChatScreen> createState() => _ChatNewChatScreenState();
}

class _ChatNewChatScreenState extends State<ChatNewChatScreen> {
  late final Future<List<UserProfile>> _contactsFuture;
  late final ChatRepository _chatRepo =
      widget.chatRepository ?? ChatRepository();
  late final UserRepository _users =
      widget.userRepository ?? UserRepository();
  String? _openingUid;

  @override
  void initState() {
    super.initState();
    _contactsFuture = _users.listDirectory(excludeUid: widget.profile.uid);
  }

  Future<void> _openDm(UserProfile other) async {
    if (_openingUid != null) return;
    setState(() => _openingUid = other.uid);
    try {
      final chat = await _chatRepo.getOrCreateDm(
        me: widget.profile,
        other: other,
      );
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ChatConversationScreen(
            chat: chat,
            profile: widget.profile,
            chatRepository: _chatRepo,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
      setState(() => _openingUid = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.newChatTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: FutureBuilder<List<UserProfile>>(
        future: _contactsFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text(
                  friendlyChatError(snapshot.error!, l10n),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.muted,
                  ),
                ),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const PulseContactListSkeleton();
          }

          final contacts = snapshot.data!;
          if (contacts.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text(
                  l10n.newChatEmpty,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: colors.muted,
                    height: 1.4,
                  ),
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xl,
            ),
            children: [
              Text(
                l10n.newChatContactsHeader,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colors.muted,
                  fontSize: 11,
                  letterSpacing: 1.1,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              for (final person in contacts) ...[
                Material(
                  color: colors.sheet,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: BorderSide(color: colors.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: _openingUid == null ? () => _openDm(person) : null,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                      child: Row(
                        children: [
                          ChatAvatar(
                            initials: chatInitials(person.headlineName),
                            size: 46,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  person.headlineName,
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                if (person.agency?.trim().isNotEmpty ==
                                    true) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    person.agency!,
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: colors.muted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (_openingUid == person.uid)
                            const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            Icon(
                              Icons.chevron_right_rounded,
                              color: colors.muted.withValues(alpha: 0.7),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      ),
    );
  }
}
