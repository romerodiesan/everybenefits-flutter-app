import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Compact lifebuoy mark for the Support FAB.
class LifebuoyIcon extends StatelessWidget {
  const LifebuoyIcon({
    super.key,
    this.size = 22,
    this.color,
  });

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final resolved = color ?? IconTheme.of(context).color ?? Colors.white;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _LifebuoyPainter(color: resolved),
      ),
    );
  }
}

class _LifebuoyPainter extends CustomPainter {
  const _LifebuoyPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final outer = size.shortestSide / 2;
    final mid = outer * 0.72;
    final inner = outer * 0.38;

    final ring = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = outer * 0.28;
    canvas.drawCircle(center, (outer + mid) / 2, ring);

    final outline = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = outer * 0.08;
    canvas.drawCircle(center, outer, outline);
    canvas.drawCircle(center, inner, outline..strokeWidth = outer * 0.1);

    final spoke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = outer * 0.16;

    for (var i = 0; i < 4; i++) {
      final angle = i * (math.pi / 2);
      final dx = math.cos(angle);
      final dy = math.sin(angle);
      canvas.drawLine(
        Offset(center.dx + inner * dx, center.dy + inner * dy),
        Offset(center.dx + mid * dx, center.dy + mid * dy),
        spoke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LifebuoyPainter oldDelegate) =>
      oldDelegate.color != color;
}
