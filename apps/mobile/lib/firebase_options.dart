// Firebase client options for every-benefits-us (canonical; matches Pulse web).
// ignore_for_file: lines_longer_than_80_chars
//
// Security: restrict these API keys in Google Cloud Console
// (APIs & Services → Credentials) to the app package / bundle ID and enabled
// APIs only. Keys in client apps are public; App Check + rules are the real gate.
//
// Native GOOGLE_APP_ID / appId MUST use platform segments `:ios:` / `:android:`.
// A `:web:` id crashes FIRApp on device ("invalid GOOGLE_APP_ID").
//
// Current mobile appIds are format-valid placeholders for local/emulator runs.
// Register real apps and replace plists + this file:
//   firebase login --reauth
//   firebase apps:create IOS --bundle-id com.everybenefits.everyinsurance \
//     --project every-benefits-us
//   firebase apps:sdkconfig IOS <appId> --project every-benefits-us -o \
//     apps/mobile/ios/Runner/GoogleService-Info.plist
//   (same for ANDROID / google-services.json)

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

  /// Same public web app as Pulse / Studio / Admin (every-benefits-us).
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyD7SRc2CY4ggUITwIqXNp1i1SPmcsTc-xk',
    appId: '1:1001601265155:web:f03d9d5d1f14602dd8e836',
    messagingSenderId: '1001601265155',
    projectId: 'every-benefits-us',
    authDomain: 'every-benefits-us.firebaseapp.com',
    storageBucket: 'every-benefits-us.appspot.com',
    databaseURL: 'https://every-benefits-us-default-rtdb.firebaseio.com',
    measurementId: 'G-BM8TQCEQQN',
  );

  /// Placeholder `:android:` appId — replace after firebase apps:create ANDROID.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyD7SRc2CY4ggUITwIqXNp1i1SPmcsTc-xk',
    appId: '1:1001601265155:android:0261ba55ef35c1a0',
    messagingSenderId: '1001601265155',
    projectId: 'every-benefits-us',
    storageBucket: 'every-benefits-us.appspot.com',
    databaseURL: 'https://every-benefits-us-default-rtdb.firebaseio.com',
  );

  /// Placeholder `:ios:` appId — replace after firebase apps:create IOS.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyD7SRc2CY4ggUITwIqXNp1i1SPmcsTc-xk',
    appId: '1:1001601265155:ios:cb529635090fda32',
    messagingSenderId: '1001601265155',
    projectId: 'every-benefits-us',
    storageBucket: 'every-benefits-us.appspot.com',
    databaseURL: 'https://every-benefits-us-default-rtdb.firebaseio.com',
    iosBundleId: 'com.everybenefits.everyinsurance',
  );
}
