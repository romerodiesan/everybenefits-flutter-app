import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../users/avatar_storage.dart';
import '../../../users/user_profile.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.profile,
    this.size = 112,
    this.onTap,
    this.busy = false,
    this.showEditBadge = false,
  });

  final UserProfile profile;
  final double size;
  final VoidCallback? onTap;
  final bool busy;
  final bool showEditBadge;

  @override
  Widget build(BuildContext context) {
    final photoUrl = sanitizeOptionalAvatarDownloadUrl(profile.photoUrl);
    final initials = Text(
      profile.initials,
      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: AppColors.brandOf(context),
            fontSize: size * 0.38,
          ),
    );
    final avatar = ClipOval(
      child: Container(
        width: size,
        height: size,
        color: AppColors.of(context).glassFill,
        foregroundDecoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.of(context).glassBorder,
            width: 1.5,
          ),
        ),
        alignment: Alignment.center,
        child: photoUrl == null
            ? initials
            : CachedNetworkImage(
                imageUrl: photoUrl,
                width: size,
                height: size,
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 120),
                errorWidget: (context, url, error) => initials,
                placeholder: (context, url) => initials,
              ),
      ),
    );

    final content = Stack(
      clipBehavior: Clip.none,
      children: [
        avatar,
        if (busy)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          ),
        if (showEditBadge && !busy)
          Positioned(
            right: 2,
            bottom: 2,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.brandOf(context),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.of(context).meshBase, width: 2),
              ),
              child: Icon(
                Icons.camera_alt_rounded,
                size: 16,
                color: onBrandFor(AppColors.brandOf(context)),
              ),
            ),
          ),
      ],
    );

    if (onTap == null) return content;
    return GestureDetector(onTap: busy ? null : onTap, child: content);
  }
}
