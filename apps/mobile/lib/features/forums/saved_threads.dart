import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Same key/shape as Pulse web `pulse-saved-threads`.
const kSavedThreadsKey = 'pulse-saved-threads';

class SavedThreadsStore {
  SavedThreadsStore({SharedPreferences? prefs}) : _prefsOverride = prefs;

  final SharedPreferences? _prefsOverride;
  final _listeners = <void Function()>{};
  Set<String>? _cache;

  Future<SharedPreferences> get _prefs async =>
      _prefsOverride ?? SharedPreferences.getInstance();

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);

  void _emit() {
    for (final listener in _listeners) {
      listener();
    }
  }

  Future<Set<String>> readIds() async {
    if (_cache != null) return Set<String>.from(_cache!);
    final prefs = await _prefs;
    final raw = prefs.getString(kSavedThreadsKey);
    if (raw == null || raw.isEmpty) {
      _cache = {};
      return {};
    }
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! List) {
        _cache = {};
        return {};
      }
      _cache = {
        for (final item in parsed)
          if (item is String && item.isNotEmpty) item,
      };
      return Set<String>.from(_cache!);
    } catch (_) {
      _cache = {};
      return {};
    }
  }

  Future<void> _write(Set<String> ids) async {
    _cache = Set<String>.from(ids);
    final prefs = await _prefs;
    await prefs.setString(kSavedThreadsKey, jsonEncode(ids.toList()));
    _emit();
  }

  Future<bool> isSaved(String threadId) async {
    return (await readIds()).contains(threadId);
  }

  bool isSavedSync(String threadId) => _cache?.contains(threadId) ?? false;

  Future<void> toggle(String threadId) async {
    final ids = await readIds();
    if (ids.contains(threadId)) {
      ids.remove(threadId);
    } else {
      ids.add(threadId);
    }
    await _write(ids);
  }

  Future<void> remove(String threadId) async {
    final ids = await readIds();
    if (ids.remove(threadId)) {
      await _write(ids);
    }
  }

  Future<void> warm() async {
    await readIds();
  }
}
