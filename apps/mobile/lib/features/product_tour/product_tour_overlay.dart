import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import '../../users/user_role.dart';
import 'product_tour_prefs.dart';

enum ProductTourStepId { welcome, community, chats, academy, ai, you }

class ProductTourTargets {
  const ProductTourTargets({
    required this.bar,
    required this.home,
    required this.chats,
    required this.academy,
    required this.profile,
    this.ai,
  });

  final GlobalKey bar;
  final GlobalKey home;
  final GlobalKey chats;
  final GlobalKey academy;
  final GlobalKey profile;
  final GlobalKey? ai;

  GlobalKey? keyFor(ProductTourStepId id) {
    return switch (id) {
      ProductTourStepId.welcome => bar,
      ProductTourStepId.community => home,
      ProductTourStepId.chats => chats,
      ProductTourStepId.academy => academy,
      ProductTourStepId.ai => ai,
      ProductTourStepId.you => profile,
    };
  }
}

/// Coachmark tour that spotlights real shell chrome.
class ProductTourOverlay extends StatefulWidget {
  const ProductTourOverlay({
    super.key,
    required this.profile,
    required this.userRepository,
    required this.targets,
    required this.pulseAiEnabled,
    this.onCompleted,
  });

  final UserProfile profile;
  final UserRepository userRepository;
  final ProductTourTargets targets;
  final bool pulseAiEnabled;
  final ValueChanged<UserProfile>? onCompleted;

  @override
  State<ProductTourOverlay> createState() => _ProductTourOverlayState();
}

class _ProductTourOverlayState extends State<ProductTourOverlay> {
  int _page = 0;
  bool _busy = false;
  bool? _show;
  Rect? _hole;

  List<ProductTourStepId> get _steps {
    final all = <ProductTourStepId>[
      ProductTourStepId.welcome,
      ProductTourStepId.community,
      ProductTourStepId.chats,
      ProductTourStepId.academy,
      if (widget.pulseAiEnabled) ProductTourStepId.ai,
      ProductTourStepId.you,
    ];
    return all;
  }

  bool get _isAgent {
    final role = widget.profile.role;
    return role == UserRole.agent ||
        role == UserRole.admin ||
        role == UserRole.instructor ||
        role == UserRole.manager;
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
      WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
    }
  }

  @override
  void didUpdateWidget(covariant ProductTourOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.productTourVersion !=
            widget.profile.productTourVersion ||
        oldWidget.profile.profileCompleted != widget.profile.profileCompleted ||
        oldWidget.pulseAiEnabled != widget.pulseAiEnabled) {
      _loadGate();
    }
  }

  void _measure() {
    if (!mounted || _show != true) return;
    final steps = _steps;
    if (_page >= steps.length) {
      setState(() => _page = steps.isEmpty ? 0 : steps.length - 1);
      return;
    }
    final key = widget.targets.keyFor(steps[_page]);
    final ctx = key?.currentContext;
    final box = ctx?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) {
      setState(() => _hole = null);
      return;
    }
    final offset = box.localToGlobal(Offset.zero);
    const pad = 8.0;
    setState(() {
      _hole = Rect.fromLTWH(
        offset.dx - pad,
        offset.dy - pad,
        box.size.width + pad * 2,
        box.size.height + pad * 2,
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
    setState(() => _page = page.clamp(0, _steps.length - 1));
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  String _title(AppLocalizations l10n, ProductTourStepId step) {
    return switch (step) {
      ProductTourStepId.welcome => l10n.tourWelcomeTitle,
      ProductTourStepId.community => l10n.tourCommunityTitle,
      ProductTourStepId.chats => l10n.tourChatsTitle,
      ProductTourStepId.academy => l10n.tourAcademyTitle,
      ProductTourStepId.ai => l10n.tourAiTitle,
      ProductTourStepId.you => l10n.tourYouTitle,
    };
  }

  String _body(AppLocalizations l10n, ProductTourStepId step) {
    return switch (step) {
      ProductTourStepId.welcome => l10n.tourWelcomeBody,
      ProductTourStepId.community => l10n.tourCommunityBody,
      ProductTourStepId.chats => l10n.tourChatsBody,
      ProductTourStepId.academy => l10n.tourAcademyBody,
      ProductTourStepId.ai => l10n.tourAiBody,
      ProductTourStepId.you =>
        _isAgent ? l10n.tourYouBodyAgent : l10n.tourYouBody,
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_show != true) return const SizedBox.shrink();

    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final steps = _steps;
    if (steps.isEmpty) return const SizedBox.shrink();
    final step = steps[_page.clamp(0, steps.length - 1)];
    final isLast = _page >= steps.length - 1;
    final size = MediaQuery.sizeOf(context);

    final tipTop = () {
      final hole = _hole;
      if (hole == null) return size.height * 0.35;
      final spaceBelow = size.height - hole.bottom;
      if (spaceBelow > 200) return hole.bottom + 14;
      return (hole.top - 170).clamp(24.0, size.height - 200);
    }();

    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _SpotlightPainter(
                hole: _hole,
                scrim: Colors.black.withValues(alpha: 0.72),
                ring: brand,
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            top: tipTop,
            child: IgnorePointer(
              ignoring: false,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                child: DecoratedBox(
                  key: ValueKey(step),
                  decoration: BoxDecoration(
                    color: colors.sheet,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: colors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.28),
                        blurRadius: 24,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Text(
                              l10n.tourEyebrow.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.1,
                                color: brand,
                              ),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: _busy ? null : _finish,
                              child: Text(l10n.tourSkip),
                            ),
                          ],
                        ),
                        Text(
                          l10n.tourStep(_page + 1, steps.length),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: colors.muted,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _title(l10n, step),
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _body(l10n, step),
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: colors.muted, height: 1.4),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            for (var i = 0; i < steps.length; i++) ...[
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: i == _page ? 18 : 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  color: i == _page
                                      ? brand
                                      : i < _page
                                      ? brand.withValues(alpha: 0.45)
                                      : colors.border,
                                  borderRadius: BorderRadius.circular(99),
                                ),
                              ),
                              if (i < steps.length - 1)
                                const SizedBox(width: 5),
                            ],
                            const Spacer(),
                            if (_page > 0)
                              TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => _goTo(_page - 1),
                                child: Text(l10n.tourBack),
                              ),
                            FilledButton(
                              onPressed: _busy
                                  ? null
                                  : () {
                                      if (isLast) {
                                        _finish();
                                      } else {
                                        _goTo(_page + 1);
                                      }
                                    },
                              child: Text(
                                isLast ? l10n.tourDone : l10n.tourNext,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
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
