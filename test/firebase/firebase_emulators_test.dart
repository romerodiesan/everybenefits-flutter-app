import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/firebase/firebase_emulators.dart';

void main() {
  test('firebaseEmulatorHost uses Android loopback on Android', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    expect(firebaseEmulatorHost(), '10.0.2.2');
  });

  test('firebaseEmulatorHost uses localhost loopback on iOS', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    expect(firebaseEmulatorHost(), '127.0.0.1');
  });

  test('useFirebaseEmulators defaults to debug mode', () {
    // Without dart-define override, mirrors kDebugMode (true under flutter test).
    expect(useFirebaseEmulators, isTrue);
  });
}
