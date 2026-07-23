import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../forum_models.dart';
import 'forum_avatar.dart';
import 'forum_meta_line.dart';
import 'forum_tag_wrap.dart';
import 'relevance_controls.dart';

/// Minimal social-feed card: author, body, tags, relevance / comment / share.
class FeedPostCard extends StatelessWidget {
  const FeedPostCard({
    super.key,
    required this.thread,
    required this.onTap,
    this.onComment,
    this.onTagTap,
    this.onShare,
    this.onRelevance,
  });

  final ForumThread thread;
  final VoidCallback onTap;
  final VoidCallback? onComment;
  final ValueChanged<String>? onTagTap;
  final VoidCallback? onShare;
  final VoidCallback? onRelevance;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final body = thread.body.trim().replaceAll(RegExp(r'\s+'), ' ');
    final commentsLabel = thread.replyCount == 0
        ? l10n.actionReply
        : thread.replyCount == 1
            ? l10n.replyCountOne
            : l10n.replyCountOther(thread.replyCount);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: PulseSheet(
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
                  size: 44,
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
                if (thread.score != 0)
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text(
                      thread.score > 0
                          ? '+${thread.score}'
                          : '${thread.score}',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: AppColors.brandOf(context),
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
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
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: colors.ink.withValues(alpha: 0.88),
                  height: 1.45,
                  fontSize: 15,
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
            Divider(height: 1, color: colors.border),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: RelevanceScoreChip(
                    score: thread.score,
                    onTap: onRelevance ?? onTap,
                  ),
                ),
                _Action(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: commentsLabel,
                  onTap: onComment ?? onTap,
                ),
                _Action(
                  icon: Icons.forum_outlined,
                  label: l10n.actionShareChats,
                  onTap: onShare ?? () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: colors.muted),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: colors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
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
