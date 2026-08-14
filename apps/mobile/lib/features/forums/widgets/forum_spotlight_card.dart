import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../app/widgets/role_badge.dart';
import '../../../l10n/l10n.dart';
import '../forum_models.dart';
import 'forum_avatar.dart';

/// Hero card for a thread that cleared the Spotlight reach bar.
class ForumSpotlightCard extends StatelessWidget {
  const ForumSpotlightCard({
    super.key,
    required this.thread,
    required this.onTap,
  });

  final ForumThread thread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final body = thread.body.trim().replaceAll(RegExp(r'\s+'), ' ');
    final comments = thread.replyCount == 0
        ? l10n.replyCountOther(0)
        : thread.replyCount == 1
            ? l10n.replyCountOne
            : l10n.replyCountOther(thread.replyCount);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: PulseSheet(
        onTap: onTap,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_awesome_rounded, size: 14, color: brand),
                const SizedBox(width: 6),
                Text(
                  l10n.forumsSpotlight.toUpperCase(),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: brand,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              thread.title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                height: 1.2,
                letterSpacing: -0.3,
              ),
            ),
            if (body.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                body,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.muted,
                  height: 1.4,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                ForumAvatar(
                  name: thread.authorName,
                  photoUrl: thread.authorPhotoUrl,
                  size: 22,
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    thread.authorName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: colors.muted,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                RoleBadge(
                  badge: thread.authorBadge,
                  dense: true,
                ),
                const SizedBox(width: 10),
                Text(
                  comments,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontSize: 12,
                    color: colors.muted,
                  ),
                ),
                const Spacer(),
                Text(
                  '${l10n.forumsJoinThread} →',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: brand,
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
