import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;

import '../firebase/firebase_emulators.dart';
import '../l10n/app_localizations.dart';

class AuthException implements Exception {
  const AuthException({
    required this.code,
    this.message,
  });

  final String code;
  final String? message;

  factory AuthException.fromFirebase(FirebaseAuthException error) {
    return AuthException(code: error.code, message: error.message);
  }

  /// Maps socket / emulator / unexpected failures into a usable [AuthException].
  factory AuthException.fromUnknown(Object error) {
    final text = error.toString().toLowerCase();
    if (text.contains('connection refused') ||
        text.contains('failed host lookup') ||
        text.contains('network is unreachable') ||
        text.contains('socketexception') ||
        text.contains('clientexception') ||
        text.contains('xmlhttprequest error') ||
        text.contains('unavailable')) {
      return AuthException(
        code: 'emulator-unreachable',
        message: error.toString(),
      );
    }
    if (text.contains('permission-denied') ||
        text.contains('missing or insufficient permissions') ||
        text.contains('permission_denied')) {
      return AuthException(
        code: 'permission-denied',
        message: error.toString(),
      );
    }
    return AuthException(
      code: 'unknown',
      message: error.toString(),
    );
  }

  /// Message suitable for SnackBars / form errors.
  String localizedMessage(AppLocalizations l10n) {
    switch (code) {
      case 'invalid-email':
        return l10n.authErrInvalidEmail;
      case 'user-disabled':
        return l10n.authErrUserDisabled;
      case 'user-not-found':
        return l10n.authErrUserNotFound;
      case 'wrong-password':
      case 'invalid-credential':
      case 'invalid-login-credentials':
        return l10n.authErrWrongPassword;
      case 'email-already-in-use':
        return l10n.authErrEmailInUse;
      case 'weak-password':
        return l10n.authErrWeakPassword;
      case 'too-many-requests':
        return l10n.authErrTooManyRequests;
      case 'network-request-failed':
        if (useFirebaseEmulators) {
          return l10n.authErrEmulatorUnreachable;
        }
        return l10n.authErrNetwork;
      case 'emulator-unreachable':
        return l10n.authErrEmulatorUnreachable;
      case 'permission-denied':
        return l10n.authErrPermission;
      case 'invalid-phone-number':
        return l10n.authErrInvalidPhone;
      case 'requires-recent-login':
        return l10n.authErrRequiresRecentLogin;
      case 'email-required':
        return l10n.authErrEmailRequired;
      case 'unauthenticated':
        return l10n.authErrUnauthenticated;
      case 'credential-already-in-use':
        return l10n.authErrCredentialInUse;
      case 'invalid-verification-code':
      case 'code-expired':
      case 'session-expired':
        return code == 'session-expired' || code == 'code-expired'
            ? l10n.authErrSmsExpired
            : l10n.authErrInvalidSms;
      case 'operation-not-allowed':
        return l10n.authErrOpNotAllowed;
      default:
        return message?.trim().isNotEmpty == true
            ? message!
            : l10n.authErrUnknown(code);
    }
  }

  @override
  String toString() => 'AuthException($code): ${message ?? ''}';
}

/// Resolves [AuthException] (or unknown) into a localized user message.
String authErrorMessage(Object error, AppLocalizations l10n) {
  if (error is AuthException) return error.localizedMessage(l10n);
  return AuthException.fromUnknown(error).localizedMessage(l10n);
}
