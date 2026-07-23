import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';

/// Whether this debug session should talk to local Firebase Emulators.
///
/// Defaults to `true` in [kDebugMode]. Override with:
/// `--dart-define=USE_FIREBASE_EMULATORS=false`
/// `--dart-define=USE_FIREBASE_EMULATORS=true`
bool get useFirebaseEmulators {
  const override = String.fromEnvironment('USE_FIREBASE_EMULATORS');
  if (override == 'true') return true;
  if (override == 'false') return false;
  return kDebugMode;
}

/// Optional host override for physical devices on the same LAN.
///
/// Example (iPhone + Mac Wi‑Fi):
/// `flutter run --dart-define=FIREBASE_EMULATOR_HOST=192.168.1.20`
const String kFirebaseEmulatorHostOverride =
    String.fromEnvironment('FIREBASE_EMULATOR_HOST');

/// Host reachable from the current platform to the machine running emulators.
///
/// - Android emulator → `10.0.2.2` (host loopback)
/// - iOS Simulator / desktop → `127.0.0.1`
/// - Physical phone → must pass [kFirebaseEmulatorHostOverride] (your Mac LAN IP)
String firebaseEmulatorHost() {
  final override = kFirebaseEmulatorHostOverride.trim();
  if (override.isNotEmpty) return override;

  if (kIsWeb) return '127.0.0.1';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return '10.0.2.2';
    default:
      // IPv4 loopback — works for simulators only.
      // Physical devices need FIREBASE_EMULATOR_HOST=<Mac LAN IP>.
      return '127.0.0.1';
  }
}

/// Whether [host] looks like a local Firestore emulator binding.
bool looksLikeEmulatorFirestoreHost(String? host, {int port = 8080}) {
  if (host == null || host.isEmpty) return false;
  return host.contains(':$port') || host.endsWith('$port');
}

/// Connects Auth, Firestore, Realtime Database, and Storage SDKs to emulators.
///
/// Call immediately after [Firebase.initializeApp], before any other
/// Firestore / Database use.
///
/// Idempotent across hot restart: native channels survive Dart restarts, and
/// re-binding stacks gRPC connections until the Firestore emulator replies
/// with `GOAWAY too_many_pings`.
Future<void> connectFirebaseEmulators({
  String? host,
  int authPort = 9099,
  int firestorePort = 8080,
  int storagePort = 9199,
  int databasePort = 9000,
}) async {
  if (!useFirebaseEmulators) return;

  final emulatorHost = host ?? firebaseEmulatorHost();
  final firestoreEmulator = '$emulatorHost:$firestorePort';

  // Hot restart resets Dart but keeps the native Firestore client. Re-binding
  // stacks gRPC channels until the emulator replies GOAWAY too_many_pings.
  // Skip whenever we are already talking to *an* emulator on this port
  // (exact host string can differ after IP / override changes mid-session).
  final existingHost = FirebaseFirestore.instance.settings.host;
  if (looksLikeEmulatorFirestoreHost(existingHost, port: firestorePort)) {
    debugPrint(
      'Firebase emulators already bound → $existingHost '
      '(skip rebind; avoids gRPC too_many_pings). '
      'If Auth/Storage seem wrong, fully quit the app and run again.',
    );
    return;
  }

  // 1) Firestore FIRST — before Auth or any API that materializes the native
  //    pigeon app. Prefer the official helper, then force persistence off.
  FirebaseFirestore.instance.useFirestoreEmulator(
    emulatorHost,
    firestorePort,
    automaticHostMapping: false,
  );
  FirebaseFirestore.instance.settings = Settings(
    persistenceEnabled: false,
    sslEnabled: false,
    host: firestoreEmulator,
  );

  // 2) Auth + Storage + Realtime Database emulators.
  await FirebaseAuth.instance.useAuthEmulator(emulatorHost, authPort);
  await FirebaseAuth.instance.setSettings(
    appVerificationDisabledForTesting: true,
  );
  await FirebaseStorage.instance.useStorageEmulator(
    emulatorHost,
    storagePort,
  );
  FirebaseDatabase.instance.useDatabaseEmulator(emulatorHost, databasePort);

  // Avoid mixing a persisted production session with emulator backends.
  // Only on a real (re)bind — not on the hot-restart skip path above.
  await FirebaseAuth.instance.signOut();

  final boundHost = FirebaseFirestore.instance.settings.host;
  final sslEnabled = FirebaseFirestore.instance.settings.sslEnabled ?? true;
  final physicalHint = emulatorHost == '127.0.0.1' || emulatorHost == 'localhost'
      ? ' (physical device? pass --dart-define=FIREBASE_EMULATOR_HOST=<Mac-LAN-IP>)'
      : '';
  debugPrint(
    'Firebase emulators → $emulatorHost '
    '(auth:$authPort firestore:$firestorePort database:$databasePort '
    'storage:$storagePort) '
    'firestore.settings.host=$boundHost ssl=$sslEnabled$physicalHint',
  );
}

/// True when [idToken] looks like an Auth Emulator JWT (`alg: none`).
bool isAuthEmulatorIdToken(String? idToken) {
  if (idToken == null || idToken.isEmpty) return false;
  try {
    final header = idToken.split('.').first;
    final normalized = base64Url.normalize(header);
    final decoded =
        jsonDecode(utf8.decode(base64Url.decode(normalized))) as Map;
    return decoded['alg'] == 'none';
  } catch (_) {
    return false;
  }
}
