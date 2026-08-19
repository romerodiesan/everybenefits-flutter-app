import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/features/profile/profile_completion_flow.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
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
        role: UserRole.student,
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
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final incomplete = UserProfile(
      uid: 'uid-1',
      email: 's@b.com',
      role: UserRole.student,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      phoneCountryCode: '+506',
      phoneNumber: '88887777',
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    when(() => users.updateProfile(any())).thenAnswer((invocation) async {
      return invocation.positionalArguments.first as UserProfile;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ProfileCompletionFlow(
          profile: incomplete,
          userRepository: users,
          authService: auth,
        ),
      ),
    );

    await tester.tap(find.text("I'm a student"));
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(find.text('NPN'), findsNothing);
    expect(find.text('Street address'), findsNothing);
    expect(find.text('Agency'), findsNothing);

    await tester.enterText(find.byType(TextFormField).at(0), 'Sam');
    await tester.enterText(find.byType(TextFormField).at(1), 'Student');
    await tester.enterText(find.byType(TextFormField).at(3), '88887777');
    await tester.ensureVisible(find.text('Finish'));
    await tester.tap(find.text('Finish'));
    await tester.pump();

    final captured =
        verify(() => users.updateProfile(captureAny())).captured.single
            as UserProfile;
    expect(captured.role, UserRole.student);
    expect(captured.displayName, 'Sam Student');
    expect(captured.phoneCountryCode, '+506');
    expect(captured.phoneNumber, '88887777');
    expect(captured.profileCompleted, isTrue);
    expect(captured.npn, isNull);
  });

  testWidgets('agent path requires NPN US address and agency default', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final incomplete = UserProfile(
      uid: 'uid-1',
      email: 'a@b.com',
      role: UserRole.student,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      phoneCountryCode: '+506',
      phoneNumber: '70001111',
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    when(() => users.updateProfile(any())).thenAnswer((invocation) async {
      return invocation.positionalArguments.first as UserProfile;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ProfileCompletionFlow(
          profile: incomplete,
          userRepository: users,
          authService: auth,
        ),
      ),
    );

    await tester.tap(find.text("I'm an agent"));
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(find.text('NPN'), findsOneWidget);
    expect(find.text('Street address'), findsOneWidget);
    expect(find.textContaining('Every Benefits'), findsWidgets);

    await tester.enterText(find.byType(TextFormField).at(0), 'Alex');
    await tester.enterText(find.byType(TextFormField).at(1), 'Agent');
    await tester.enterText(find.byType(TextFormField).at(3), '70001111');
    await tester.enterText(find.byType(TextFormField).at(4), '9988776');
    await tester.enterText(find.byType(TextFormField).at(5), '100 Main St');
    // Bio and apartment remain optional at indices 2 and 6.
    await tester.enterText(find.byType(TextFormField).at(7), 'Miami');
    await tester.enterText(find.byType(TextFormField).at(8), 'FL');
    await tester.enterText(find.byType(TextFormField).at(9), '33101');
    await tester.ensureVisible(find.text('Finish'));
    await tester.tap(find.text('Finish'));
    await tester.pump();

    final captured =
        verify(() => users.updateProfile(captureAny())).captured.single
            as UserProfile;
    expect(captured.role, UserRole.agent);
    expect(captured.npn, '9988776');
    expect(captured.addressStreet, '100 Main St');
    expect(captured.addressCity, 'Miami');
    expect(captured.addressState, 'FL');
    expect(captured.addressZip, '33101');
    expect(captured.address, contains('100 Main St'));
    expect(captured.agency, kDefaultAgency);
    expect(captured.profileCompleted, isTrue);
  });
}
