import 'package:flutter/material.dart';

import '../../../app/theme.dart';
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
    final photoUrl = profile.photoUrl;
    final avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.of(context).glassFill,
        border: Border.all(color: AppColors.of(context).glassBorder, width: 1.5),
        image: photoUrl == null
            ? null
            : DecorationImage(
                image: NetworkImage(photoUrl),
                fit: BoxFit.cover,
              ),
      ),
      alignment: Alignment.center,
      child: photoUrl == null
          ? Text(
              profile.initials,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppColors.accent,
                    fontSize: size * 0.38,
                  ),
            )
          : null,
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
                color: AppColors.accent,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.of(context).meshBase, width: 2),
              ),
              child: const Icon(
                Icons.camera_alt_rounded,
                size: 16,
                color: Color(0xFF04110C),
              ),
            ),
          ),
      ],
    );

    if (onTap == null) return content;
    return GestureDetector(onTap: busy ? null : onTap, child: content);
  }
}
