import 'package:flutter/material.dart';

import '../theme.dart';

/// Dark atmospheric mesh behind luminous glass screens.
class MeshBackground extends StatelessWidget {
  const MeshBackground({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.meshBase,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const CustomPaint(painter: _MeshPainter()),
          ?child,
        ],
      ),
    );
  }
}

class _MeshPainter extends CustomPainter {
  const _MeshPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final blobs = <(Offset, double, Color)>[
      (
        Offset(size.width * 0.2, size.height * 0.08),
        size.width * 0.7,
        AppColors.accent.withValues(alpha: 0.18),
      ),
      (
        Offset(size.width * 0.95, size.height * 0.32),
        size.width * 0.55,
        AppColors.brand.withValues(alpha: 0.35),
      ),
      (
        Offset(size.width * 0.1, size.height * 0.72),
        size.width * 0.65,
        AppColors.accent.withValues(alpha: 0.1),
      ),
      (
        Offset(size.width * 0.7, size.height * 0.9),
        size.width * 0.5,
        const Color(0xFF1A3D30).withValues(alpha: 0.8),
      ),
    ];

    for (final (center, radius, color) in blobs) {
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
        ).createShader(Rect.fromCircle(center: center, radius: radius));
      canvas.drawCircle(center, radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
