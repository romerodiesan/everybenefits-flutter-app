import 'package:flutter/material.dart';

import '../app_spacing.dart';
import '../theme.dart';
import 'pulse_chrome.dart';

/// Soft pulsing placeholder block.
class PulseSkeleton extends StatefulWidget {
  const PulseSkeleton({
    super.key,
    this.width,
    this.height = 14,
    this.borderRadius = 10,
    this.shape = BoxShape.rectangle,
  });

  final double? width;
  final double height;
  final double borderRadius;
  final BoxShape shape;

  @override
  State<PulseSkeleton> createState() => _PulseSkeletonState();
}

class _PulseSkeletonState extends State<PulseSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  late final Animation<double> _opacity = Tween<double>(begin: 0.38, end: 0.72)
      .animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return AnimatedBuilder(
      animation: _opacity,
      builder: (context, _) {
        return Opacity(
          opacity: _opacity.value,
          child: Container(
            width: widget.width,
            height: widget.height,
            decoration: BoxDecoration(
              shape: widget.shape,
              color: Color.lerp(
                colors.glassFill,
                brand.withValues(alpha: 0.18),
                0.35,
              ),
              borderRadius: widget.shape == BoxShape.circle
                  ? null
                  : BorderRadius.circular(widget.borderRadius),
            ),
          ),
        );
      },
    );
  }
}

class PulseFeedSkeleton extends StatelessWidget {
  const PulseFeedSkeleton({super.key, this.itemCount = 4});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.xl,
      ),
      itemCount: itemCount,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, _) => const _FeedCardSkeleton(),
    );
  }
}

class _FeedCardSkeleton extends StatelessWidget {
  const _FeedCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return PulseSheet(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const PulseSkeleton(
                width: 36,
                height: 36,
                shape: BoxShape.circle,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    PulseSkeleton(width: 120, height: 12),
                    SizedBox(height: 6),
                    PulseSkeleton(width: 72, height: 10),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const PulseSkeleton(width: double.infinity, height: 14),
          const SizedBox(height: 8),
          const PulseSkeleton(width: 220, height: 14),
          const SizedBox(height: 8),
          const PulseSkeleton(width: 160, height: 12),
          const SizedBox(height: 14),
          Row(
            children: const [
              PulseSkeleton(width: 56, height: 22, borderRadius: 999),
              SizedBox(width: 8),
              PulseSkeleton(width: 56, height: 22, borderRadius: 999),
            ],
          ),
        ],
      ),
    );
  }
}

class PulseChatListSkeleton extends StatelessWidget {
  const PulseChatListSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        pulseShellListBottomPad(context),
      ),
      itemCount: itemCount,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (_, _) => const _ChatRowSkeleton(),
    );
  }
}

class _ChatRowSkeleton extends StatelessWidget {
  const _ChatRowSkeleton();

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
      decoration: BoxDecoration(
        color: colors.sheet,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        children: [
          const PulseSkeleton(width: 50, height: 50, shape: BoxShape.circle),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Row(
                  children: [
                    Expanded(child: PulseSkeleton(height: 13)),
                    SizedBox(width: 16),
                    PulseSkeleton(width: 36, height: 11),
                  ],
                ),
                SizedBox(height: 8),
                PulseSkeleton(width: 180, height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class PulseThreadSkeleton extends StatelessWidget {
  const PulseThreadSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        const Row(
          children: [
            PulseSkeleton(width: 40, height: 40, shape: BoxShape.circle),
            SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PulseSkeleton(width: 140, height: 12),
                  SizedBox(height: 6),
                  PulseSkeleton(width: 80, height: 10),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const PulseSkeleton(width: double.infinity, height: 18),
        const SizedBox(height: 10),
        const PulseSkeleton(width: double.infinity, height: 14),
        const SizedBox(height: 8),
        const PulseSkeleton(width: 240, height: 14),
        const SizedBox(height: 8),
        const PulseSkeleton(width: 180, height: 14),
        const SizedBox(height: 20),
        for (var i = 0; i < 3; i++) ...[
          PulseSheet(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Row(
                  children: [
                    PulseSkeleton(
                      width: 28,
                      height: 28,
                      shape: BoxShape.circle,
                    ),
                    SizedBox(width: 8),
                    PulseSkeleton(width: 100, height: 11),
                  ],
                ),
                SizedBox(height: 10),
                PulseSkeleton(width: double.infinity, height: 12),
                SizedBox(height: 6),
                PulseSkeleton(width: 200, height: 12),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class PulseMessageListSkeleton extends StatelessWidget {
  const PulseMessageListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: const [
        Align(
          alignment: Alignment.centerLeft,
          child: PulseSkeleton(width: 180, height: 42, borderRadius: 18),
        ),
        SizedBox(height: 12),
        Align(
          alignment: Alignment.centerRight,
          child: PulseSkeleton(width: 160, height: 42, borderRadius: 18),
        ),
        SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: PulseSkeleton(width: 200, height: 42, borderRadius: 18),
        ),
        SizedBox(height: 12),
        Align(
          alignment: Alignment.centerRight,
          child: PulseSkeleton(width: 120, height: 42, borderRadius: 18),
        ),
      ],
    );
  }
}

class PulseContactListSkeleton extends StatelessWidget {
  const PulseContactListSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.xl,
      ),
      itemCount: itemCount,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (_, _) => Container(
        padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
        decoration: BoxDecoration(
          color: AppColors.of(context).sheet,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.of(context).border),
        ),
        child: const Row(
          children: [
            PulseSkeleton(width: 46, height: 46, shape: BoxShape.circle),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PulseSkeleton(width: 140, height: 13),
                  SizedBox(height: 6),
                  PulseSkeleton(width: 90, height: 11),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
