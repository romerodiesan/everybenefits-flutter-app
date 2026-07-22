import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/features/profile/profile_completion_flow.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_repository.dart';
import 'package:every_benefits/users/user_role.dart';

class MockAuthService extends Mock implements AuthService {}

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockAuthService auth;
  late MockUserRepository users;

  setUpAll(() {
    registerFallbackValue(
      UserProfile(
        uid: 'x',
        role: UserRole.agent,
        isAnonymous: false,
        profileCompleted: false,
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      ),
    );
  });

  setUp(() {
    auth = MockAuthService();
    users = MockUserRepository();
  });

  testWidgets('student path collects name and phone only', (tester) async {
    final incomplete = UserProfile(
      uid: 'uid-1',
      email: 's@b.com',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    when(() => users.updateProfile(any())).thenAnswer((invocation) async {
      return invocation.positionalArguments.first as UserProfile;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ProfileCompletionFlow(
          profile: incomplete,
          userRepository: users,
          authService: auth,
        ),
      ),
    );

    await tester.tap(find.text('Soy estudiante'));
    await tester.pump();
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();

    expect(find.text('NPN'), findsNothing);
    expect(find.text('Dirección'), findsNothing);
    expect(find.text('Agencia'), findsNothing);

    await tester.enterText(find.byType(TextFormField).at(0), 'Sam Student');
    await tester.enterText(find.byType(TextFormField).at(1), '88887777');
    await tester.tap(find.text('Finalizar'));
    await tester.pump();

    final captured = verify(() => users.updateProfile(captureAny())).captured.single
        as UserProfile;
    expect(captured.role, UserRole.student);
    expect(captured.displayName, 'Sam Student');
    expect(captured.phoneCountryCode, '+506');
    expect(captured.phoneNumber, '88887777');
    expect(captured.profileCompleted, isTrue);
    expect(captured.npn, isNull);
  });

  testWidgets('agent path requires NPN address and agency default', (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final incomplete = UserProfile(
      uid: 'uid-1',
      email: 'a@b.com',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    when(() => users.updateProfile(any())).thenAnswer((invocation) async {
      return invocation.positionalArguments.first as UserProfile;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ProfileCompletionFlow(
          profile: incomplete,
          userRepository: users,
          authService: auth,
        ),
      ),
    );

    await tester.tap(find.text('Soy agente'));
    await tester.pump();
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();

    expect(find.text('NPN'), findsOneWidget);
    expect(find.textContaining('Every Benefits'), findsWidgets);

    await tester.enterText(find.byType(TextFormField).at(0), 'Alex Agent');
    await tester.enterText(find.byType(TextFormField).at(1), '70001111');
    await tester.enterText(find.byType(TextFormField).at(2), '998877');
    await tester.enterText(find.byType(TextFormField).at(3), 'Calle 1');
    await tester.ensureVisible(find.text('Finalizar'));
    await tester.tap(find.text('Finalizar'));
    await tester.pump();

    final captured = verify(() => users.updateProfile(captureAny())).captured.single
        as UserProfile;
    expect(captured.role, UserRole.agent);
    expect(captured.npn, '998877');
    expect(captured.address, 'Calle 1');
    expect(captured.agency, kDefaultAgency);
    expect(captured.profileCompleted, isTrue);
  });
}
