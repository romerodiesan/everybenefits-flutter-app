import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_service.dart';

class MagicLinkEmailStore {
  static const _key = 'pending_magic_link_email';

  static Future<void> save(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, email.trim());
  }

  static Future<String?> read() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
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
