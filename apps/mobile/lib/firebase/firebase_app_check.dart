import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

import 'firebase_emulators.dart';

/// App Check policy for Pulse mobile (ADR-005: not enforced).
///
/// Native iOS: [AppDelegate] replaces Flutter's default DeviceCheck factory with
/// a no-op provider so `exchangeDeviceCheckToken` never hits production.
/// Dart must not call [FirebaseAppCheck.activate] in non-production — activate
/// would reconfigure DeviceCheck / debug exchange against unregistered app IDs.
Future<void> activateFirebaseAppCheck() async {
  try {
    await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(false);
  } catch (_) {}

  if (useFirebaseEmulators || kDebugMode) {
    debugPrint(
      'App Check skipped (non-production; native no-op provider + no activate)',
    );
    return;
  }

  // Production still disabled until Console Monitor → Enforce + real app IDs.
  debugPrint('App Check skipped (disabled — ADR-005)');
}

/// Points Cloud Functions at the local emulator when enabled.
void connectFunctionsEmulator({String? host, int port = 5001}) {
  if (!useFirebaseEmulators) return;
  final emulatorHost = host ?? firebaseEmulatorHost();
  FirebaseFunctions.instanceFor(region: 'us-central1')
      .useFunctionsEmulator(emulatorHost, port);
  debugPrint('Functions emulator → $emulatorHost:$port');
}
