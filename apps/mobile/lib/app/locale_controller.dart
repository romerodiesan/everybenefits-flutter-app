import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists and broadcasts the app [Locale] (English / Spanish).
///
/// `null` [locale] means follow the device language when it is `en` or `es`;
/// otherwise default to English.
class LocaleController extends ChangeNotifier {
  LocaleController({Locale? initialLocale}) : _locale = initialLocale;

  static const _prefsKey = 'app_locale';
  static const supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
  ];

  Locale? _locale;

  /// Explicit user choice, or `null` for system.
  Locale? get locale => _locale;

  /// Resolved locale for [MaterialApp.locale].
  Locale resolve(Locale? deviceLocale) {
    if (_locale != null) return _locale!;
    final language = deviceLocale?.languageCode;
    if (language == 'es') return const Locale('es');
    return const Locale('en');
  }

  static Future<LocaleController> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw == null || raw == 'system') {
        return LocaleController();
      }
      return LocaleController(initialLocale: Locale(raw));
    } on PlatformException catch (error, stack) {
      debugPrint('LocaleController.load failed: $error\n$stack');
      return LocaleController();
    } catch (error, stack) {
      debugPrint('LocaleController.load failed: $error\n$stack');
      return LocaleController();
    }
  }

  Future<void> setLocale(Locale? locale) async {
    if (_locale?.languageCode == locale?.languageCode &&
        (_locale == null) == (locale == null)) {
      return;
    }
    _locale = locale;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      if (locale == null) {
        await prefs.setString(_prefsKey, 'system');
      } else {
        await prefs.setString(_prefsKey, locale.languageCode);
      }
    } catch (error, stack) {
      debugPrint('LocaleController.setLocale failed: $error\n$stack');
    }
  }

  Future<void> setLanguageCode(String? code) {
    if (code == null || code == 'system') return setLocale(null);
    return setLocale(Locale(code));
  }
}

class LocaleScope extends InheritedNotifier<LocaleController> {
  const LocaleScope({
    super.key,
    required LocaleController controller,
    required super.child,
  }) : super(notifier: controller);

  static LocaleController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LocaleScope>();
    assert(scope != null, 'LocaleScope not found');
    return scope!.notifier!;
  }
}
