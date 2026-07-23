import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_skeleton.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_profile.dart';
import '../../chats/chat_conversation_screen.dart';
import '../../chats/chat_models.dart';
import '../../chats/chat_repository.dart';
import '../forum_models.dart';
import '../forum_repository.dart';

SharedPostPreview sharedPostFromThread(ForumThread thread) {
  return SharedPostPreview(
    threadId: thread.id,
    title: thread.title,
    excerpt: _clip(thread.body, 120),
    authorName: thread.authorName,
    tags: thread.tags.take(2).toList(),
  );
}

String _clip(String text, int max) {
  final cleaned = text.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (cleaned.isEmpty) return '';
  if (cleaned.length <= max) return cleaned;
  return '${cleaned.substring(0, max - 1)}…';
}

Future<void> showShareToChatSheet({
  required BuildContext context,
  required ForumThread thread,
  required UserProfile profile,
  ForumRepository? forumRepository,
  ChatRepository? chatRepository,
}) {
  final colors = AppColors.of(context);
  final l10n = context.l10n;
  final shared = sharedPostFromThread(thread);
  final forumRepo = forumRepository ?? ForumRepository();
  final chatRepo = chatRepository ?? ChatRepository();

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: colors.sheet,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                l10n.shareToChatTitle,
                style: Theme.of(sheetContext).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text(
                l10n.shareToChatSubtitle,
                style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(
                      color: colors.muted,
                    ),
              ),
              const SizedBox(height: AppSpacing.md),
              IgnorePointer(
                child: SharedPostCard(preview: shared),
              ),
              const SizedBox(height: AppSpacing.md),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(sheetContext).height * 0.42,
                ),
                child: StreamBuilder<List<ChatConversation>>(
                  stream: chatRepo.watchChats(profile.uid),
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Text(
                          friendlyChatError(snapshot.error!, l10n),
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: colors.muted),
                        ),
                      );
                    }
                    if (!snapshot.hasData) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                        child: SizedBox(
                          height: 160,
                          child: PulseChatListSkeleton(itemCount: 3),
                        ),
                      );
                    }
                    final chats = snapshot.data!;
                    if (chats.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Text(
                          l10n.shareNoChats,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: colors.muted, height: 1.35),
                        ),
                      );
                    }
                    return ListView.separated(
                      shrinkWrap: true,
                      itemCount: chats.length,
                      separatorBuilder: (_, _) => Divider(
                        height: 1,
                        color: colors.border,
                      ),
                      itemBuilder: (context, index) {
                        final chat = chats[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: AppColors.brandOf(context)
                                .withValues(alpha: 0.18),
                            child: Text(
                              chat.initialsFor(profile.uid),
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                          title: Text(
                            chat.titleFor(profile.uid),
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          subtitle: Text(
                            chat.isGroup
                                ? l10n.chatTypeGroup
                                : l10n.chatTypePrivate,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: colors.muted),
                          ),
                          trailing: Icon(
                            chat.isGroup
                                ? Icons.groups_outlined
                                : Icons.person_outline_rounded,
                            color: colors.muted,
                          ),
                          onTap: () async {
                            Navigator.of(sheetContext).pop();
                            try {
                              await chatRepo.sharePost(
                                chatId: chat.id,
                                author: profile,
                                preview: shared,
                              );
                              if (!context.mounted) return;
                              await Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => ChatConversationScreen(
                                    chat: chat,
                                    profile: profile,
                                    chatRepository: chatRepo,
                                    forumRepository: forumRepo,
                                  ),
                                ),
                              );
                            } catch (error) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    friendlyChatError(error, l10n),
                                  ),
                                ),
                              );
                            }
                          },
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

/// Quiet, tappable post preview used inside chat bubbles / share sheet.
class SharedPostCard extends StatelessWidget {
  const SharedPostCard({
    super.key,
    required this.preview,
    this.onTap,
    this.compact = false,
  });

  final SharedPostPreview preview;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    return Material(
      color: colors.glassFill,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 3, color: brand.withValues(alpha: 0.55)),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    10,
                    compact ? 8 : 10,
                    10,
                    compact ? 8 : 10,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.help_outline_rounded,
                            size: 13,
                            color: colors.muted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              preview.authorName == null
                                  ? l10n.sharedPostLabel
                                  : l10n.sharedPostLabelAuthor(
                                      preview.authorName!,
                                    ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colors.muted,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                                letterSpacing: 0.15,
                              ),
                            ),
                          ),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: colors.muted.withValues(alpha: 0.7),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        preview.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          height: 1.25,
                          letterSpacing: -0.15,
                          fontSize: 13.5,
                          color: colors.ink,
                        ),
                      ),
                      if (preview.excerpt.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          preview.excerpt,
                          maxLines: compact ? 1 : 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.muted,
                            height: 1.3,
                            fontSize: 12,
                          ),
                        ),
                      ],
                      if (preview.tags.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          preview.tags.map((t) => '#$t').join('  '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: brand.withValues(alpha: 0.85),
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
