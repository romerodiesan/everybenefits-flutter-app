import 'package:flutter/material.dart';

import 'pulse_chrome.dart';

/// Compatibility wrapper — Pulse matte sheet (no glass blur).
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(18),
    this.borderRadius = 20,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    // borderRadius kept for API compat; PulseSheet uses 20 by design.
    return PulseSheet(
      onTap: onTap,
      padding: padding,
      child: child,
    );
  }
}
