import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../firebase/firebase_emulators.dart';

/// Local opt-in for product analytics. Default is off (privacy-first).
class TelemetryPrefs {
  TelemetryPrefs._();

  static const analyticsKey = 'telemetry_analytics_enabled';

  static Future<bool> isAnalyticsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(analyticsKey) ?? false;
  }

  static Future<void> setAnalyticsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(analyticsKey, enabled);
    await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(
      enabled && !useFirebaseEmulators,
    );
  }
}

/// Crash reporting (release only) + consent-gated Analytics.
///
/// Crashlytics stays on in non-debug builds so fatal crashes are actionable.
/// Analytics stays off until the user opts in from Settings.
Future<void> initTelemetry() async {
  try {
    // Native Analytics still pings google-analytics.com at Firebase.initializeApp.
    // Keep collection off on emulators so debug TLS noise isn't mixed with local Auth.
    final analyticsEnabled = !useFirebaseEmulators &&
        await TelemetryPrefs.isAnalyticsEnabled();

    // Emulators / debug: never ship crash reports to production Crashlytics.
    final crashEnabled = !kIsWeb && !kDebugMode && !useFirebaseEmulators;

    if (!kIsWeb) {
      await FirebaseCrashlytics.instance
          .setCrashlyticsCollectionEnabled(crashEnabled);

      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        if (crashEnabled) {
          FirebaseCrashlytics.instance.recordFlutterFatalError(details);
        } else {
          debugPrint('[FlutterError] ${details.exceptionAsString()}');
          if (details.stack != null) {
            debugPrint(details.stack.toString());
          }
        }
      };

      PlatformDispatcher.instance.onError = (error, stack) {
        if (crashEnabled) {
          FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        } else {
          debugPrint('[PlatformError] $error\n$stack');
        }
        return true;
      };
    }

    await FirebaseAnalytics.instance
        .setAnalyticsCollectionEnabled(analyticsEnabled);
  } catch (e, st) {
    debugPrint('[Telemetry] init failed: $e\n$st');
  }
}

/// Screen view with a stable, non-PII name (e.g. `forums`, `course_detail`).
///
/// No-op when analytics consent is off (collection already disabled).
Future<void> logScreenView(String screenName) async {
  final name = screenName.trim();
  if (name.isEmpty) return;
  try {
    await FirebaseAnalytics.instance.logScreenView(screenName: name);
  } catch (_) {
    // Best-effort; never break UX for analytics.
  }
}
