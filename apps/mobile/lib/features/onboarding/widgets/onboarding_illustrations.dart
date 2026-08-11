import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../app/theme.dart';

/// Soft animated mesh blobs behind onboarding pages.
class OnboardingMeshBackground extends StatelessWidget {
  const OnboardingMeshBackground({
    super.key,
    required this.t,
  });

  /// 0–1 loop from a repeating animation controller.
  final double t;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return CustomPaint(
      painter: _MeshPainter(
        t: t,
        canvas: colors.canvas,
        brand: brand,
        blob: colors.meshBlob,
      ),
      child: const SizedBox.expand(),
    );
  }
}

class _MeshPainter extends CustomPainter {
  _MeshPainter({
    required this.t,
    required this.canvas,
    required this.brand,
    required this.blob,
  });

  final double t;
  final Color canvas;
  final Color brand;
  final Color blob;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    canvas.drawRect(Offset.zero & size, paint..color = this.canvas);

    final wobble = math.sin(t * math.pi * 2);
    final wobble2 = math.cos(t * math.pi * 2);

    void blobAt(Offset c, double r, Color color) {
      paint.color = color;
      canvas.drawCircle(c, r, paint);
    }

    blobAt(
      Offset(size.width * 0.18 + wobble * 12, size.height * 0.22 + wobble2 * 8),
      size.width * 0.42,
      brand.withValues(alpha: 0.10),
    );
    blobAt(
      Offset(size.width * 0.86 + wobble2 * 10, size.height * 0.18 + wobble * 14),
      size.width * 0.36,
      brand.withValues(alpha: 0.07),
    );
    blobAt(
      Offset(size.width * 0.72 + wobble * 8, size.height * 0.72 + wobble2 * 10),
      size.width * 0.48,
      blob.withValues(alpha: 0.55),
    );
    blobAt(
      Offset(size.width * 0.12 + wobble2 * 6, size.height * 0.78),
      size.width * 0.28,
      brand.withValues(alpha: 0.06),
    );
  }

  @override
  bool shouldRepaint(covariant _MeshPainter oldDelegate) =>
      oldDelegate.t != t ||
      oldDelegate.canvas != canvas ||
      oldDelegate.brand != brand ||
      oldDelegate.blob != blob;
}

enum OnboardingIllustrationKind {
  pulse,
  community,
  chats,
  academy,
}

/// Animated product-style infographic for each onboarding step.
class OnboardingIllustration extends StatelessWidget {
  const OnboardingIllustration({
    super.key,
    required this.kind,
    required this.float,
    required this.reveal,
  });

  final OnboardingIllustrationKind kind;

  /// -1…1 vertical float.
  final double float;

  /// 0…1 entrance progress for the active page.
  final double reveal;

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);
    final dy = float * 10;
    final opacity = reveal.clamp(0.0, 1.0);
    final scale = 0.92 + (0.08 * Curves.easeOutCubic.transform(opacity));

    return Opacity(
      opacity: opacity,
      child: Transform.translate(
        offset: Offset(0, dy + (1 - opacity) * 24),
        child: Transform.scale(
          scale: scale,
          child: SizedBox.expand(
            child: switch (kind) {
              OnboardingIllustrationKind.pulse =>
                _PulseHero(brand: brand, colors: colors, t: float),
              OnboardingIllustrationKind.community =>
                _CommunityCards(brand: brand, colors: colors),
              OnboardingIllustrationKind.chats =>
                _ChatBubbles(brand: brand, colors: colors),
              OnboardingIllustrationKind.academy =>
                _AcademyPath(brand: brand, colors: colors),
            },
          ),
        ),
      ),
    );
  }
}

class _PulseHero extends StatelessWidget {
  const _PulseHero({
    required this.brand,
    required this.colors,
    required this.t,
  });

  final Color brand;
  final AppColors colors;
  final double t;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _PulseRingsPainter(brand: brand, border: colors.border, t: t),
      child: Center(
        child: Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                brand.withValues(alpha: 0.28),
                brand.withValues(alpha: 0.08),
              ],
            ),
            border: Border.all(color: colors.border),
            boxShadow: [
              BoxShadow(
                color: brand.withValues(alpha: 0.22),
                blurRadius: 28,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Icon(Icons.favorite_rounded, color: brand, size: 40),
        ),
      ),
    );
  }
}

class _PulseRingsPainter extends CustomPainter {
  _PulseRingsPainter({
    required this.brand,
    required this.border,
    required this.t,
  });

  final Color brand;
  final Color border;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    for (var i = 0; i < 3; i++) {
      final phase = ((t + 1) / 2 + i * 0.22) % 1.0;
      final r = 48 + phase * 70 + i * 18;
      paint.color = brand.withValues(alpha: (1 - phase) * 0.35);
      canvas.drawCircle(c, r, paint);
    }
    paint
      ..color = border
      ..strokeWidth = 1;
    canvas.drawCircle(c, 58, paint);
  }

  @override
  bool shouldRepaint(covariant _PulseRingsPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.brand != brand;
}

class _CommunityCards extends StatelessWidget {
  const _CommunityCards({required this.brand, required this.colors});

  final Color brand;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    Widget card({
      required double rotate,
      required double dx,
      required double dy,
      required double opacity,
      required String title,
      required String body,
      bool accent = false,
    }) {
      return Transform.translate(
        offset: Offset(dx, dy),
        child: Transform.rotate(
          angle: rotate,
          child: Opacity(
            opacity: opacity,
            child: Container(
              width: 220,
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              decoration: BoxDecoration(
                color: colors.sheet,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: accent ? brand.withValues(alpha: 0.35) : colors.border,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: brand.withValues(alpha: 0.16),
                          border: Border.all(color: colors.border),
                        ),
                        child: Icon(Icons.person_rounded, size: 14, color: brand),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: colors.ink,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.muted,
                      fontSize: 12,
                      height: 1.35,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (accent) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.thumb_up_alt_outlined, size: 14, color: brand),
                        const SizedBox(width: 6),
                        Text(
                          'Relevant',
                          style: TextStyle(
                            color: brand,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
    }

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: SizedBox(
        width: 280,
        height: 220,
        child: Stack(
          alignment: Alignment.center,
          children: [
            card(
              rotate: -0.08,
              dx: -36,
              dy: 28,
              opacity: 0.55,
              title: 'New agent tip',
              body: 'How do you open a Medicare conversation?',
            ),
            card(
              rotate: 0.06,
              dx: 40,
              dy: -8,
              opacity: 0.75,
              title: 'Team win',
              body: 'Closed three renewals after the workshop.',
            ),
            card(
              rotate: -0.02,
              dx: 0,
              dy: 8,
              opacity: 1,
              title: 'Today in the feed',
              body: 'Ask the room — someone has already solved it.',
              accent: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubbles extends StatelessWidget {
  const _ChatBubbles({required this.brand, required this.colors});

  final Color brand;
  final AppColors colors;

  Widget bubble({
    required bool mine,
    required String text,
    required double dx,
    required double dy,
  }) {
    return Transform.translate(
      offset: Offset(dx, dy),
      child: Align(
        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 210),
          margin: EdgeInsets.only(
            left: mine ? 48 : 12,
            right: mine ? 12 : 48,
          ),
          padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
          decoration: BoxDecoration(
            color: mine ? brand.withValues(alpha: 0.16) : colors.sheet,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(mine ? 18 : 5),
              bottomRight: Radius.circular(mine ? 5 : 18),
            ),
            border: Border.all(
              color: mine ? brand.withValues(alpha: 0.22) : colors.border,
            ),
          ),
          child: Text(
            text,
            style: TextStyle(
              color: colors.ink,
              fontSize: 13,
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          bubble(mine: false, text: 'Standup in 10 — bring renewals.', dx: 0, dy: 0),
          const SizedBox(height: 10),
          bubble(mine: true, text: 'On it. Sharing the sheet now.', dx: 0, dy: 0),
          const SizedBox(height: 10),
          bubble(mine: false, text: 'Nice — see you in Team.', dx: 0, dy: 0),
        ],
      ),
    );
  }
}

class _AcademyPath extends StatelessWidget {
  const _AcademyPath({required this.brand, required this.colors});

  final Color brand;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    Widget step({
      required String label,
      required bool done,
      required bool current,
    }) {
      return Container(
        width: 200,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: current ? brand.withValues(alpha: 0.14) : colors.sheet,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: current ? brand.withValues(alpha: 0.35) : colors.border,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done || current
                    ? brand.withValues(alpha: 0.2)
                    : colors.glassFill,
                border: Border.all(color: colors.border),
              ),
              child: Icon(
                done
                    ? Icons.check_rounded
                    : current
                        ? Icons.play_arrow_rounded
                        : Icons.circle_outlined,
                size: 16,
                color: done || current ? brand : colors.muted,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: colors.ink,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          step(label: 'Foundations', done: true, current: false),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Container(
              width: 2,
              height: 16,
              color: brand.withValues(alpha: 0.35),
            ),
          ),
          step(label: 'Licensing path', done: false, current: true),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Container(
              width: 2,
              height: 16,
              color: colors.border,
            ),
          ),
          step(label: 'Advanced sales', done: false, current: false),
        ],
      ),
    );
  }
}
