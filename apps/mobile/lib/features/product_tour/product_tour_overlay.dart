import 'package:flutter/material.dart';

import '../../app/layout/pulse_breakpoints.dart';
import '../../app/theme.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import '../../users/user_role.dart';
import 'product_tour_prefs.dart';

enum ProductTourStepId { welcome, community, chats, academy, you }

class ProductTourTargets {
  const ProductTourTargets({
    required this.bar,
    required this.home,
    required this.chats,
    required this.academy,
    required this.profile,
  });

  final GlobalKey bar;
  final GlobalKey home;
  final GlobalKey chats;
  final GlobalKey academy;
  final GlobalKey profile;

  GlobalKey? keyFor(ProductTourStepId id) {
    return switch (id) {
      ProductTourStepId.welcome => bar,
      ProductTourStepId.community => home,
      ProductTourStepId.chats => chats,
      ProductTourStepId.academy => academy,
      ProductTourStepId.you => profile,
    };
  }
}

/// Coachmark tour that spotlights shell chrome and pins a card away from it.
class ProductTourOverlay extends StatefulWidget {
  const ProductTourOverlay({
    super.key,
    required this.profile,
    required this.userRepository,
    required this.targets,
    this.onCompleted,
  });

  final UserProfile profile;
  final UserRepository userRepository;
  final ProductTourTargets targets;
  final ValueChanged<UserProfile>? onCompleted;

  @override
  State<ProductTourOverlay> createState() => _ProductTourOverlayState();
}

class _ProductTourOverlayState extends State<ProductTourOverlay> {
  int _page = 0;
  bool _busy = false;
  bool? _show;
  Rect? _hole;
  int _measureAttempts = 0;

  static const _steps = <ProductTourStepId>[
    ProductTourStepId.welcome,
    ProductTourStepId.community,
    ProductTourStepId.chats,
    ProductTourStepId.academy,
    ProductTourStepId.you,
  ];

  bool get _isAgent {
    return belongsInDefaultAgentGroup(widget.profile.roleId) ||
        canAccessTools(widget.profile.roleId);
  }

  @override
  void initState() {
    super.initState();
    _loadGate();
  }

  Future<void> _loadGate() async {
    final localDone = await ProductTourPrefs.hasCompletedCurrent();
    if (!mounted) return;
    final show = shouldShowProductTour(
      isAnonymous: widget.profile.isAnonymous,
      profileCompleted: widget.profile.profileCompleted,
      productTourVersion: widget.profile.productTourVersion,
      localDone: localDone,
    );
    setState(() => _show = show);
    if (show) {
      _measureAttempts = 0;
      WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
    }
  }

  @override
  void didUpdateWidget(covariant ProductTourOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.productTourVersion !=
            widget.profile.productTourVersion ||
        oldWidget.profile.profileCompleted != widget.profile.profileCompleted) {
      _loadGate();
    }
  }

  void _measure() {
    if (!mounted || _show != true) return;
    if (_page >= _steps.length) {
      setState(() => _page = _steps.isEmpty ? 0 : _steps.length - 1);
      return;
    }
    final overlayBox = context.findRenderObject() as RenderBox?;
    final key = widget.targets.keyFor(_steps[_page]);
    final targetBox = key?.currentContext?.findRenderObject() as RenderBox?;
    if (overlayBox == null ||
        !overlayBox.hasSize ||
        targetBox == null ||
        !targetBox.hasSize) {
      if (_hole != null) setState(() => _hole = null);
      if (_measureAttempts < 8) {
        _measureAttempts++;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || _show != true) return;
          _measure();
        });
      }
      return;
    }
    _measureAttempts = 0;
    final offset = targetBox.localToGlobal(Offset.zero, ancestor: overlayBox);
    const pad = 8.0;
    setState(() {
      _hole = Rect.fromLTWH(
        offset.dx - pad,
        offset.dy - pad,
        targetBox.size.width + pad * 2,
        targetBox.size.height + pad * 2,
      );
    });
  }

  Future<void> _finish() async {
    if (_busy) return;
    setState(() => _busy = true);
    await ProductTourPrefs.markCompleted();
    final next = widget.profile.copyWith(
      productTourVersion: kProductTourVersion,
    );
    try {
      await widget.userRepository.updateProfile(next);
      widget.onCompleted?.call(next);
    } catch (error, stack) {
      debugPrint('ProductTourOverlay finish failed: $error\n$stack');
      widget.onCompleted?.call(next);
    }
    if (!mounted) return;
    setState(() {
      _show = false;
      _busy = false;
    });
  }

  void _goTo(int page) {
    _measureAttempts = 0;
    setState(() => _page = page.clamp(0, _steps.length - 1));
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  String _title(AppLocalizations l10n, ProductTourStepId step) {
    return switch (step) {
      ProductTourStepId.welcome => l10n.tourWelcomeTitle,
      ProductTourStepId.community => l10n.tourCommunityTitle,
      ProductTourStepId.chats => l10n.tourChatsTitle,
      ProductTourStepId.academy => l10n.tourAcademyTitle,
      ProductTourStepId.you => l10n.tourYouTitle,
    };
  }

  String _body(AppLocalizations l10n, ProductTourStepId step) {
    return switch (step) {
      ProductTourStepId.welcome => l10n.tourWelcomeBody,
      ProductTourStepId.community => l10n.tourCommunityBody,
      ProductTourStepId.chats => l10n.tourChatsBody,
      ProductTourStepId.academy => l10n.tourAcademyBody,
      ProductTourStepId.you =>
        _isAgent ? l10n.tourYouBodyAgent : l10n.tourYouBody,
    };
  }

  /// Pin the card to the larger gap so it never shares a tight strip with the
  /// spotlight (that leftover ~250px slot is what broke layout before).
  bool _pinCardToTop({
    required Size size,
    required EdgeInsets padding,
    required bool rail,
  }) {
    final hole = _hole;
    if (hole == null) return true;
    if (rail && hole.left < 180) return true;
    final topGap = hole.top - padding.top;
    final bottomGap = size.height - padding.bottom - hole.bottom;
    return topGap >= bottomGap;
  }

  @override
  Widget build(BuildContext context) {
    if (_show != true || _steps.isEmpty) {
      return const IgnorePointer(ignoring: true, child: SizedBox.shrink());
    }

    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final media = MediaQuery.of(context);
    final rail = pulseUseRail(context);
    final step = _steps[_page.clamp(0, _steps.length - 1)];
    final pinTop = _pinCardToTop(
      size: media.size,
      padding: media.padding,
      rail: rail,
    );

    final card = _TourCard(
      key: ValueKey(step),
      eyebrow: l10n.tourEyebrow.toUpperCase(),
      stepLabel: l10n.tourStep(_page + 1, _steps.length),
      title: _title(l10n, step),
      body: _body(l10n, step),
      skipLabel: l10n.tourSkip,
      backLabel: l10n.tourBack,
      nextLabel: _page >= _steps.length - 1 ? l10n.tourDone : l10n.tourNext,
      page: _page,
      pageCount: _steps.length,
      busy: _busy,
      brand: brand,
      colors: colors,
      showBack: _page > 0,
      onSkip: _finish,
      onBack: () => _goTo(_page - 1),
      onNext: () {
        if (_page >= _steps.length - 1) {
          _finish();
        } else {
          _goTo(_page + 1);
        }
      },
    );

    return Material(
      type: MaterialType.transparency,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(
            painter: _SpotlightPainter(
              hole: _hole,
              scrim: Colors.black.withValues(alpha: 0.72),
              ring: brand,
            ),
            child: const SizedBox.expand(),
          ),
          Positioned(
            left: rail ? 88 : 16,
            right: 16,
            top: pinTop ? media.padding.top + 12 : null,
            bottom: pinTop ? null : media.padding.bottom + 12,
            child: card,
          ),
        ],
      ),
    );
  }
}

class _TourCard extends StatelessWidget {
  const _TourCard({
    super.key,
    required this.eyebrow,
    required this.stepLabel,
    required this.title,
    required this.body,
    required this.skipLabel,
    required this.backLabel,
    required this.nextLabel,
    required this.page,
    required this.pageCount,
    required this.busy,
    required this.brand,
    required this.colors,
    required this.showBack,
    required this.onSkip,
    required this.onBack,
    required this.onNext,
  });

  final String eyebrow;
  final String stepLabel;
  final String title;
  final String body;
  final String skipLabel;
  final String backLabel;
  final String nextLabel;
  final int page;
  final int pageCount;
  final bool busy;
  final Color brand;
  final AppColors colors;
  final bool showBack;
  final VoidCallback onSkip;
  final VoidCallback onBack;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    // Theme FilledButtons use min width infinity. Stretch them in a Column
    // (bounded by Positioned left/right) instead of measuring inside a Row.
    final fillStyle = FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );

    return Material(
      color: colors.sheet,
      elevation: 12,
      shadowColor: Colors.black.withValues(alpha: 0.28),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    eyebrow,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                      color: brand,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: busy ? null : onSkip,
                  child: Text(skipLabel),
                ),
              ],
            ),
            Text(
              stepLabel,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: colors.muted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              style: textTheme.bodyMedium?.copyWith(
                color: colors.muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                for (var i = 0; i < pageCount; i++) ...[
                  Container(
                    width: i == page ? 18 : 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: i == page
                          ? brand
                          : i < page
                          ? brand.withValues(alpha: 0.45)
                          : colors.border,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  if (i < pageCount - 1) const SizedBox(width: 5),
                ],
              ],
            ),
            const SizedBox(height: 14),
            if (showBack)
              TextButton(
                onPressed: busy ? null : onBack,
                child: Text(backLabel),
              ),
            FilledButton(
              style: fillStyle,
              onPressed: busy ? null : onNext,
              child: Text(nextLabel),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpotlightPainter extends CustomPainter {
  _SpotlightPainter({
    required this.hole,
    required this.scrim,
    required this.ring,
  });

  final Rect? hole;
  final Color scrim;
  final Color ring;

  @override
  void paint(Canvas canvas, Size size) {
    final full = Path()..addRect(Offset.zero & size);
    if (hole == null) {
      canvas.drawRect(Offset.zero & size, Paint()..color = scrim);
      return;
    }
    final cut = Path()
      ..addRRect(RRect.fromRectAndRadius(hole!, const Radius.circular(16)));
    final overlay = Path.combine(PathOperation.difference, full, cut);
    canvas.drawPath(overlay, Paint()..color = scrim);
    canvas.drawRRect(
      RRect.fromRectAndRadius(hole!, const Radius.circular(16)),
      Paint()
        ..color = ring
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );
  }

  @override
  bool shouldRepaint(covariant _SpotlightPainter oldDelegate) =>
      oldDelegate.hole != hole ||
      oldDelegate.scrim != scrim ||
      oldDelegate.ring != ring;
}
