import 'package:flutter/material.dart';

/// Material 3 window size classes for Pulse, keyed off the shortest side so
/// phones stay compact in landscape.
enum PulseWindowClass {
  compact,
  medium,
  expanded;

  static const double compactMax = 600;
  static const double mediumMax = 840;

  static PulseWindowClass fromSize(Size size) {
    final shortest = size.shortestSide;
    if (shortest < compactMax) return PulseWindowClass.compact;
    if (shortest < mediumMax) return PulseWindowClass.medium;
    return PulseWindowClass.expanded;
  }

  static PulseWindowClass of(BuildContext context) {
    return fromSize(MediaQuery.sizeOf(context));
  }

  bool get useRail => this != PulseWindowClass.compact;

  bool get useMasterDetail => this == PulseWindowClass.expanded;

  bool get useCatalogGrid => this != PulseWindowClass.compact;

  int get catalogColumns => switch (this) {
        PulseWindowClass.compact => 1,
        PulseWindowClass.medium => 2,
        PulseWindowClass.expanded => 3,
      };
}

/// True when a two-pane list/detail layout should replace a full-screen push.
///
/// Uses current width (not shortest side) so iPad landscape splits while
/// Flutter's default 800×600 test surface does not.
bool pulseUseMasterDetail(BuildContext context) {
  return MediaQuery.sizeOf(context).width >= PulseWindowClass.mediumMax;
}

bool pulseUseRail(BuildContext context) =>
    PulseWindowClass.of(context).useRail;

bool pulseUseLandscapeSplit(BuildContext context) {
  return PulseWindowClass.of(context).useRail &&
      MediaQuery.orientationOf(context) == Orientation.landscape;
}

abstract final class PulseContentWidth {
  static const double feed = 680;
  static const double form = 720;
  static const double shell = 1100;
  static const double inbox = 360;
}
