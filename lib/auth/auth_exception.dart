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
