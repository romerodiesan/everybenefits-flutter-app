import 'package:flutter/services.dart';

/// Thin wrappers around [HapticFeedback] for Pulse interactions.
abstract final class PulseHaptics {
  static Future<void> selection() => HapticFeedback.selectionClick();

  static Future<void> light() => HapticFeedback.lightImpact();

  static Future<void> medium() => HapticFeedback.mediumImpact();
}
