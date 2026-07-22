import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import '../app_spacing.dart';
import '../theme.dart';

class FloatingNavItem {
  const FloatingNavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Full-width floating dock — icons only, liquid-glass surface.
class FloatingNavBar extends StatelessWidget {
  const FloatingNavBar({
    super.key,
    required this.selectedIndex,
    required this.onSelect,
    required this.items,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final List<FloatingNavItem> items;

  static const double _inset = 8;
  static const double _barHeight = 56;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isLight ? 0.08 : 0.35),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: GlassContainer(
        useOwnLayer: true,
        height: _barHeight,
        width: double.infinity,
        shape: const LiquidRoundedSuperellipse(borderRadius: 28),
        clipBehavior: Clip.antiAlias,
        settings: LiquidGlassSettings(
          thickness: isLight ? 26 : 34,
          blur: isLight ? 14 : 10,
          glassColor: isLight
              ? const Color(0x38FFFFFF)
              : const Color(0x330A1510),
          lightIntensity: isLight ? 1.1 : 0.9,
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final trackWidth = constraints.maxWidth - _inset * 2;
            final itemExtent = trackWidth / items.length;

            return Stack(
              children: [
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 320),
                  curve: Curves.easeOutCubic,
                  left: _inset + selectedIndex * itemExtent,
                  top: 6,
                  bottom: 6,
                  width: itemExtent,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: AppColors.brand.withValues(
                          alpha: isLight ? 0.1 : 0.28,
                        ),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
                for (var i = 0; i < items.length; i++)
                  Positioned(
                    left: _inset + i * itemExtent,
                    top: 0,
                    bottom: 0,
                    width: itemExtent,
                    child: _NavIcon(
                      item: items[i],
                      selected: i == selectedIndex,
                      onTap: () => onSelect(i),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final FloatingNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: item.label,
      child: Semantics(
        button: true,
        selected: selected,
        label: item.label,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Center(
            child: AnimatedScale(
              scale: selected ? 1.08 : 1,
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              child: Icon(
                selected ? item.selectedIcon : item.icon,
                size: 24,
                color: selected
                    ? AppColors.brand
                    : AppColors.of(context).muted,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

double floatingNavClearance(BuildContext context) {
  return MediaQuery.paddingOf(context).bottom + 64 + AppSpacing.md;
}
