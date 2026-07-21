// File generated manually for FlutterFire (flutterfire configure blocked by xcodeproj).
// ignore_for_file: lines_longer_than_80_chars

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDroJ-XW_BHCRvq9TWEKOInUkEt0jYasXk',
    appId: '1:978334689853:web:bf2108057fa442617d1854',
    messagingSenderId: '978334689853',
    projectId: 'every-insurance',
    authDomain: 'every-insurance.firebaseapp.com',
    storageBucket: 'every-insurance.firebasestorage.app',
    measurementId: 'G-N4LWJZR3TW',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDxEn-G4MK7g2kl8joAiztg3M-WqUVXH8g',
    appId: '1:978334689853:android:da04393db288567a7d1854',
    messagingSenderId: '978334689853',
    projectId: 'every-insurance',
    storageBucket: 'every-insurance.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCqRJ1zBd7kKsv_EYZHIdepmqlPVTFwbpM',
    appId: '1:978334689853:ios:ed3ada3846885b5e7d1854',
    messagingSenderId: '978334689853',
    projectId: 'every-insurance',
    storageBucket: 'every-insurance.firebasestorage.app',
    iosBundleId: 'com.everybenefits.everyinsurance',
  );
}
