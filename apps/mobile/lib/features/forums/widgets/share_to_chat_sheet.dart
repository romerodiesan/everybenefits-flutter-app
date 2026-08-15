import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/layout/pulse_adaptive_sheet.dart';
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

  return showPulseSheet<void>(
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

/// Editorial shared-question card (not a speech bubble).
class SharedPostCard extends StatelessWidget {
  const SharedPostCard({
    super.key,
    required this.preview,
    this.onTap,
    this.onLongPress,
    this.compact = false,
    this.time,
  });

  final SharedPostPreview preview;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool compact;
  final String? time;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final eyebrow = preview.authorName == null
        ? l10n.sharedPostLabel
        : l10n.sharedPostLabelAuthor(preview.authorName!);

    return Material(
      color: colors.sheet,
      elevation: 0,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: 4,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [brand, brand.withValues(alpha: 0.2)],
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                compact ? 12 : 16,
                compact ? 10 : 14,
                compact ? 12 : 16,
                compact ? 10 : 14,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    eyebrow.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: brand,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    preview.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                      letterSpacing: -0.3,
                      fontSize: compact ? 14.5 : 16,
                      color: colors.ink,
                    ),
                  ),
                  if (preview.excerpt.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      preview.excerpt,
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                        height: 1.4,
                        fontSize: compact ? 12 : 13.5,
                      ),
                    ),
                  ],
                  if (preview.tags.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final tag in preview.tags.take(3))
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: brand.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '#$tag',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: brand,
                                fontWeight: FontWeight.w800,
                                fontSize: 10.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                  if (time != null) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        time!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.muted,
                          fontSize: 10.5,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
