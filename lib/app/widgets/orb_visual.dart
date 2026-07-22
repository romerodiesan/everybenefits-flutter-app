import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

class OrbVisual extends StatelessWidget {
  const OrbVisual({super.key, this.size = 96});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _OrbPainter()),
    );
  }
}

class _OrbPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.brand.withValues(alpha: 0.12),
          AppColors.brand.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.25));
    canvas.drawCircle(center, radius * 1.25, glow);

    final sphere = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.45),
        colors: [
          const Color(0xFFE8EEEB),
          AppColors.accent.withValues(alpha: 0.75),
          AppColors.brand,
          const Color(0xFF0E1A16),
        ],
        stops: const [0.0, 0.32, 0.68, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius * 0.86, sphere);

    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = Colors.white.withValues(alpha: 0.28);
    canvas.drawCircle(center, radius * 0.86, rim);

    final swirl = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..color = Colors.white.withValues(alpha: 0.16);
    final path = Path();
    for (var i = 0; i < 40; i++) {
      final t = i / 39;
      final a = t * math.pi * 1.6 - 0.4;
      final r = radius * (0.25 + t * 0.45);
      final p = Offset(
        center.dx + math.cos(a) * r,
        center.dy + math.sin(a) * r * 0.7,
      );
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    canvas.drawPath(path, swirl);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
