import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import '../firebase/firebase_emulators.dart';
import 'auth_exception.dart';
import 'firebase_google_sign_in_gateway.dart';
import 'google_sign_in_gateway.dart';

/// Central Firebase Authentication API for Every Insurance.
///
/// Supports email/password, passwordless email link, phone, Google,
/// backup password linking, and MFA (SMS + TOTP).
class AuthService {
  AuthService({
    FirebaseAuth? auth,
    GoogleSignInGateway? googleSignIn,
  })  : _auth = auth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? FirebaseGoogleSignInGateway();

  final FirebaseAuth _auth;
  final GoogleSignInGateway _googleSignIn;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  bool hasPasswordProvider([User? user]) {
    final u = user ?? _auth.currentUser;
    if (u == null) return false;
    return u.providerData.any((p) => p.providerId == 'password');
  }

  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    String? displayName,
  }) {
    return _guard(() async {
      final cred = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final name = displayName?.trim();
      if (name != null && name.isNotEmpty) {
        await cred.user?.updateDisplayName(name);
      }
      return cred;
    });
  }

  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) {
    return _guard(
      () => _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      ),
    );
  }

  Future<void> sendPasswordResetEmail(String email) {
    return _guard(() => _auth.sendPasswordResetEmail(email: email.trim()));
  }

  Future<void> sendSignInLinkToEmail({
    required String email,
    required ActionCodeSettings actionCodeSettings,
  }) {
    return _guard(
      () => _auth.sendSignInLinkToEmail(
        email: email.trim(),
        actionCodeSettings: actionCodeSettings,
      ),
    );
  }

  bool isSignInWithEmailLink(String link) {
    return _auth.isSignInWithEmailLink(link);
  }

  Future<UserCredential> signInWithEmailLink({
    required String email,
    required String emailLink,
  }) {
    return _guard(
      () => _auth.signInWithEmailLink(
        email: email.trim(),
        emailLink: emailLink,
      ),
    );
  }

  Future<void> verifyPhoneNumber({
    required void Function(PhoneAuthCredential credential)
        onVerificationCompleted,
    required void Function(FirebaseAuthException error) onVerificationFailed,
    required void Function(String verificationId, int? resendToken) onCodeSent,
    required void Function(String verificationId) onCodeAutoRetrievalTimeout,
    String? phoneNumber,
    Duration timeout = const Duration(seconds: 60),
    int? forceResendingToken,
    MultiFactorSession? multiFactorSession,
    PhoneMultiFactorInfo? multiFactorInfo,
  }) {
    return _guard(() async {
      // Must be set before any SMS / MFA phone challenge (Auth emulator).
      if (useFirebaseEmulators) {
        await _auth.setSettings(appVerificationDisabledForTesting: true);
      }
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber?.trim(),
        timeout: timeout,
        forceResendingToken: forceResendingToken,
        verificationCompleted: onVerificationCompleted,
        verificationFailed: onVerificationFailed,
        codeSent: onCodeSent,
        codeAutoRetrievalTimeout: onCodeAutoRetrievalTimeout,
        multiFactorSession: multiFactorSession,
        multiFactorInfo: multiFactorInfo,
      );
    });
  }

  Future<UserCredential> signInWithSmsCode({
    required String verificationId,
    required String smsCode,
  }) {
    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode.trim(),
    );
    return _guard(() => _auth.signInWithCredential(credential));
  }

  Future<UserCredential> signInWithPhoneCredential(
    PhoneAuthCredential credential,
  ) {
    return _guard(() => _auth.signInWithCredential(credential));
  }

  /// Attach a verified phone credential to the signed-in user (profile verify).
  Future<void> updatePhoneNumber(PhoneAuthCredential credential) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      await user.updatePhoneNumber(credential);
    });
  }

  Future<UserCredential?> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        return await _auth.signInWithPopup(GoogleAuthProvider());
      }

      final tokens = await _googleSignIn.authenticate();
      if (tokens == null) return null;

      final credential = GoogleAuthProvider.credential(
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
      );
      return await _auth.signInWithCredential(credential);
    } on AuthException {
      rethrow;
    } on FirebaseAuthMultiFactorException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    } catch (error) {
      throw AuthException.fromUnknown(error);
    }
  }

  /// Link email/password onto the current user (backup for Google-only accounts).
  ///
  /// Uses Identity Toolkit `accounts:update` instead of [User.linkWithCredential],
  /// which incorrectly hits `accounts:signUp` and 400s on the Auth Emulator when
  /// the Google account already owns that email.
  Future<void> linkPassword(String password) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      final email = user.email?.trim();
      if (email == null || email.isEmpty) {
        throw const AuthException(code: 'email-required');
      }
      if (password.length < 6) {
        throw const AuthException(code: 'weak-password');
      }

      final idToken = await user.getIdToken();
      if (idToken == null || idToken.isEmpty) {
        throw const AuthException(code: 'unauthenticated');
      }

      final apiKey = _auth.app.options.apiKey;
      final Uri uri;
      if (useFirebaseEmulators) {
        final host = firebaseEmulatorHost();
        uri = Uri.parse(
          'http://$host:9099/identitytoolkit.googleapis.com/v1/accounts:update'
          '?key=${Uri.encodeQueryComponent(apiKey)}',
        );
      } else {
        uri = Uri.parse(
          'https://identitytoolkit.googleapis.com/v1/accounts:update'
          '?key=${Uri.encodeQueryComponent(apiKey)}',
        );
      }

      final client = http.Client();
      try {
        final response = await client.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'idToken': idToken,
            'email': email,
            'password': password,
            'returnSecureToken': true,
          }),
        );
        Map<String, dynamic>? payload;
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map) {
            payload = Map<String, dynamic>.from(decoded);
          }
        } catch (_) {}

        if (response.statusCode < 200 || response.statusCode >= 300) {
          final error = payload?['error'];
          final message = error is Map
              ? '${error['message'] ?? 'PASSWORD_LINK_FAILED'}'
              : 'PASSWORD_LINK_FAILED';
          if (message.contains('OPERATION_NOT_ALLOWED') ||
              message.contains('INVALID_ID_TOKEN')) {
            final cred = EmailAuthProvider.credential(
              email: email,
              password: password,
            );
            await user.linkWithCredential(cred);
            return;
          }
          throw AuthException(
            code: _toolkitMessageToCode(message),
            message: message,
          );
        }
      } finally {
        client.close();
      }

      // Refresh session so providerData includes password.
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    });
  }

  static String _toolkitMessageToCode(String message) {
    final raw = message.split(':').first.trim().toUpperCase();
    switch (raw) {
      case 'EMAIL_EXISTS':
      case 'EMAIL_ALREADY_IN_USE':
        return 'email-already-in-use';
      case 'WEAK_PASSWORD':
        return 'weak-password';
      case 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN':
        return 'requires-recent-login';
      default:
        return raw.toLowerCase().replaceAll('_', '-');
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      final email = user.email?.trim();
      if (email == null || email.isEmpty) {
        throw const AuthException(code: 'email-required');
      }
      if (newPassword.length < 6) {
        throw const AuthException(code: 'weak-password');
      }
      final cred = EmailAuthProvider.credential(
        email: email,
        password: currentPassword,
      );
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
    });
  }

  /// Confirms identity before MFA enroll/unenroll or account deletion.
  Future<void> reauthenticate({String? password}) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      if (hasPasswordProvider(user)) {
        final email = user.email?.trim();
        if (email == null || email.isEmpty) {
          throw const AuthException(code: 'email-required');
        }
        if (password == null || password.isEmpty) {
          throw const AuthException(code: 'wrong-password');
        }
        await user.reauthenticateWithCredential(
          EmailAuthProvider.credential(email: email, password: password),
        );
        return;
      }
      // Google (or other OAuth): re-run Google credential.
      final tokens = await _googleSignIn.authenticate();
      if (tokens == null) {
        throw const AuthException(code: 'aborted');
      }
      await user.reauthenticateWithCredential(
        GoogleAuthProvider.credential(
          idToken: tokens.idToken,
          accessToken: tokens.accessToken,
        ),
      );
    });
  }

  Future<List<MultiFactorInfo>> listEnrolledFactors() {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) return const [];
      return user.multiFactor.getEnrolledFactors();
    });
  }

  Future<TotpSecret> startTotpEnrollment() {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      final session = await user.multiFactor.getSession();
      return TotpMultiFactorGenerator.generateSecret(session);
    });
  }

  Future<void> finishTotpEnrollment({
    required TotpSecret secret,
    required String oneTimePassword,
    String displayName = 'Authenticator',
  }) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      final assertion = await TotpMultiFactorGenerator.getAssertionForEnrollment(
        secret,
        oneTimePassword.trim(),
      );
      await user.multiFactor.enroll(assertion, displayName: displayName);
    });
  }

  Future<void> enrollPhoneFactor({
    required PhoneAuthCredential credential,
    String displayName = 'Phone',
  }) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      final assertion = PhoneMultiFactorGenerator.getAssertion(credential);
      await user.multiFactor.enroll(assertion, displayName: displayName);
    });
  }

  Future<void> unenrollFactor({
    String? factorUid,
    MultiFactorInfo? multiFactorInfo,
  }) {
    return _guard(() async {
      final user = _auth.currentUser;
      if (user == null) {
        throw const AuthException(code: 'unauthenticated');
      }
      await user.multiFactor.unenroll(
        factorUid: factorUid,
        multiFactorInfo: multiFactorInfo,
      );
    });
  }

  Future<UserCredential> resolveMfaWithTotp({
    required MultiFactorResolver resolver,
    required String enrollmentId,
    required String oneTimePassword,
  }) {
    return _guard(() async {
      final assertion = await TotpMultiFactorGenerator.getAssertionForSignIn(
        enrollmentId,
        oneTimePassword.trim(),
      );
      return resolver.resolveSignIn(assertion);
    });
  }

  Future<UserCredential> resolveMfaWithSms({
    required MultiFactorResolver resolver,
    required PhoneAuthCredential credential,
  }) {
    return _guard(() async {
      final assertion = PhoneMultiFactorGenerator.getAssertion(credential);
      return resolver.resolveSignIn(assertion);
    });
  }

  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _auth.signOut();
    } on AuthException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    } catch (error) {
      throw AuthException.fromUnknown(error);
    }
  }

  Future<T> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on AuthException {
      rethrow;
    } on FirebaseAuthMultiFactorException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    } catch (error) {
      throw AuthException.fromUnknown(error);
    }
  }
}
