import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_service.dart';

/// Stores the pending magic-link email in platform secure storage (Keychain /
/// Keystore). Falls back to clearing any legacy SharedPreferences value.
class MagicLinkEmailStore {
  static const _key = 'pending_magic_link_email';
  static const _legacyPrefsKey = 'pending_magic_link_email';

  static const FlutterSecureStorage _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<void> save(String email) async {
    final trimmed = email.trim();
    await _secure.write(key: _key, value: trimmed);
    await _clearLegacyPrefs();
  }

  static Future<String?> read() async {
    final fromSecure = await _secure.read(key: _key);
    if (fromSecure != null && fromSecure.trim().isNotEmpty) {
      return fromSecure.trim();
    }

    // One-time migration from plaintext SharedPreferences.
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_legacyPrefsKey);
    if (legacy != null && legacy.trim().isNotEmpty) {
      await _secure.write(key: _key, value: legacy.trim());
      await prefs.remove(_legacyPrefsKey);
      return legacy.trim();
    }
    return null;
  }

  static Future<void> clear() async {
    await _secure.delete(key: _key);
    await _clearLegacyPrefs();
  }

  static Future<void> _clearLegacyPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyPrefsKey);
  }
}

class MagicLinkHandler {
  MagicLinkHandler({
    required this.authService,
    AppLinks? appLinks,
  }) : _appLinks = appLinks ?? AppLinks();

  final AuthService authService;
  final AppLinks _appLinks;
  StreamSubscription<Uri>? _subscription;
  bool _handling = false;

  Future<void> start() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) unawaited(_handle(initial));
    _subscription = _appLinks.uriLinkStream.listen(
      (uri) => unawaited(_handle(uri)),
      onError: (Object error, StackTrace stack) {
        debugPrint('[MagicLink] stream failed: $error\n$stack');
      },
    );
  }

  Future<void> _handle(Uri uri) async {
    if (_handling || !authService.isSignInWithEmailLink(uri.toString())) return;
    _handling = true;
    try {
      final email = await MagicLinkEmailStore.read();
      if (email == null || email.trim().isEmpty) {
        debugPrint('[MagicLink] pending email is unavailable');
        return;
      }
      await authService.signInWithEmailLink(
        email: email,
        emailLink: uri.toString(),
      );
      await MagicLinkEmailStore.clear();
    } catch (error, stack) {
      debugPrint('[MagicLink] sign-in failed: $error\n$stack');
    } finally {
      _handling = false;
    }
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
  }
}
