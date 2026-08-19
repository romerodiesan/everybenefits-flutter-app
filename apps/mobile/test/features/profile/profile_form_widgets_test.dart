import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/app/widgets/pulse_skeleton.dart';
import 'package:every_benefits/auth/auth.dart';
import 'package:every_benefits/features/profile/edit_profile_screen.dart';
import 'package:every_benefits/features/profile/widgets/profile_form_widgets.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/test_views.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockUserRepository extends Mock implements UserRepository {}

Widget _app(Widget home) {
  return MaterialApp(
    theme: buildEveryInsuranceTheme(Brightness.dark),
    locale: const Locale('es'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: home,
  );
}

void main() {
  testWidgets('PulseListSkeleton can sit inside another ListView', (
    tester,
  ) async {
    setPhoneView(tester);
    await tester.pumpWidget(
      _app(
        Scaffold(
          body: ListView(
            children: const [
              Text('Security'),
              PulseListSkeleton(itemCount: 3, shrinkWrap: true),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(PulseListSkeleton), findsOneWidget);
  });

  testWidgets('country picker lists flags, names, and dial codes', (
    tester,
  ) async {
    setPhoneView(tester);
    var selected = resolvePhoneCountry(dialCode: '+1', iso2: 'US');

    await tester.pumpWidget(
      _app(
        Scaffold(
          body: PhoneCountryField(
            country: selected,
            onChanged: (country) => selected = country,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(PhoneCountryField));
    await tester.pumpAndSettle();

    expect(find.text('Costa Rica'), findsOneWidget);
    expect(find.text('+506'), findsWidgets);
    expect(find.text('CR'), findsOneWidget);
    expect(find.text('Estados Unidos'), findsOneWidget);
    expect(find.text('🇺🇸'), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Costa Rica'));
    await tester.pumpAndSettle();
    expect(selected.iso2, 'CR');
    expect(selected.dialCode, '+506');
  });

  testWidgets('edit profile shows agency as locked', (tester) async {
    setPhoneView(tester);
    final auth = _MockAuthService();
    final users = _MockUserRepository();
    final profile = UserProfile(
      uid: 'agent-1',
      displayName: 'Ana Agent',
      email: 'ana@b.com',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: true,
      agency: 'Every Benefits Orlando',
      npn: '1234567',
      phoneCountryCode: '+1',
      phoneCountryIso2: 'US',
      phoneNumber: '3055550199',
      addressStreet: '1 Main St',
      addressCity: 'Orlando',
      addressState: 'FL',
      addressZip: '32801',
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    await tester.pumpWidget(
      _app(
        EditProfileScreen(
          profile: profile,
          userRepository: users,
          authService: auth,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Every Benefits Orlando'), findsOneWidget);
    expect(
      find.text(
        'Tu agencia la asigna la organización y no se puede cambiar aquí.',
      ),
      findsOneWidget,
    );
    expect(find.text('Por defecto: Every Benefits'), findsNothing);
  });
}
