import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/firebase/firebase_emulators.dart';

void main() {
  test('firebaseEmulatorHost uses Android loopback on Android', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    // Override empty in tests unless dart-define is passed.
    if (kFirebaseEmulatorHostOverride.trim().isEmpty) {
      expect(firebaseEmulatorHost(), '10.0.2.2');
    }
  });

  test('firebaseEmulatorHost uses localhost loopback on iOS', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    if (kFirebaseEmulatorHostOverride.trim().isEmpty) {
      expect(firebaseEmulatorHost(), '127.0.0.1');
    }
  });

  test('useFirebaseEmulators defaults to debug mode', () {
    // Without dart-define override, mirrors kDebugMode (true under flutter test).
    expect(useFirebaseEmulators, isTrue);
  });

  test('looksLikeEmulatorFirestoreHost detects bound host', () {
    expect(looksLikeEmulatorFirestoreHost('127.0.0.1:8080'), isTrue);
    expect(looksLikeEmulatorFirestoreHost('192.168.1.10:8080'), isTrue);
    expect(looksLikeEmulatorFirestoreHost('firestore.googleapis.com'), isFalse);
  });
}
