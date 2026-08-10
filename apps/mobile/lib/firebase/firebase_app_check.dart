import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

import 'firebase_emulators.dart';

/// App Check is currently disabled across Pulse.
///
/// Kept as a no-op so call sites do not need special-casing. Re-enable later by
/// activating providers here and setting FUNCTIONS_ENFORCE_APP_CHECK /
/// PULSE_SSO_REQUIRE_APP_CHECK / PULSE_AI_REQUIRE_APP_CHECK to true.
Future<void> activateFirebaseAppCheck() async {
  try {
    await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(false);
  } catch (_) {}
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
