import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

import 'firebase_emulators.dart';

/// Activates App Check for production/staging builds.
///
/// Skipped while talking to local emulators — App Check tokens are not needed
/// (and fail loudly with "App not registered" / attestation errors).
///
/// Debug builds against real Firebase need the printed debug token registered
/// in Firebase Console → App Check → Manage debug tokens.
Future<void> activateFirebaseAppCheck() async {
  if (useFirebaseEmulators) {
    // Prevent leftover DeviceCheck / attestation traffic after hot restart.
    try {
      await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(false);
    } catch (_) {}
    debugPrint('App Check skipped (Firebase emulators)');
    return;
  }

  try {
    await FirebaseAppCheck.instance.activate(
      providerApple: kDebugMode
          ? const AppleDebugProvider()
          : const AppleAppAttestWithDeviceCheckFallbackProvider(),
      providerAndroid: kDebugMode
          ? const AndroidDebugProvider()
          : const AndroidPlayIntegrityProvider(),
    );
  } catch (error, stack) {
    // Never block app start on App Check; log once for operators.
    debugPrint('App Check activate failed: $error');
    debugPrint('$stack');
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
