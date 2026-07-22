import 'package:flutter/material.dart';

import '../theme.dart';

class PulseScaffold extends StatelessWidget {
  const PulseScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.extendBody = false,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool extendBody;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Scaffold(
      backgroundColor: colors.canvas,
      appBar: appBar,
      body: body,
      floatingActionButton: floatingActionButton,
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
                      onTap: () => onSelect(i),
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

