import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../users/user_profile.dart';
import 'forum_avatar.dart';

/// Quiet Q&A entry point — invites a clear question, not a social status.
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
    final brand = AppColors.brandOf(context);
    final name = profile.displayName?.trim().isNotEmpty == true
        ? profile.displayName!.trim()
        : (profile.email ?? 'Tú');

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.xs,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: PulseSheet(
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            ForumAvatar(
              name: name,
              photoUrl: profile.photoUrl,
              size: 42,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Haz una pregunta a la comunidad',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
                      color: colors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'NPN, productos, ventas… alguien ya pudo resolverlo.',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                      fontSize: 12.5,
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: brand.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.edit_note_rounded,
                size: 20,
                color: brand,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
