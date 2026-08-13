import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Same key/shape as Pulse web `pulse_promo_dismiss_v1`.
const kPromoBannerDismissKey = 'pulse_promo_dismiss_v1';

class PromoBannerDismissStore {
  PromoBannerDismissStore({SharedPreferences? prefs}) : _prefsOverride = prefs;

  final SharedPreferences? _prefsOverride;
  Map<String, int>? _cache;

  Future<SharedPreferences> get _prefs async =>
      _prefsOverride ?? SharedPreferences.getInstance();

  Future<Map<String, int>> _readMap() async {
    if (_cache != null) return Map<String, int>.from(_cache!);
    final prefs = await _prefs;
    final raw = prefs.getString(kPromoBannerDismissKey);
    if (raw == null || raw.isEmpty) {
      _cache = {};
      return {};
    }
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! Map) {
        _cache = {};
        return {};
      }
      final out = <String, int>{};
      for (final entry in parsed.entries) {
        final value = entry.value;
        if (value is num && value.isFinite) {
          out[entry.key.toString()] = value.toInt();
        }
      }
      _cache = out;
      return Map<String, int>.from(out);
    } catch (_) {
      _cache = {};
      return {};
    }
  }

  Future<void> _writeMap(Map<String, int> map) async {
    _cache = Map<String, int>.from(map);
    final prefs = await _prefs;
    await prefs.setString(kPromoBannerDismissKey, jsonEncode(map));
  }

  /// True when the user dismissed this banner id at the same or higher version.
  Future<bool> isDismissed(String bannerId, int version) async {
    final seen = (await _readMap())[bannerId];
    if (seen == null) return false;
    return seen >= version;
  }

  Future<void> dismiss(String bannerId, int version) async {
    final map = await _readMap();
    map[bannerId] = version;
    await _writeMap(map);
  }

  /// Sync filter when the dismiss map was already loaded into memory.
  bool isDismissedSync(String bannerId, int version) {
    final seen = _cache?[bannerId];
    if (seen == null) return false;
    return seen >= version;
  }

  Future<void> warm() async {
    await _readMap();
  }
}
