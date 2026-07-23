import 'package:flutter/material.dart';

import '../../../app/theme.dart';

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
    final hasPhoto = photoUrl != null && photoUrl!.trim().isNotEmpty;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.glassFill,
        border: Border.all(color: colors.glassBorder),
        image: hasPhoto
            ? DecorationImage(
                image: ResizeImage(
                  NetworkImage(photoUrl!),
                  width: (size * MediaQuery.devicePixelRatioOf(context))
                      .round()
                      .clamp(48, 256),
                ),
                fit: BoxFit.cover,
              )
            : null,
      ),
      alignment: Alignment.center,
      child: hasPhoto
          ? null
          : Text(
              _initials,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.brandOf(context),
                    fontSize: size * 0.38,
                    fontWeight: FontWeight.w800,
                  ),
            ),
    );
  }
}
