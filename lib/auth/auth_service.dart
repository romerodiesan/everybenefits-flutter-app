import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'auth_exception.dart';
import 'firebase_google_sign_in_gateway.dart';
import 'google_sign_in_gateway.dart';

/// Central Firebase Authentication API for Every Insurance.
///
/// Supports email/password, passwordless email link, anonymous, phone, and Google.
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

  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
  }) {
    return _guard(
      () => _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      ),
    );
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

  Future<UserCredential> signInAnonymously() {
    return _guard(_auth.signInAnonymously);
  }

  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    required void Function(PhoneAuthCredential credential) onVerificationCompleted,
    required void Function(FirebaseAuthException error) onVerificationFailed,
    required void Function(String verificationId, int? resendToken) onCodeSent,
    required void Function(String verificationId) onCodeAutoRetrievalTimeout,
    Duration timeout = const Duration(seconds: 60),
    int? forceResendingToken,
  }) {
    return _guard(
      () => _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber.trim(),
        timeout: timeout,
        forceResendingToken: forceResendingToken,
        verificationCompleted: onVerificationCompleted,
        verificationFailed: onVerificationFailed,
        codeSent: onCodeSent,
        codeAutoRetrievalTimeout: onCodeAutoRetrievalTimeout,
      ),
    );
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
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    }
  }

  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _auth.signOut();
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    }
  }

  Future<T> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on FirebaseAuthException catch (error) {
      throw AuthException.fromFirebase(error);
    }
  }
}
