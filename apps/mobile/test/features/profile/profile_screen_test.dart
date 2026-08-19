import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/auth/auth.dart';
import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/profile/profile_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/test_views.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockUserRepository extends Mock implements UserRepository {}

class _MockSocialRepository extends Mock implements SocialRepository {}

class _MockForumRepository extends Mock implements ForumRepository {}

void main() {
  late _MockAuthService auth;
  late _MockUserRepository users;
  late _MockSocialRepository social;
  late _MockForumRepository forums;
  late UserProfile profile;

  Widget app() {
    return MaterialApp(
      theme: buildEveryInsuranceTheme(Brightness.dark),
      locale: const Locale('es'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: ProfileScreen(
        authService: auth,
        userRepository: users,
        socialRepository: social,
        forumRepository: forums,
        profile: profile,
        notificationUnread: 3,
        onOpenNotifications: () {},
      ),
    );
  }

  setUp(() {
    auth = _MockAuthService();
    users = _MockUserRepository();
    social = _MockSocialRepository();
    forums = _MockForumRepository();
    profile = UserProfile(
      uid: 'viewer',
      displayName: 'Adriana Administradora',
      username: 'adriana',
      agency: 'Every Benefits Orlando',
      bio: 'Construyendo equipos que ponen a las personas primero.',
      addressCity: 'Orlando',
      addressState: 'FL',
      showLocationOnProfile: true,
      role: UserRole.admin,
      isAnonymous: false,
      profileCompleted: true,
      followerCount: 56,
      followingCount: 18,
      createdAt: DateTime.utc(2023, 9, 8),
      updatedAt: DateTime.utc(2026, 8, 1),
    );

    when(
      () => social.fetchPublicProfile(profile.uid),
    ).thenAnswer((_) async => profile);
    when(
      () => forums.watchThreads(
        authorId: profile.uid,
        sort: ForumSort.recent,
        limit: 24,
      ),
    ).thenAnswer((_) => Stream.value(const ForumThreadPage(threads: [])));
  });

  testWidgets('uses the modern public-profile language for the own profile', (
    tester,
  ) async {
    setPhoneView(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('public-profile-identity-hero')),
      findsOneWidget,
    );
    expect(find.text('Adriana Administradora'), findsOneWidget);
    expect(find.text('adriana'), findsOneWidget);
    expect(find.byKey(const Key('profile-edit-button')), findsOneWidget);
    expect(find.byKey(const Key('profile-settings-button')), findsOneWidget);
    expect(find.text('56'), findsOneWidget);
    expect(find.text('18'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('about bento remains responsive on a narrow phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    final about = find.byKey(const Key('public-profile-about-tab'));
    await tester.drag(
      find.byKey(const Key('profile-scroll')),
      const Offset(0, -520),
    );
    await tester.pumpAndSettle();
    await tester.tap(about);
    await tester.pumpAndSettle();

    expect(find.text('Every Benefits Orlando'), findsWidgets);
    expect(find.text('Orlando, FL'), findsWidgets);
    expect(find.textContaining('septiembre de 2023'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
