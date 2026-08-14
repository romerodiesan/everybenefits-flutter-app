import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/product_tour/product_tour_overlay.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_repository.dart';
import 'package:every_benefits/users/user_role.dart';

import '../../helpers/test_views.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository users;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    users = MockUserRepository();
    registerFallbackValue(
      UserProfile(
        uid: 'fallback',
        role: UserRole.agent,
        isAnonymous: false,
        profileCompleted: true,
        createdAt: DateTime.utc(2024),
        updatedAt: DateTime.utc(2024),
      ),
    );
    when(() => users.updateProfile(any())).thenAnswer(
      (invocation) async => invocation.positionalArguments.first as UserProfile,
    );
  });

  testWidgets('welcome card lays out when the spotlight is the bottom bar', (
    tester,
  ) async {
    setPhoneView(tester);
    final bar = GlobalKey();
    final home = GlobalKey();
    final chats = GlobalKey();
    final academy = GlobalKey();
    final profileKey = GlobalKey();

    final profile = UserProfile(
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Ada',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: true,
      productTourVersion: 0,
      createdAt: DateTime.utc(2024),
      updatedAt: DateTime.utc(2024),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.light),
        locale: const Locale('es'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Stack(
            fit: StackFit.expand,
            children: [
              const SizedBox.expand(),
              Align(
                alignment: Alignment.bottomCenter,
                child: SizedBox(
                  key: bar,
                  height: 84,
                  width: double.infinity,
                  child: const ColoredBox(color: Colors.red),
                ),
              ),
              SizedBox(key: home, width: 1, height: 1),
              SizedBox(key: chats, width: 1, height: 1),
              SizedBox(key: academy, width: 1, height: 1),
              SizedBox(key: profileKey, width: 1, height: 1),
              ProductTourOverlay(
                profile: profile,
                userRepository: users,
                targets: ProductTourTargets(
                  bar: bar,
                  home: home,
                  chats: chats,
                  academy: academy,
                  profile: profileKey,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(FilledButton), findsOneWidget);
    await tester.tap(find.byType(FilledButton));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(FilledButton), findsOneWidget);
    await tester.tap(find.text('Omitir'));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
