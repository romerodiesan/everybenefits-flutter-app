import 'package:flutter/material.dart';

import '../app_spacing.dart';
import '../theme.dart';
import 'pulse_chrome.dart';

/// Hosts one shimmer [AnimationController] for all descendant [PulseSkeleton]s.
///
/// Composite skeletons wrap their trees in this so a list of 20–40 blocks
/// shares a single ticker instead of one controller per block.
class PulseShimmerScope extends StatefulWidget {
  const PulseShimmerScope({super.key, required this.child});

  final Widget child;

  @override
  State<PulseShimmerScope> createState() => _PulseShimmerScopeState();
}

class _PulseShimmerScopeState extends State<PulseShimmerScope>
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
    return _PulseShimmer(animation: _opacity, child: widget.child);
  }
}

class _PulseShimmer extends InheritedWidget {
  const _PulseShimmer({required this.animation, required super.child});

  final Animation<double> animation;

  static Animation<double>? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_PulseShimmer>()?.animation;
  }

  @override
  bool updateShouldNotify(_PulseShimmer oldWidget) =>
      animation != oldWidget.animation;
}

/// Soft pulsing placeholder block.
class PulseSkeleton extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final shared = _PulseShimmer.maybeOf(context);
    if (shared != null) {
      return _PulseSkeletonPaint(
        animation: shared,
        width: width,
        height: height,
        borderRadius: borderRadius,
        shape: shape,
      );
    }
    return _PulseSkeletonLocal(
      width: width,
      height: height,
      borderRadius: borderRadius,
      shape: shape,
    );
  }
}

class _PulseSkeletonLocal extends StatefulWidget {
  const _PulseSkeletonLocal({
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
  State<_PulseSkeletonLocal> createState() => _PulseSkeletonLocalState();
}

class _PulseSkeletonLocalState extends State<_PulseSkeletonLocal>
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
    return _PulseSkeletonPaint(
      animation: _opacity,
      width: widget.width,
      height: widget.height,
      borderRadius: widget.borderRadius,
      shape: widget.shape,
    );
  }
}

class _PulseSkeletonPaint extends StatelessWidget {
  const _PulseSkeletonPaint({
    required this.animation,
    required this.width,
    required this.height,
    required this.borderRadius,
    required this.shape,
  });

  final Animation<double> animation;
  final double? width;
  final double height;
  final double borderRadius;
  final BoxShape shape;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        return Opacity(
          opacity: animation.value,
          child: Container(
            width: width,
            height: height,
            decoration: BoxDecoration(
              shape: shape,
              color: Color.lerp(
                colors.glassFill,
                brand.withValues(alpha: 0.18),
                0.35,
              ),
              borderRadius: shape == BoxShape.circle
                  ? null
                  : BorderRadius.circular(borderRadius),
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
    return PulseShimmerScope(
      child: ListView.separated(
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
      ),
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
    return PulseShimmerScope(
      child: ListView.separated(
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
      ),
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
    return PulseShimmerScope(
      child: ListView(
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
      ),
    );
  }
}

class PulseMessageListSkeleton extends StatelessWidget {
  const PulseMessageListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: ListView(
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
      ),
    );
  }
}

class PulseContactListSkeleton extends StatelessWidget {
  const PulseContactListSkeleton({
    super.key,
    this.itemCount = 6,
    this.shrinkWrap = false,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.md,
      AppSpacing.sm,
      AppSpacing.md,
      AppSpacing.xl,
    ),
  });

  final int itemCount;
  final bool shrinkWrap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: ListView.separated(
        shrinkWrap: shrinkWrap,
        physics: const NeverScrollableScrollPhysics(),
        padding: padding,
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
      ),
    );
  }
}

/// Notification inbox rows — matches [NotificationsScreen] sheet cards.
class PulseNotificationListSkeleton extends StatelessWidget {
  const PulseNotificationListSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return PulseShimmerScope(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        itemCount: itemCount,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, _) => Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(
            color: colors.sheet,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colors.border),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: PulseSkeleton(height: 15)),
                  SizedBox(width: 16),
                  PulseSkeleton(width: 48, height: 11),
                ],
              ),
              SizedBox(height: 8),
              PulseSkeleton(width: double.infinity, height: 12),
              SizedBox(height: 6),
              PulseSkeleton(width: 220, height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

/// Academy catalog / my-learning course cards (cover + title + meta).
class PulseCatalogSkeleton extends StatelessWidget {
  const PulseCatalogSkeleton({
    super.key,
    this.itemCount = 3,
    this.shrinkWrap = false,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.showProgress = false,
  });

  final int itemCount;
  final bool shrinkWrap;
  final EdgeInsetsGeometry padding;
  final bool showProgress;

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: ListView.separated(
        shrinkWrap: shrinkWrap,
        physics: const NeverScrollableScrollPhysics(),
        padding: padding,
        itemCount: itemCount,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (_, _) => _CourseCardSkeleton(showProgress: showProgress),
      ),
    );
  }
}

class _CourseCardSkeleton extends StatelessWidget {
  const _CourseCardSkeleton({this.showProgress = false});

  final bool showProgress;

  @override
  Widget build(BuildContext context) {
    return PulseSheet(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const PulseSkeleton(
            width: double.infinity,
            height: 108,
            borderRadius: 14,
          ),
          const SizedBox(height: 12),
          const PulseSkeleton(width: 200, height: 16),
          const SizedBox(height: 8),
          const PulseSkeleton(width: 160, height: 13),
          if (showProgress) ...[
            const SizedBox(height: 12),
            const PulseSkeleton(
              width: double.infinity,
              height: 6,
              borderRadius: 4,
            ),
            const SizedBox(height: 6),
            const PulseSkeleton(width: 72, height: 11),
          ],
        ],
      ),
    );
  }
}

/// Learning-path list rows (title, chip, description, progress).
class PulsePathListSkeleton extends StatelessWidget {
  const PulsePathListSkeleton({super.key, this.itemCount = 4});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: itemCount,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (_, _) => const _PathRowSkeleton(),
      ),
    );
  }
}

class _PathRowSkeleton extends StatelessWidget {
  const _PathRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return PulseSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              Expanded(child: PulseSkeleton(height: 16)),
              SizedBox(width: 12),
              PulseSkeleton(width: 72, height: 28, borderRadius: 16),
            ],
          ),
          SizedBox(height: 8),
          PulseSkeleton(width: double.infinity, height: 13),
          SizedBox(height: 6),
          PulseSkeleton(width: 200, height: 13),
          SizedBox(height: 8),
          PulseSkeleton(width: 140, height: 13),
          SizedBox(height: 12),
          PulseSkeleton(width: double.infinity, height: 6, borderRadius: 4),
        ],
      ),
    );
  }
}

/// Course detail landing: cover, title, chips, CTA, lesson blocks.
class PulseCourseDetailSkeleton extends StatelessWidget {
  const PulseCourseDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: const [
          PulseSkeleton(width: double.infinity, height: 168, borderRadius: 18),
          SizedBox(height: AppSpacing.md),
          PulseSkeleton(width: 240, height: 22),
          SizedBox(height: 8),
          PulseSkeleton(width: 160, height: 14),
          SizedBox(height: AppSpacing.md),
          Row(
            children: [
              PulseSkeleton(width: 72, height: 28, borderRadius: 16),
              SizedBox(width: 8),
              PulseSkeleton(width: 88, height: 28, borderRadius: 16),
              SizedBox(width: 8),
              PulseSkeleton(width: 64, height: 28, borderRadius: 16),
            ],
          ),
          SizedBox(height: AppSpacing.lg),
          PulseSkeleton(width: double.infinity, height: 48, borderRadius: 14),
          SizedBox(height: AppSpacing.xl),
          PulseSkeleton(width: 100, height: 18),
          SizedBox(height: 8),
          PulseSkeleton(width: double.infinity, height: 13),
          SizedBox(height: 6),
          PulseSkeleton(width: double.infinity, height: 13),
          SizedBox(height: 6),
          PulseSkeleton(width: 180, height: 13),
          SizedBox(height: AppSpacing.xl),
          PulseSkeleton(width: 120, height: 18),
          SizedBox(height: AppSpacing.sm),
          _LessonBlockSkeleton(),
          SizedBox(height: AppSpacing.md),
          _LessonBlockSkeleton(),
        ],
      ),
    );
  }
}

class _LessonBlockSkeleton extends StatelessWidget {
  const _LessonBlockSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        PulseSkeleton(width: 180, height: 14),
        SizedBox(height: 10),
        PulseSkeleton(width: double.infinity, height: 44, borderRadius: 12),
        SizedBox(height: 8),
        PulseSkeleton(width: double.infinity, height: 44, borderRadius: 12),
      ],
    );
  }
}

/// Compact syllabus placeholder while modules/lessons load under a known course.
class PulseLessonListSkeleton extends StatelessWidget {
  const PulseLessonListSkeleton({super.key, this.blocks = 2});

  final int blocks;

  @override
  Widget build(BuildContext context) {
    return PulseShimmerScope(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < blocks; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.md),
            const _LessonBlockSkeleton(),
          ],
        ],
      ),
    );
  }
}
