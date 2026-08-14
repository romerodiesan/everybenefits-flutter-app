import 'dart:io';

import 'package:flutter/services.dart';

class PulsePip {
  static const _channel = MethodChannel('pulse/pip');

  static Future<bool> enter() async {
    if (!Platform.isAndroid) return false;
    try {
      final ok = await _channel.invokeMethod<bool>('enter');
      return ok == true;
    } catch (_) {
      return false;
    }
  }
}
