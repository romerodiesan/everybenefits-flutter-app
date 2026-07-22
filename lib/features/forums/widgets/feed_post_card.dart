import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/glass_card.dart';
import '../forum_models.dart';
import 'forum_avatar.dart';
import 'forum_meta_line.dart';
import 'forum_tag_wrap.dart';

/// Spaced social-feed card for a community thread.
class FeedPostCard extends StatelessWidget {
  const FeedPostCard({
    super.key,
    required this.thread,
    required this.onTap,
    this.onTagTap,
  });

  final ForumThread thread;
  final VoidCallback onTap;
  final ValueChanged<String>? onTagTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final body = thread.body.trim().replaceAll(RegExp(r'\s+'), ' ');
    final repliesLabel = thread.replyCount == 0
        ? 'Responder'
        : thread.replyCount == 1
            ? '1 respuesta'
            : '${thread.replyCount} respuestas';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: GlassCard(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ForumAvatar(
                  name: thread.authorName,
                  photoUrl: thread.authorPhotoUrl,
                  size: 48,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ForumMetaLine(
                    authorName: thread.authorName,
                    role: thread.authorRole,
                    at: thread.lastReplyAt,
                    social: true,
                    showRole: true,
                    dense: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              thread.title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                height: 1.25,
                letterSpacing: -0.3,
              ),
            ),
            if (body.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                body,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: colors.ink.withValues(alpha: 0.88),
                  height: 1.45,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
            if (thread.tags.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              ForumTagWrap(
                tags: thread.tags,
                maxVisible: 3,
                onTagTap: onTagTap,
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            Divider(height: 1, color: colors.glassBorder),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.chat_bubble_outline_rounded,
                  size: 18,
                  color: AppColors.accent.withValues(alpha: 0.9),
                ),
                const SizedBox(width: 6),
                Text(
                  repliesLabel,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
