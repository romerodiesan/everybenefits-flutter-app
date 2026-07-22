import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/glass_card.dart';
import '../../../users/user_profile.dart';
import 'forum_avatar.dart';

/// Facebook/X-style "What's on your mind?" composer strip.
class FeedComposerBar extends StatelessWidget {
  const FeedComposerBar({
    super.key,
    required this.profile,
    required this.onTap,
  });

  final UserProfile profile;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final name = profile.displayName?.trim().isNotEmpty == true
        ? profile.displayName!.trim()
        : (profile.email ?? 'Tú');

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: GlassCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            ForumAvatar(
              name: name,
              photoUrl: profile.photoUrl,
              size: 40,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                '¿Qué estás pensando?',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: colors.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(
              Icons.edit_outlined,
              size: 18,
              color: AppColors.accent.withValues(alpha: 0.9),
            ),
          ],
        ),
      ),
    );
  }
}
