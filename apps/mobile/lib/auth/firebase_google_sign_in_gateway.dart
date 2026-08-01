import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';

import 'google_sign_in_gateway.dart';

/// Default [GoogleSignInGateway] backed by `google_sign_in` 7.x.
class FirebaseGoogleSignInGateway implements GoogleSignInGateway {
  FirebaseGoogleSignInGateway({GoogleSignIn? googleSignIn})
      : _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final GoogleSignIn _googleSignIn;
  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized || kIsWeb) return;
    await _googleSignIn.initialize();
    _initialized = true;
  }

  @override
  Future<GoogleIdToken?> authenticate() async {
    if (kIsWeb) {
      // Web uses Firebase popup; gateway is unused there.
      return null;
    }

    await _ensureInitialized();
    try {
      final account = await _googleSignIn.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) return null;
      return GoogleIdToken(idToken: idToken);
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<void> signOut() async {
    if (kIsWeb) return;
    await _ensureInitialized();
    await _googleSignIn.signOut();
  }
}
