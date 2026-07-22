import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists and broadcasts the app [ThemeMode].
class ThemeController extends ChangeNotifier {
  ThemeController({ThemeMode initialMode = ThemeMode.system})
      : _mode = initialMode;

  static const _prefsKey = 'theme_mode';

  ThemeMode _mode;

  ThemeMode get mode => _mode;

  static Future<ThemeController> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return ThemeController(initialMode: _parse(prefs.getString(_prefsKey)));
    } on PlatformException catch (error, stack) {
      // Hot restart after adding the plugin leaves channels unbound until a
      // full native rebuild. Fall back so the app still boots.
      debugPrint('ThemeController.load failed: $error\n$stack');
      return ThemeController();
    } catch (error, stack) {
      debugPrint('ThemeController.load failed: $error\n$stack');
      return ThemeController();
    }
  }

  static ThemeMode _parse(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, _encode(mode));
    } on PlatformException catch (error) {
      debugPrint('ThemeController.setMode persist failed: $error');
    } catch (error) {
      debugPrint('ThemeController.setMode persist failed: $error');
    }
  }
}

class ThemeScope extends InheritedNotifier<ThemeController> {
  const ThemeScope({
    super.key,
    required ThemeController controller,
    required super.child,
  }) : super(notifier: controller);

  static ThemeController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ThemeScope>();
    assert(scope != null, 'ThemeScope not found in widget tree');
    return scope!.notifier!;
  }

  static ThemeController? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<ThemeScope>()?.notifier;
  }
}
