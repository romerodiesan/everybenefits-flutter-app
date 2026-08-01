import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../users/avatar_storage.dart';

/// Compact circular avatar for forum feed rows and posts.
class ForumAvatar extends StatelessWidget {
  const ForumAvatar({
    super.key,
    required this.name,
    this.photoUrl,
    this.size = 40,
  });

  final String name;
  final String? photoUrl;
  final double size;

  String get _initials {
    final source = name.trim().isNotEmpty ? name.trim() : 'U';
    return source.substring(0, 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final resolved = sanitizeOptionalAvatarDownloadUrl(photoUrl);
    final initials = Text(
      _initials,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: AppColors.brandOf(context),
            fontSize: size * 0.38,
            fontWeight: FontWeight.w800,
          ),
    );

    return ClipOval(
      child: Container(
        width: size,
        height: size,
        color: colors.glassFill,
        foregroundDecoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: colors.glassBorder),
        ),
        alignment: Alignment.center,
        child: resolved == null
            ? initials
            : CachedNetworkImage(
                imageUrl: resolved,
                width: size,
                height: size,
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 120),
                errorWidget: (context, url, error) => initials,
                placeholder: (context, url) => initials,
              ),
      ),
    );
  }
}
