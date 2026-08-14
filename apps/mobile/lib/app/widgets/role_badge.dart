import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../users/profile_badge.dart';
import '../theme.dart';

/// Faceted glass sigil — inscription + gem, not a solid chip.
/// Only renders when an admin assigned [badge]; roles do not get a default.
class RoleBadge extends StatelessWidget {
  const RoleBadge({
    super.key,
    this.badge,
    this.dense = false,
  });

  final ProfileBadge? badge;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final custom = badge;
    if (custom == null) return const SizedBox.shrink();
    final color = custom.backgroundColor;
    final label = custom.text;
    final icon = badgeIconData(custom.icon);
    final gemInk = color.computeLuminance() > 0.58
        ? const Color(0xFF122018)
        : Colors.white;

    final facet = dense ? 11.0 : 15.0;
    final fontSize = dense ? 8.5 : 10.5;
    final pad = dense
        ? const EdgeInsets.fromLTRB(5, 4, 11, 4)
        : const EdgeInsets.fromLTRB(6, 5, 14, 5);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(3),
          topRight: Radius.circular(13),
          bottomRight: Radius.circular(3),
          bottomLeft: Radius.circular(13),
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.20),
            color.withValues(alpha: 0.03),
            AppColors.of(context).sheet.withValues(alpha: 0.35),
          ],
        ),
        border: Border.all(color: color.withValues(alpha: 0.48), width: 0.85),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.22),
            blurRadius: dense ? 6 : 12,
            spreadRadius: -2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: pad,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: facet,
              height: facet,
              child: Transform.rotate(
                angle: math.pi / 4,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(dense ? 1.6 : 2.4),
                    gradient: LinearGradient(
                      begin: const Alignment(-0.7, -0.9),
                      end: Alignment.bottomRight,
                      colors: [
                        Color.lerp(Colors.white, color, 0.22)!,
                        color,
                        Color.lerp(color, const Color(0xFF0C0D10), 0.28)!,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.55),
                        blurRadius: 7,
                      ),
                    ],
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.38),
                      width: 0.6,
                    ),
                  ),
                  child: Transform.rotate(
                    angle: -math.pi / 4,
                    child: Icon(icon, size: facet * 0.62, color: gemInk),
                  ),
                ),
              ),
            ),
            SizedBox(width: dense ? 6 : 8),
            Text(
              label.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: Color.lerp(
                      color,
                      AppColors.of(context).ink,
                      0.18,
                    ),
                    fontSize: fontSize,
                    letterSpacing: dense ? 1.15 : 1.55,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
