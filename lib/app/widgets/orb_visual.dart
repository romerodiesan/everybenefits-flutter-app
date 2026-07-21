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
          AppColors.accent.withValues(alpha: 0.35),
          AppColors.accent.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.35));
    canvas.drawCircle(center, radius * 1.35, glow);

    final sphere = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.45),
        colors: [
          const Color(0xFFE8FFF5),
          AppColors.accent.withValues(alpha: 0.85),
          AppColors.brand.withValues(alpha: 0.95),
          const Color(0xFF06241A),
        ],
        stops: const [0.0, 0.28, 0.62, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius * 0.86, sphere);

    final rim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = Colors.white.withValues(alpha: 0.35);
    canvas.drawCircle(center, radius * 0.86, rim);

    final swirl = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.white.withValues(alpha: 0.22);
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
