import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

import 'firebase_emulators.dart';

/// App Check is currently disabled across Pulse (ADR-005).
///
/// Native iOS may still attempt DeviceCheck exchange if a prior session
/// activated App Check — we force-disable refresh and, in debug/emulator,
/// install a no-op debug provider so production App Check is not hit.
Future<void> activateFirebaseAppCheck() async {
  try {
    await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(false);
  } catch (_) {}

  if (useFirebaseEmulators || kDebugMode) {
    try {
      // Debug provider avoids DeviceCheck → production "App not registered".
      await FirebaseAppCheck.instance.activate(
        providerApple: const AppleDebugProvider(),
        providerAndroid: const AndroidDebugProvider(),
      );
      await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(false);
    } catch (error) {
      debugPrint('App Check debug provider skipped: $error');
    }
  }

  if (kDebugMode) {
    debugPrint('App Check skipped (disabled)');
  }
}

/// Points Cloud Functions at the local emulator when enabled.
void connectFunctionsEmulator({String? host, int port = 5001}) {
  if (!useFirebaseEmulators) return;
  final emulatorHost = host ?? firebaseEmulatorHost();
  FirebaseFunctions.instanceFor(region: 'us-central1')
      .useFunctionsEmulator(emulatorHost, port);
  debugPrint('Functions emulator → $emulatorHost:$port');
}
