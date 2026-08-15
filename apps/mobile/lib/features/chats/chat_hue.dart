import 'package:flutter/material.dart';

/// Stable hue 0–359 from a display name (keep in sync with web `chatHue`).
int chatHueFromName(String name) {
  var hash = 0;
  for (final unit in name.codeUnits) {
    hash = (hash * 31 + unit) & 0x7fffffff;
  }
  return hash % 360;
}

Color chatTintFill(String name, {required bool dark, double alpha = 0.28}) {
  final hue = chatHueFromName(name).toDouble();
  final lightness = dark ? 0.42 : 0.62;
  return HSLColor.fromAHSL(alpha, hue, 0.48, lightness).toColor();
}

Color chatTintStroke(String name, {required bool dark}) {
  final hue = chatHueFromName(name).toDouble();
  final lightness = dark ? 0.55 : 0.42;
  return HSLColor.fromAHSL(0.45, hue, 0.50, lightness).toColor();
}
