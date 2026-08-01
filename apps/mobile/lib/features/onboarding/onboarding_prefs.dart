import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Remembers whether the illustrated onboarding carousel was finished or skipped.
class OnboardingPrefs {
  OnboardingPrefs._();

  static const prefsKey = 'onboarding_completed';

  static Future<bool> hasCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(prefsKey) ?? false;
    } on PlatformException catch (error, stack) {
      debugPrint('OnboardingPrefs.hasCompleted failed: $error\n$stack');
      return false;
    } catch (error, stack) {
      debugPrint('OnboardingPrefs.hasCompleted failed: $error\n$stack');
      return false;
    }
  }

  static Future<void> markCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(prefsKey, true);
    } on PlatformException catch (error, stack) {
      debugPrint('OnboardingPrefs.markCompleted failed: $error\n$stack');
    } catch (error, stack) {
      debugPrint('OnboardingPrefs.markCompleted failed: $error\n$stack');
    }
  }
}
