import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/auth/auth_exception.dart';
import 'package:every_benefits/l10n/app_localizations_en.dart';

void main() {
  final l10n = AppLocalizationsEn();

  test('maps invalid SMS / expired codes', () {
    expect(
      const AuthException(code: 'invalid-verification-code')
          .localizedMessage(l10n),
      l10n.authErrInvalidSms,
    );
    expect(
      const AuthException(code: 'code-expired').localizedMessage(l10n),
      l10n.authErrSmsExpired,
    );
  });

  test('maps invalid login credentials like wrong password', () {
    expect(
      const AuthException(code: 'invalid-login-credentials')
          .localizedMessage(l10n),
      l10n.authErrWrongPassword,
    );
  });

  test('maps user-disabled', () {
    expect(
      const AuthException(code: 'user-disabled').localizedMessage(l10n),
      l10n.authErrUserDisabled,
    );
  });
}
