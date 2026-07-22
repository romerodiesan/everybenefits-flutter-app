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

class MockAuthService extends Mock implements AuthService {}

class FakeUserCredential extends Fake implements UserCredential {}

void main() {
  late MockAuthService auth;

  setUpAll(() {
    registerFallbackValue('');
  });

  setUp(() {
    auth = MockAuthService();
  });

  Future<void> pumpAuth(WidgetTester tester, Widget home) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: home,
      ),
    );
    await tester.pump();
  }

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
    await tester.tap(find.text('Entrar'));
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
    await tester.tap(find.text('Crear cuenta').last);
    await tester.pump();

    expect(find.text('Las contraseñas no coinciden.'), findsOneWidget);
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

    await tester.tap(find.text('Enviar enlace'));
    await tester.pump();

    verify(() => auth.sendPasswordResetEmail('agent@every.com')).called(1);
    expect(find.text('Reenviar enlace'), findsOneWidget);
  });

  testWidgets('phone auth requires international format', (tester) async {
    await pumpAuth(tester, PhoneAuthScreen(authService: auth));

    await tester.enterText(find.byType(TextFormField), '88887777');
    await tester.tap(find.text('Enviar código'));
    await tester.pump();

    expect(find.textContaining('código de país'), findsOneWidget);
  });

  test('AuthException maps known codes to Spanish copy', () {
    expect(
      const AuthException(code: 'wrong-password').userMessage,
      contains('incorrectos'),
    );
    expect(
      const AuthException(code: 'email-already-in-use').userMessage,
      contains('Ya existe'),
    );
    expect(
      const AuthException(code: 'emulator-unreachable').userMessage,
      contains('emuladores'),
    );
    expect(
      AuthException.fromUnknown(
        Exception('SocketException: Connection refused'),
      ).code,
      'emulator-unreachable',
    );
  });
}
