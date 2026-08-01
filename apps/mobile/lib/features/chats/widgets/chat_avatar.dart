import 'package:flutter/material.dart';

import '../../../app/theme.dart';

/// Soft brand avatar with optional group mark.
class ChatAvatar extends StatelessWidget {
  const ChatAvatar({
    super.key,
    required this.initials,
    this.isGroup = false,
    this.size = 48,
  });

  final String initials;
  final bool isGroup;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);

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
                  brand.withValues(alpha: 0.22),
                  brand.withValues(alpha: 0.08),
                ],
              ),
              border: Border.all(color: colors.border),
            ),
            alignment: Alignment.center,
            child: Text(
              initials,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
                fontSize: size * 0.28,
                letterSpacing: 0.2,
                color: colors.ink,
              ),
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
