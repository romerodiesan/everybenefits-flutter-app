import 'package:flutter/material.dart';

import '../theme.dart';

/// Quiet atmospheric wash — minimal, barely-there depth.
class MeshBackground extends StatelessWidget {
  const MeshBackground({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    return ColoredBox(
      color: colors.meshBase,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(painter: _MeshPainter(colors: colors, brand: brand)),
          ?child,
        ],
      ),
    );
  }
}

class _MeshPainter extends CustomPainter {
  const _MeshPainter({required this.colors, required this.brand});

  final AppColors colors;
  final Color brand;

  @override
  void paint(Canvas canvas, Size size) {
    final isLight = colors.meshBase.computeLuminance() > 0.5;

    final wash = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          colors.meshDeep.withValues(alpha: isLight ? 0.55 : 0.7),
          colors.meshBase.withValues(alpha: 0),
          colors.meshBlob.withValues(alpha: isLight ? 0.35 : 0.45),
        ],
        stops: const [0, 0.5, 1],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, wash);

    final blobs = <(Offset, double, Color)>[
      (
        Offset(size.width * 0.15, size.height * 0.1),
        size.width * 0.55,
        colors.meshBlob.withValues(alpha: isLight ? 0.22 : 0.35),
      ),
      (
        Offset(size.width * 0.9, size.height * 0.75),
        size.width * 0.5,
        brand.withValues(alpha: isLight ? 0.04 : 0.12),
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
  bool shouldRepaint(covariant _MeshPainter oldDelegate) =>
      oldDelegate.colors != colors || oldDelegate.brand != brand;
}
