import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;

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

  /// Message suitable for SnackBars / form errors (ES).
  String get userMessage {
    switch (code) {
      case 'invalid-email':
        return 'El correo no es válido.';
      case 'user-disabled':
        return 'Esta cuenta está deshabilitada.';
      case 'user-not-found':
        return 'No encontramos una cuenta con ese correo.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'email-already-in-use':
        return 'Ya existe una cuenta con ese correo.';
      case 'weak-password':
        return 'La contraseña es demasiado débil (mín. 6 caracteres).';
      case 'too-many-requests':
        return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
      case 'network-request-failed':
        return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
      case 'emulator-unreachable':
        return 'No se pudo conectar con Firebase. '
            '¿Están corriendo los emuladores locales?';
      case 'permission-denied':
        return 'No tienes permiso para esta acción '
            '(revisa reglas o sesión en el emulador).';
      case 'invalid-phone-number':
        return 'Número de teléfono inválido. Usa formato internacional (+506…).';
      case 'invalid-verification-code':
        return 'El código SMS no es válido.';
      case 'session-expired':
        return 'El código expiró. Solicita uno nuevo.';
      case 'operation-not-allowed':
        return 'Este método de acceso no está habilitado.';
      default:
        return message?.trim().isNotEmpty == true
            ? message!
            : 'No se pudo completar la autenticación ($code).';
    }
  }

  @override
  String toString() => 'AuthException($code): ${message ?? ''}';
}
