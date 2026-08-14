import 'package:flutter/material.dart';

import '../app_spacing.dart';
import 'pulse_breakpoints.dart';

export 'pulse_breakpoints.dart';

/// Centers [child] with a reading/form max width on tablet.
class PulseConstrained extends StatelessWidget {
  const PulseConstrained({
    super.key,
    required this.child,
    this.maxWidth = PulseContentWidth.form,
    this.padding,
    this.align = Alignment.topCenter,
  });

  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;
  final Alignment align;

  @override
  Widget build(BuildContext context) {
    final window = PulseWindowClass.of(context);
    final inset = padding ??
        EdgeInsets.symmetric(
          horizontal: window.useRail ? AppSpacing.xl : 0,
        );
    return Align(
      alignment: align,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(padding: inset, child: child),
      ),
    );
  }
}

class PulseSplitView extends StatelessWidget {
  const PulseSplitView({
    super.key,
    required this.master,
    required this.detail,
    this.masterWidth = PulseContentWidth.inbox,
  });

  final Widget master;
  final Widget detail;
  final double masterWidth;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).dividerColor;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          width: masterWidth.clamp(280.0, 420.0),
          child: master,
        ),
        VerticalDivider(width: 1, thickness: 1, color: colors),
        Expanded(child: detail),
      ],
    );
  }
}
