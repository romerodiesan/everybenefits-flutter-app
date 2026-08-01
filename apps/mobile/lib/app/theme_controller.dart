import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Curated primary accent options (persisted by [id]).
class PrimarySeed {
  const PrimarySeed({
    required this.id,
    required this.label,
    required this.color,
  });

  final String id;
  final String label;
  final Color color;
}

const kDefaultPrimarySeedId = 'green';

const kPrimarySeeds = <PrimarySeed>[
  PrimarySeed(id: 'green', label: 'Verde', color: Color(0xFF1F6B4A)),
  PrimarySeed(id: 'amber', label: 'Ámbar', color: Color(0xFFF5A524)),
  PrimarySeed(id: 'teal', label: 'Teal', color: Color(0xFF0D9488)),
  PrimarySeed(id: 'blue', label: 'Azul', color: Color(0xFF2563EB)),
  PrimarySeed(id: 'violet', label: 'Violeta', color: Color(0xFF7C3AED)),
  PrimarySeed(id: 'rose', label: 'Rosa', color: Color(0xFFE11D48)),
];

PrimarySeed primarySeedById(String? id) {
  return kPrimarySeeds.firstWhere(
    (s) => s.id == id,
    orElse: () => kPrimarySeeds.first,
  );
}

/// Persists and broadcasts [ThemeMode] + primary accent seed.
class ThemeController extends ChangeNotifier {
  ThemeController({
    ThemeMode initialMode = ThemeMode.system,
    String initialPrimarySeedId = kDefaultPrimarySeedId,
  })  : _mode = initialMode,
        _primarySeedId = primarySeedById(initialPrimarySeedId).id;

  static const _modeKey = 'theme_mode';
  static const _seedKey = 'primary_seed';

  // Nullable + defaults so hot reload of older ThemeController instances stays safe.
  ThemeMode _mode = ThemeMode.system;
  String? _primarySeedId = kDefaultPrimarySeedId;

  ThemeMode get mode => _mode;
  String get primarySeedId => primarySeedById(_primarySeedId).id;
  Color get primaryColor => primarySeedById(_primarySeedId).color;
  PrimarySeed get primarySeed => primarySeedById(_primarySeedId);

  static Future<ThemeController> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return ThemeController(
        initialMode: _parseMode(prefs.getString(_modeKey)),
        initialPrimarySeedId:
            prefs.getString(_seedKey) ?? kDefaultPrimarySeedId,
      );
    } on PlatformException catch (error, stack) {
      debugPrint('ThemeController.load failed: $error\n$stack');
      return ThemeController();
    } catch (error, stack) {
      debugPrint('ThemeController.load failed: $error\n$stack');
      return ThemeController();
    }
  }

  static ThemeMode _parseMode(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _encodeMode(ThemeMode mode) {
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
      await prefs.setString(_modeKey, _encodeMode(mode));
    } on PlatformException catch (error) {
      debugPrint('ThemeController.setMode persist failed: $error');
    } catch (error) {
      debugPrint('ThemeController.setMode persist failed: $error');
    }
  }

  Future<void> setPrimarySeed(String id) async {
    final next = primarySeedById(id).id;
    if (_primarySeedId == next) return;
    _primarySeedId = next;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_seedKey, next);
    } on PlatformException catch (error) {
      debugPrint('ThemeController.setPrimarySeed persist failed: $error');
    } catch (error) {
      debugPrint('ThemeController.setPrimarySeed persist failed: $error');
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
