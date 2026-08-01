import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/auth/auth_exception.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/features/onboarding/forgot_password_screen.dart';
import 'package:every_benefits/features/onboarding/login_screen.dart';
import 'package:every_benefits/features/onboarding/phone_auth_screen.dart';
import 'package:every_benefits/features/onboarding/register_screen.dart';
import 'package:every_benefits/features/onboarding/welcome_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/l10n/app_localizations_en.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockAuthService extends Mock implements AuthService {}

class FakeUserCredential extends Fake implements UserCredential {}

void main() {
  late MockAuthService auth;

  setUpAll(() {
    registerFallbackValue('');
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    WelcomeScreen.debugAmbientMotion = false;
    auth = MockAuthService();
  });

  tearDown(() {
    WelcomeScreen.debugAmbientMotion = true;
  });

  Future<void> pumpAuth(WidgetTester tester, Widget home) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildPulseTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: home,
      ),
    );
    await tester.pump();
  }

  testWidgets('welcome story advances to auth with Get started', (tester) async {
    await pumpAuth(
      tester,
      WelcomeScreen(
        authService: auth,
        onboardingCompletedOverride: false,
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Learn out loud'), findsOneWidget);

    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
    }

    expect(find.text('Level up your craft'), findsOneWidget);
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();

    expect(find.text('EVERY'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('completed override opens auth page directly', (tester) async {
    await pumpAuth(
      tester,
      WelcomeScreen(
        authService: auth,
        onboardingCompletedOverride: true,
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Learn out loud'), findsNothing);
  });

  testWidgets('login submits email and password', (tester) async {
    when(
      () => auth.signInWithEmail(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    ).thenAnswer((_) async => FakeUserCredential());

    await pumpAuth(tester, LoginScreen(authService: auth));

    await tester.enterText(find.byType(TextFormField).at(0), 'agent@every.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret12');
    await tester.tap(find.text('Sign in').last);
    await tester.pump();

    verify(
      () => auth.signInWithEmail(
        email: 'agent@every.com',
        password: 'secret12',
      ),
    ).called(1);
  });

  testWidgets('register validates password confirmation', (tester) async {
    await pumpAuth(tester, RegisterScreen(authService: auth));

    await tester.enterText(find.byType(TextFormField).at(0), 'agent@every.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret12');
    await tester.enterText(find.byType(TextFormField).at(2), 'different');
    await tester.tap(find.text('Create account').last);
    await tester.pump();

    expect(find.text('Passwords do not match.'), findsOneWidget);
    verifyNever(
      () => auth.signUpWithEmail(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    );
  });

  testWidgets('forgot password sends reset email', (tester) async {
    when(() => auth.sendPasswordResetEmail(any())).thenAnswer((_) async {});

    await pumpAuth(
      tester,
      ForgotPasswordScreen(
        authService: auth,
        initialEmail: 'agent@every.com',
      ),
    );

    await tester.tap(find.text('Send link'));
    await tester.pump();

    verify(() => auth.sendPasswordResetEmail('agent@every.com')).called(1);
    expect(find.text('Resend link'), findsOneWidget);
  });

  testWidgets('phone auth requires international format', (tester) async {
    await pumpAuth(tester, PhoneAuthScreen(authService: auth));

    await tester.enterText(find.byType(TextFormField), '88887777');
    await tester.tap(find.text('Send code'));
    await tester.pump();

    expect(find.textContaining('country code'), findsWidgets);
  });

  test('AuthException maps known codes to localized copy', () {
    final l10n = AppLocalizationsEn();
    expect(
      const AuthException(code: 'wrong-password').localizedMessage(l10n),
      contains('Incorrect'),
    );
    expect(
      const AuthException(code: 'email-already-in-use')
          .localizedMessage(l10n),
      contains('already exists'),
    );
    expect(
      const AuthException(code: 'emulator-unreachable').localizedMessage(l10n),
      contains('emulators'),
    );
    expect(
      AuthException.fromUnknown(
        Exception('SocketException: Connection refused'),
      ).code,
      'emulator-unreachable',
    );
  });
}
