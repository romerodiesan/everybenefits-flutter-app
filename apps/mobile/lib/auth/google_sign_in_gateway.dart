/// Platform-agnostic Google identity result used by [AuthService].
class GoogleIdToken {
  const GoogleIdToken({required this.idToken, this.accessToken});

  final String idToken;
  final String? accessToken;
}

/// Abstraction over `google_sign_in` so AuthService stays unit-testable.
abstract class GoogleSignInGateway {
  Future<GoogleIdToken?> authenticate();

  Future<void> signOut();
}
