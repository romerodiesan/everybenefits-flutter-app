import 'package:flutter/material.dart';

import '../theme.dart';
import 'pulse_breakpoints.dart';

/// Bottom sheet on phone; centered dialog on tablet.
Future<T?> showPulseSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  Color? backgroundColor,
  ShapeBorder? shape,
  bool isScrollControlled = false,
  bool showDragHandle = false,
}) {
  final colors = AppColors.of(context);
  final bg = backgroundColor ?? colors.sheet;
  final sheetShape = shape ??
      const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      );

  if (PulseWindowClass.of(context) == PulseWindowClass.expanded) {
    return showDialog<T>(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: bg == Colors.transparent ? colors.sheet : bg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520, maxHeight: 720),
            child: builder(ctx),
          ),
        );
      },
    );
  }

  return showModalBottomSheet<T>(
    context: context,
    backgroundColor: bg,
    shape: sheetShape,
    isScrollControlled: isScrollControlled,
    showDragHandle: showDragHandle,
    builder: builder,
  );
}
