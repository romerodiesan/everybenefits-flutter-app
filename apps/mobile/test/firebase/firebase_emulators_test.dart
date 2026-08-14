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
    expect(looksLikeEmulatorFirestoreHost('10.0.0.77:8080'), isTrue);
    expect(looksLikeEmulatorFirestoreHost('firestore.googleapis.com'), isFalse);
  });

  test('rewriteEmulatorStorageUrl rewrites loopback and strips v=', () {
    final rewritten = rewriteEmulatorStorageUrl(
      'http://127.0.0.1:9199/v0/b/bucket/o/promo%2Fx.png?alt=media&token=abc&v=1',
      host: '10.0.0.210',
    );
    expect(rewritten, contains('10.0.0.210'));
    expect(rewritten, isNot(contains('127.0.0.1')));
    expect(rewritten, isNot(contains('v=1')));
    expect(rewritten, contains('token=abc'));
  });
}
