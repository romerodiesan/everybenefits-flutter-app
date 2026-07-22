import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
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

/// Host reachable from the current platform to the machine running emulators.
String firebaseEmulatorHost() {
  if (kIsWeb) return '127.0.0.1';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return '10.0.2.2';
    default:
      // IPv4 loopback — `localhost` can resolve to ::1 and miss the emulator.
      return '127.0.0.1';
  }
}

/// Whether [host] looks like a local Firestore emulator binding.
bool looksLikeEmulatorFirestoreHost(String? host, {int port = 8080}) {
  if (host == null || host.isEmpty) return false;
  return host.contains(':$port') || host.endsWith('$port');
}

/// Connects Auth, Firestore, and Storage SDKs to local emulators.
///
/// Call immediately after [Firebase.initializeApp], before any other
/// Firestore use (including [UserRepository]).
///
/// Critical FlutterFire/iOS detail: the native pigeon app captures Firestore
/// settings on **first** real Firestore call (`collection` / `doc` / etc.) and
/// never updates them afterwards. Calling [FirebaseFirestore.terminate] or
/// [FirebaseFirestore.clearPersistence] before the emulator host is set creates
/// that snapshot with production defaults — Dart will still report an emulator
/// host later, but traffic goes to production (permission-denied for emulator
/// Auth tokens). So: set settings first, and never terminate/clear here.
Future<void> connectFirebaseEmulators({
  String? host,
  int authPort = 9099,
  int firestorePort = 8080,
  int storagePort = 9199,
}) async {
  if (!useFirebaseEmulators) return;

  final emulatorHost = host ?? firebaseEmulatorHost();
  final firestoreEmulator = '$emulatorHost:$firestorePort';

  // 1) Firestore settings FIRST — before Auth or any Firestore API that
  //    materializes the native pigeon app.
  FirebaseFirestore.instance.settings = Settings(
    persistenceEnabled: false,
    sslEnabled: false,
    host: firestoreEmulator,
  );

  // 2) Auth + Storage emulators.
  await FirebaseAuth.instance.useAuthEmulator(emulatorHost, authPort);
  await FirebaseAuth.instance.setSettings(
    appVerificationDisabledForTesting: true,
  );
  await FirebaseStorage.instance.useStorageEmulator(
    emulatorHost,
    storagePort,
  );

  // Avoid mixing a persisted production session with emulator Firestore.
  await FirebaseAuth.instance.signOut();

  final boundHost = FirebaseFirestore.instance.settings.host;
  final sslEnabled = FirebaseFirestore.instance.settings.sslEnabled ?? true;
  debugPrint(
    'Firebase emulators → $emulatorHost '
    '(auth:$authPort firestore:$firestorePort storage:$storagePort) '
    'firestore.settings.host=$boundHost ssl=$sslEnabled',
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
