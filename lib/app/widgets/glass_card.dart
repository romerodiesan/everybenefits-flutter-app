import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme.dart';

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(18),
    this.borderRadius = 24,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Material(
            color: AppColors.glassFill,
            shape: RoundedRectangleBorder(
              borderRadius: radius,
              side: const BorderSide(color: AppColors.glassBorder),
            ),
            clipBehavior: Clip.antiAlias,
            child: onTap == null
                ? Padding(padding: padding, child: child)
                : InkWell(
                    onTap: onTap,
                    borderRadius: radius,
                    child: Padding(padding: padding, child: child),
                  ),
          ),
        ),
      ),
    );
  }
}
