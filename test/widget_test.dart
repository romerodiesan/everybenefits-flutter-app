import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/home_shell.dart';
import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/features/onboarding/login_screen.dart';
import 'package:every_benefits/features/onboarding/register_screen.dart';
import 'package:every_benefits/features/profile/profile_completion_flow.dart';
import 'package:every_benefits/main.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_repository.dart';
import 'package:every_benefits/users/user_role.dart';

class MockAuthService extends Mock implements AuthService {}

class MockUserRepository extends Mock implements UserRepository {}

class MockUser extends Mock implements User {}

void main() {
  late MockAuthService auth;
  late MockUserRepository users;

  setUpAll(() {
    registerFallbackValue(MockUser());
    registerFallbackValue('');
  });

  setUp(() {
    auth = MockAuthService();
    users = MockUserRepository();
  });

  UserProfile completedProfile({
    String uid = 'uid-1',
    UserRole role = UserRole.agent,
    bool anonymous = false,
  }) {
    return UserProfile(
      uid: uid,
      email: anonymous ? null : 'a@b.com',
      displayName: anonymous ? null : 'Ada',
      role: role,
      isAnonymous: anonymous,
      profileCompleted: true,
      phoneCountryCode: anonymous ? null : '+506',
      phoneNumber: anonymous ? null : '88887777',
      npn: role == UserRole.agent ? '1234567' : null,
      address: role == UserRole.agent ? 'San José' : null,
      agency: role == UserRole.agent ? kDefaultAgency : null,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );
  }

  void stubCompletedProfile(UserProfile profile) {
    when(() => users.ensureProfile(any())).thenAnswer((_) async => profile);
    when(() => users.watchProfile(profile.uid))
        .thenAnswer((_) => Stream.value(profile));
  }

  testWidgets('shows welcome onboarding when there is no user', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    expect(find.text('Every'), findsOneWidget);
    expect(find.text('Insurance'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
    expect(find.text('Continuar como invitado'), findsOneWidget);
  });

  testWidgets('welcome navigates to login and register', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Iniciar sesión'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Crear cuenta'));
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
  });

  testWidgets('auth success clears login stack and shows dashboard',
      (tester) async {
    final authController = StreamController<User?>.broadcast();
    when(() => auth.authStateChanges).thenAnswer((_) => authController.stream);
    when(
      () => auth.signInWithEmail(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    ).thenAnswer((_) async {
      final user = MockUser();
      when(() => user.uid).thenReturn('uid-login');
      authController.add(user);
      return FakeUserCredential();
    });

    final profile = completedProfile(uid: 'uid-login');
    stubCompletedProfile(profile);

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    authController.add(null);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Iniciar sesión'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'a@b.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret12');
    await tester.tap(find.text('Entrar'));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsNothing);
    expect(find.byTooltip('Inicio'), findsOneWidget);
    expect(find.text('Asistente IA'), findsOneWidget);

    await authController.close();
  });

  testWidgets('incomplete profile shows completion flow', (tester) async {
    final user = MockUser();
    when(() => user.uid).thenReturn('uid-new');
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(user));

    final incomplete = UserProfile(
      uid: 'uid-new',
      email: 'new@b.com',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );
    when(() => users.ensureProfile(any())).thenAnswer((_) async => incomplete);
    when(() => users.watchProfile('uid-new'))
        .thenAnswer((_) => Stream.value(incomplete));

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    await tester.pump();
    await tester.pump();

    expect(find.byType(ProfileCompletionFlow), findsOneWidget);
    expect(find.text('¿Cómo participas en Every Insurance?'), findsOneWidget);
    expect(find.text('Soy agente'), findsOneWidget);
    expect(find.text('Soy estudiante'), findsOneWidget);
    expect(find.byTooltip('Inicio'), findsNothing);
  });

  testWidgets('guest CTA signs in anonymously', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));
    when(() => auth.signInAnonymously()).thenAnswer((_) async {
      return FakeUserCredential();
    });

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Continuar como invitado'));
    await tester.pump();

    verify(() => auth.signInAnonymously()).called(1);
  });

  testWidgets('shows home shell tabs when signed in', (tester) async {
    final user = MockUser();
    when(() => user.uid).thenReturn('uid-1');
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(user));

    final profile = completedProfile();
    stubCompletedProfile(profile);

    await tester.pumpWidget(
      EveryInsuranceApp(authService: auth, userRepository: users),
    );
    await tester.pump();
    await tester.pump();

    expect(find.byTooltip('Inicio'), findsOneWidget);
    expect(find.text('Asistente IA'), findsOneWidget);
  });

  testWidgets('home shell can switch tabs and open community from grid',
      (tester) async {
    final authService = MockAuthService();
    final usersRepo = MockUserRepository();
    final profile = completedProfile(role: UserRole.guest, anonymous: true);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(),
        home: HomeShell(
          authService: authService,
          userRepository: usersRepo,
          profile: profile,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    await tester.tap(find.text('Comunidad'));
    await tester.pumpAndSettle();
    expect(find.text('Conversaciones de la comunidad'), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Perfil'));
    await tester.pumpAndSettle();

    expect(find.text('Invitado'), findsOneWidget);
    expect(find.text('Ajustes'), findsOneWidget);
    expect(find.text('Agregar foto de perfil'), findsOneWidget);
    expect(find.text('uid-1'), findsNothing);
  });
}

class FakeUserCredential extends Fake implements UserCredential {}
