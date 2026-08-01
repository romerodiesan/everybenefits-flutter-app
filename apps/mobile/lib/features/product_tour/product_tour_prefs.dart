import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Current Pulse product-tour version. Bump to re-show a “what’s new” tour.
const int kProductTourVersion = 2;

/// Local mirror so the overlay does not flash before Firestore catches up.
class ProductTourPrefs {
  ProductTourPrefs._();

  static const prefsKey = 'pulse_product_tour_v1';

  static Future<bool> hasCompletedCurrent() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getInt(prefsKey) ?? 0) >= kProductTourVersion;
    } on PlatformException catch (error, stack) {
      debugPrint('ProductTourPrefs.hasCompletedCurrent failed: $error\n$stack');
      return false;
    } catch (error, stack) {
      debugPrint('ProductTourPrefs.hasCompletedCurrent failed: $error\n$stack');
      return false;
    }
  }

  static Future<void> markCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(prefsKey, kProductTourVersion);
    } on PlatformException catch (error, stack) {
      debugPrint('ProductTourPrefs.markCompleted failed: $error\n$stack');
    } catch (error, stack) {
      debugPrint('ProductTourPrefs.markCompleted failed: $error\n$stack');
    }
  }
}

bool shouldShowProductTour({
  required bool isAnonymous,
  required bool profileCompleted,
  required int productTourVersion,
  required bool localDone,
}) {
  if (isAnonymous) return false;
  if (!profileCompleted) return false;
  if (productTourVersion >= kProductTourVersion) return false;
  if (localDone) return false;
  return true;
}
