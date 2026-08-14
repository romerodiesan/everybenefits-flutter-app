import 'package:flutter/material.dart';

import '../app_spacing.dart';
import '../layout/pulse_breakpoints.dart';
import '../pulse_haptics.dart';
import '../theme.dart';

/// Visual width of [PulseNavRail] including the trailing border.
const double kPulseNavRailWidth = 88;

/// Visual height of the bottom tab bar content (excluding safe-area inset).
const double kPulseTabBarPillHeight = 56;

/// Extra gap between FAB / list content and the bottom tab bar.
const double kPulseTabBarFabGap = 8;

/// Raw home-indicator / system bottom inset in logical pixels.
double systemBottomInset(BuildContext context) {
  final view = View.maybeOf(context);
  final fromView = view == null
      ? 0.0
      : view.viewPadding.bottom / view.devicePixelRatio;
  final fromMedia = MediaQuery.viewPaddingOf(context).bottom;
  final fromPad = MediaQuery.paddingOf(context).bottom;
  final safe = [
    fromView,
    fromMedia,
    fromPad,
  ].fold<double>(0, (a, b) => a > b ? a : b);
  return safe > 0 ? safe : 0.0;
}

/// Distance from the physical bottom to the top of [PulseTabBar].
double pulseTabBarTopInset(BuildContext context) {
  return systemBottomInset(context) + kPulseTabBarPillHeight;
}

/// Extra bottom inset so nested FABs clear [PulseTabBar].
double pulseFabClearance(BuildContext context) {
  if (pulseUseRail(context)) return AppSpacing.md;
  return kPulseTabBarFabGap;
}

/// List / scroll bottom padding. Body sits above the nav bar already.
double pulseShellListBottomPad(BuildContext context, {bool hasFab = false}) {
  if (pulseUseRail(context)) {
    return hasFab ? AppSpacing.xl : AppSpacing.md;
  }
  return hasFab ? 72 : AppSpacing.md;
}

EdgeInsets pulseFabPadding(BuildContext context) {
  return EdgeInsets.only(bottom: pulseFabClearance(context));
}

/// Tab body that keeps all children alive (like [IndexedStack]) and cross-fades
/// with a light directional slide when [index] changes.
class PulseTabBody extends StatefulWidget {
  const PulseTabBody({
    super.key,
    required this.index,
    required this.children,
    this.duration = const Duration(milliseconds: 320),
  });

  final int index;
  final List<Widget> children;
  final Duration duration;

  @override
  State<PulseTabBody> createState() => _PulseTabBodyState();
}

class _PulseTabBodyState extends State<PulseTabBody>
    with SingleTickerProviderStateMixin {
  static const _curve = Curves.easeOutCubic;
  static const _slidePx = 22.0;

  late final AnimationController _controller;
  late int _current;
  int? _outgoing;
  int _direction = 1;
  int _transitionGen = 0;

  @override
  void initState() {
    super.initState();
    _current = widget.index;
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..value = 1;
  }

  @override
  void didUpdateWidget(covariant PulseTabBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.duration != oldWidget.duration) {
      _controller.duration = widget.duration;
    }
    if (widget.index == _current) return;

    _direction = widget.index >= _current ? 1 : -1;
    _outgoing = _current;
    _current = widget.index;
    final gen = ++_transitionGen;
    _controller.forward(from: 0).whenComplete(() {
      if (!mounted || gen != _transitionGen) return;
      setState(() => _outgoing = null);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Stack(
          fit: StackFit.expand,
          children: [
            for (var i = 0; i < widget.children.length; i++) _buildLayer(i),
          ],
        );
      },
    );
  }

  Widget _buildLayer(int i) {
    final isCurrent = i == _current;
    final isOutgoing = i == _outgoing;
    final child = widget.children[i];

    if (!isCurrent && !isOutgoing) {
      return Offstage(
        offstage: true,
        child: TickerMode(enabled: false, child: child),
      );
    }

    final t = _curve.transform(_controller.value);
    late final double opacity;
    late final double dx;

    if (_outgoing == null) {
      opacity = isCurrent ? 1 : 0;
      dx = 0;
    } else if (isCurrent) {
      opacity = t;
      dx = _slidePx * _direction * (1 - t);
    } else {
      opacity = 1 - t;
      dx = -_slidePx * _direction * t;
    }

    return IgnorePointer(
      ignoring: !isCurrent,
      child: TickerMode(
        enabled: isCurrent,
        child: Opacity(
          opacity: opacity.clamp(0.0, 1.0),
          child: Transform.translate(offset: Offset(dx, 0), child: child),
        ),
      ),
    );
  }
}

class PulseScaffold extends StatelessWidget {
  const PulseScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.extendBody = false,
    this.clearFabForTabBar = false,
    this.resizeToAvoidBottomInset,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool extendBody;
  final bool? resizeToAvoidBottomInset;

  /// Lift [floatingActionButton] above the shell tab bar when needed.
  final bool clearFabForTabBar;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final fab = floatingActionButton;
    final liftedFab = fab == null || !clearFabForTabBar
        ? fab
        : Padding(padding: pulseFabPadding(context), child: fab);

    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: appBar,
      body: body,
      floatingActionButton: liftedFab,
      bottomNavigationBar: bottomNavigationBar,
      extendBody: extendBody,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
    );
  }
}

class PulseSheet extends StatelessWidget {
  const PulseSheet({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final radius = BorderRadius.circular(20);
    final content = Material(
      color: colors.sheet,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? Padding(padding: padding, child: child)
          : InkWell(
              onTap: onTap,
              child: Padding(padding: padding, child: child),
            ),
    );

    return content;
  }
}

class SignalButton extends StatelessWidget {
  const SignalButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final button = FilledButton(onPressed: onPressed, child: Text(label));
    if (!expand) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

class PulseTabItem {
  const PulseTabItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.badgeCount = 0,
    this.tourKey,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final int badgeCount;
  final GlobalKey? tourKey;
}

class PulseNavRail extends StatelessWidget {
  const PulseNavRail({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    this.barTourKey,
    this.fab,
  });

  final List<PulseTabItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final GlobalKey? barTourKey;
  final Widget? fab;

  void _selectIndex(int index) {
    final next = index.clamp(0, items.length - 1);
    if (next == selectedIndex) return;
    PulseHaptics.selection();
    onSelect(next);
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final top = MediaQuery.paddingOf(context).top;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Material(
      color: colors.sheet,
      child: KeyedSubtree(
        key: barTourKey,
        child: SizedBox(
          width: kPulseNavRailWidth,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(right: BorderSide(color: colors.border)),
            ),
            child: Padding(
              padding: EdgeInsets.only(top: top + 8, bottom: bottom + 8),
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      children: [
                        for (var i = 0; i < items.length; i++)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: KeyedSubtree(
                              key: items[i].tourKey,
                              child: _PulseRailDestination(
                                item: items[i],
                                selected: i == selectedIndex,
                                brand: brand,
                                onTap: () => _selectIndex(i),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (fab != null) ...[
                    const SizedBox(height: 8),
                    fab!,
                    const SizedBox(height: 4),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PulseRailDestination extends StatelessWidget {
  const _PulseRailDestination({
    required this.item,
    required this.selected,
    required this.brand,
    required this.onTap,
  });

  final PulseTabItem item;
  final bool selected;
  final Color brand;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final theme = Theme.of(context);

    return Tooltip(
      message: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Semantics(
          button: true,
          selected: selected,
          label: item.label,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 240),
            curve: Curves.easeOutCubic,
            constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: selected
                  ? brand.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      selected ? item.selectedIcon : item.icon,
                      size: 24,
                      color: selected ? brand : colors.muted,
                    ),
                    if (item.badgeCount > 0)
                      Positioned(
                        right: -4,
                        top: -2,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: brand,
                            shape: BoxShape.circle,
                            border: Border.all(color: colors.sheet, width: 1.5),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontSize: 10.5,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    letterSpacing: -0.1,
                    color: selected ? brand : colors.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PulseTabBar extends StatelessWidget {
  const PulseTabBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
    this.barTourKey,
  });

  final List<PulseTabItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final GlobalKey? barTourKey;

  void _selectIndex(int index) {
    final next = index.clamp(0, items.length - 1);
    if (next == selectedIndex) return;
    PulseHaptics.selection();
    onSelect(next);
  }

  void _selectAtX(double dx, double width) {
    if (width <= 0 || items.isEmpty) return;
    final index = (dx / width * items.length).floor();
    _selectIndex(index);
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Material(
      color: colors.sheet,
      elevation: 0,
      child: KeyedSubtree(
        key: barTourKey,
        child: SafeArea(
          top: false,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: colors.border)),
            ),
            child: SizedBox(
              height: kPulseTabBarPillHeight,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onHorizontalDragUpdate: (details) {
                      _selectAtX(
                        details.localPosition.dx,
                        constraints.maxWidth,
                      );
                    },
                    onHorizontalDragEnd: (details) {
                      final velocity = details.primaryVelocity ?? 0;
                      if (velocity <= -450) {
                        _selectIndex(selectedIndex + 1);
                      } else if (velocity >= 450) {
                        _selectIndex(selectedIndex - 1);
                      }
                    },
                    child: Row(
                      children: [
                        for (var i = 0; i < items.length; i++)
                          Expanded(
                            child: KeyedSubtree(
                              key: items[i].tourKey,
                              child: _PulseTab(
                                item: items[i],
                                selected: i == selectedIndex,
                                showLabel: true,
                                brand: brand,
                                onTap: () => _selectIndex(i),
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PulseTab extends StatelessWidget {
  const _PulseTab({
    required this.item,
    required this.selected,
    required this.showLabel,
    required this.brand,
    required this.onTap,
  });

  final PulseTabItem item;
  final bool selected;
  final bool showLabel;
  final Color brand;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final theme = Theme.of(context);

    return Tooltip(
      message: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          decoration: BoxDecoration(
            color: selected
                ? brand.withValues(alpha: 0.12)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      selected ? item.selectedIcon : item.icon,
                      size: 22,
                      color: selected ? brand : colors.muted,
                    ),
                    if (item.badgeCount > 0)
                      Positioned(
                        right: -4,
                        top: -2,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: brand,
                            shape: BoxShape.circle,
                            border: Border.all(color: colors.sheet, width: 1.5),
                          ),
                        ),
                      ),
                  ],
                ),
                if (showLabel) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontSize: 10.5,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                      letterSpacing: -0.1,
                      color: selected ? brand : colors.muted,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
