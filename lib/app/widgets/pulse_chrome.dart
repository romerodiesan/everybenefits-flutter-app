import 'package:flutter/material.dart';

import '../pulse_haptics.dart';
import '../theme.dart';

/// Visual height of the floating tab pill (excluding safe-area inset).
const double kPulseTabBarPillHeight = 54;

/// Extra gap between FAB / list content and the floating tab pill.
const double kPulseTabBarFabGap = 20;

/// Matches Material [kFloatingActionButtonMargin].
const double _kFabMargin = 16;

/// Distance from the physical bottom to the top of [PulseTabBar].
double pulseTabBarTopInset(BuildContext context) {
  final viewBottom = MediaQuery.viewPaddingOf(context).bottom;
  final safe = viewBottom > 0 ? viewBottom : 8.0;
  // Tab bar outer bottom pad is `(safe) + 6`, then the pill itself.
  return safe + 6 + kPulseTabBarPillHeight;
}

/// Extra bottom inset so nested FABs clear [PulseTabBar] under [extendBody].
///
/// Scaffold already lifts the FAB by [MediaQuery.padding] + [_kFabMargin];
/// this only adds what's still needed above the floating pill.
double pulseFabClearance(BuildContext context) {
  final padBottom = MediaQuery.paddingOf(context).bottom;
  final alreadyCleared = padBottom + _kFabMargin;
  final needed = pulseTabBarTopInset(context) + kPulseTabBarFabGap - alreadyCleared;
  return needed < kPulseTabBarFabGap ? kPulseTabBarFabGap : needed;
}

/// List / scroll bottom padding that clears the floating tab bar.
double pulseShellListBottomPad(
  BuildContext context, {
  bool hasFab = false,
}) {
  final clearance = pulseTabBarTopInset(context) + kPulseTabBarFabGap;
  return hasFab ? clearance + 56 : clearance;
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
        child: TickerMode(
          enabled: false,
          child: child,
        ),
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
          child: Transform.translate(
            offset: Offset(dx, 0),
            child: child,
          ),
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
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool extendBody;

  /// Lift [floatingActionButton] above the shell's floating [PulseTabBar].
  final bool clearFabForTabBar;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final fab = floatingActionButton;
    final liftedFab = fab == null || !clearFabForTabBar
        ? fab
        : Padding(
            padding: pulseFabPadding(context),
            child: fab,
          );

    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: appBar,
      body: body,
      floatingActionButton: liftedFab,
      bottomNavigationBar: bottomNavigationBar,
      extendBody: extendBody,
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
    final button = FilledButton(
      onPressed: onPressed,
      child: Text(label),
    );
    if (!expand) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

class PulseTabItem {
  const PulseTabItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

class PulseTabBar extends StatelessWidget {
  const PulseTabBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
  });

  final List<PulseTabItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

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
    final bottom = MediaQuery.paddingOf(context).bottom;
    final wide = MediaQuery.sizeOf(context).width >= 390;

    return Material(
      type: MaterialType.transparency,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, (bottom > 0 ? bottom : 8) + 6),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.sheet.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: colors.border),
            boxShadow: [
              BoxShadow(
                color: colors.ink.withValues(alpha: 0.07),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onHorizontalDragUpdate: (details) {
                    _selectAtX(details.localPosition.dx, constraints.maxWidth);
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
                          flex: wide && i == selectedIndex ? 16 : 12,
                          child: _PulseTab(
                            item: items[i],
                            selected: i == selectedIndex,
                            showLabel: wide && i == selectedIndex,
                            brand: brand,
                            onTap: () => _selectIndex(i),
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
          height: 44,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: EdgeInsets.symmetric(horizontal: showLabel ? 10 : 0),
          decoration: BoxDecoration(
            color: selected ? brand.withValues(alpha: 0.14) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                selected ? item.selectedIcon : item.icon,
                size: 22,
                color: selected ? brand : colors.muted,
              ),
              if (showLabel) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.1,
                      color: colors.ink,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

