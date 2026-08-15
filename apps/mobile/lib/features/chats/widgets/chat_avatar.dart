import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../users/avatar_storage.dart';
import '../chat_hue.dart';

/// Soft tinted avatar with optional group mark and profile photo.
class ChatAvatar extends StatelessWidget {
  const ChatAvatar({
    super.key,
    required this.initials,
    this.name = '',
    this.photoUrl,
    this.isGroup = false,
    this.size = 48,
  });

  final String initials;
  final String name;
  final String? photoUrl;
  final bool isGroup;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);
    final dark = theme.brightness == Brightness.dark;
    final seed = name.isNotEmpty ? name : initials;
    final fill = chatTintFill(seed, dark: dark);
    final stroke = chatTintStroke(seed, dark: dark);
    final resolved = sanitizeOptionalAvatarDownloadUrl(photoUrl);
    final letters = Text(
      initials,
      style: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w800,
        fontSize: size * 0.28,
        letterSpacing: 0.2,
        color: colors.ink,
      ),
    );

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  fill,
                  fill.withValues(alpha: 0.12),
                ],
              ),
              border: Border.all(color: stroke),
            ),
            alignment: Alignment.center,
            clipBehavior: Clip.antiAlias,
            child: resolved == null
                ? letters
                : CachedNetworkImage(
                    imageUrl: resolved,
                    width: size,
                    height: size,
                    fit: BoxFit.cover,
                    fadeInDuration: const Duration(milliseconds: 120),
                    errorWidget: (context, url, error) => letters,
                    placeholder: (context, url) => letters,
                  ),
          ),
          if (isGroup)
            Positioned(
              right: -1,
              bottom: -1,
              child: Container(
                width: size * 0.34,
                height: size * 0.34,
                decoration: BoxDecoration(
                  color: colors.sheet,
                  shape: BoxShape.circle,
                  border: Border.all(color: colors.border),
                ),
                child: Icon(
                  Icons.groups_rounded,
                  size: size * 0.2,
                  color: brand,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
