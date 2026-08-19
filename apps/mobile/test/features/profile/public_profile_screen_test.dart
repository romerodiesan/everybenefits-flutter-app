import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/profile/public_profile_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/fake_chat_store.dart';
import '../../helpers/test_views.dart';

class _MockSocialRepository extends Mock implements SocialRepository {}

class _MockForumRepository extends Mock implements ForumRepository {}

void main() {
  late _MockSocialRepository social;
  late _MockForumRepository forums;
  late FakeChatStore chatStore;
  late UserProfile viewer;
  late UserProfile person;

  UserProfile profile({
    required String uid,
    required String name,
    required UserRole role,
    String? username,
    String? agency,
    String? bio,
    String? city,
    String? state,
    int followers = 0,
    int following = 0,
  }) {
    return UserProfile(
      uid: uid,
      displayName: name,
      username: username,
      agency: agency,
      bio: bio,
      addressCity: city,
      addressState: state,
      showLocationOnProfile: true,
      followerCount: followers,
      followingCount: following,
      role: role,
      isAnonymous: false,
      profileCompleted: true,
      createdAt: DateTime.utc(2024, 5, 12),
      updatedAt: DateTime.utc(2026, 1, 1),
    );
  }

  Widget app() {
    return MaterialApp(
      theme: buildEveryInsuranceTheme(Brightness.dark),
      locale: const Locale('es'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: AccessScope(
        roleId: viewer.roleId,
        permissions: getDefaultPermissionsForRole(viewer.roleId),
        child: PublicProfileScreen(
          uid: person.uid,
          viewer: viewer,
          socialRepository: social,
          forumRepository: forums,
          chatRepository: ChatRepository(store: chatStore),
        ),
      ),
    );
  }

  setUp(() {
    social = _MockSocialRepository();
    forums = _MockForumRepository();
    chatStore = FakeChatStore();
    viewer = profile(
      uid: 'viewer',
      name: 'Adriana Admin',
      role: UserRole.admin,
    );
    person = profile(
      uid: 'person',
      name: 'Valentina del Rosario',
      username: 'valentina',
      role: UserRole.instructor,
      agency: 'Every Benefits Miami',
      bio:
          'Ayudo a nuevos agentes a construir una carrera sostenible y humana.',
      city: 'Miami',
      state: 'FL',
      followers: 128,
      following: 42,
    );

    when(
      () => social.fetchPublicProfile(person.uid),
    ).thenAnswer((_) async => person);
    when(() => social.getRelationship(person.uid)).thenAnswer(
      (_) async => const SocialRelationship(
        status: SocialStatus.none,
        muted: false,
        blockedByMe: false,
        isSelf: false,
      ),
    );
    when(
      () => forums.watchThreads(
        authorId: person.uid,
        sort: ForumSort.recent,
        limit: 24,
      ),
    ).thenAnswer(
      (_) => Stream.value(
        ForumThreadPage(
          threads: [
            ForumThread(
              id: 'thread-1',
              tags: const ['ventas', 'comunidad'],
              title: 'Cómo preparar una conversación que genere confianza',
              body:
                  'Una guía práctica para escuchar mejor antes de presentar una solución.',
              authorId: person.uid,
              authorName: person.headlineName,
              authorRole: person.role,
              replyCount: 8,
              score: 24,
              createdAt: DateTime.utc(2026, 8, 16),
              updatedAt: DateTime.utc(2026, 8, 16),
              lastReplyAt: DateTime.utc(2026, 8, 16),
            ),
          ],
        ),
      ),
    );
  });

  tearDown(() {
    chatStore.dispose();
  });

  testWidgets('renders the modern identity, admin actions, and activity', (
    tester,
  ) async {
    setPhoneView(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('public-profile-identity-hero')),
      findsOneWidget,
    );
    expect(find.text('Valentina del Rosario'), findsOneWidget);
    expect(find.text('valentina'), findsOneWidget);
    expect(find.text('Seguir'), findsOneWidget);
    expect(find.text('Mensaje'), findsOneWidget);
    expect(find.text('128'), findsOneWidget);
    expect(
      find.text('Cómo preparar una conversación que genere confianza'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('switches to the responsive bento about section', (tester) async {
    setPhoneView(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    final about = find.byKey(const Key('public-profile-about-tab'));
    await tester.ensureVisible(about);
    await tester.tap(about);
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('public-profile-about-content')),
      findsOneWidget,
    );
    expect(find.text('Every Benefits Miami'), findsWidgets);
    expect(find.text('Miami, FL'), findsWidgets);
    expect(find.textContaining('mayo de 2024'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('keeps identity and actions usable on a narrow phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    expect(find.text('Valentina del Rosario'), findsOneWidget);
    expect(find.text('Seguir'), findsOneWidget);
    expect(find.text('Mensaje'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('staff can message without being contacts even if a request is pending', (
    tester,
  ) async {
    setPhoneView(tester);
    when(() => social.getRelationship(person.uid)).thenAnswer(
      (_) async => const SocialRelationship(
        status: SocialStatus.outgoing,
        muted: false,
        blockedByMe: false,
        isSelf: false,
      ),
    );

    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    expect(find.text('Mensaje'), findsOneWidget);
    expect(find.text('Cancelar solicitud'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
