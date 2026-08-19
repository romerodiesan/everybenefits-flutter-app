import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_people_screen.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/features/chats/chats_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/fake_chat_store.dart';

class MockUserRepository extends Mock implements UserRepository {}

class MockSocialRepository extends Mock implements SocialRepository {}

void main() {
  late FakeChatStore chatStore;
  late ChatRepository chats;
  late MockUserRepository users;
  late MockSocialRepository social;
  late UserProfile viewer;

  UserProfile person(
    String uid,
    String name, {
    String? username,
    UserRole role = UserRole.student,
  }) {
    return UserProfile(
      uid: uid,
      displayName: name,
      username: username,
      role: role,
      isAnonymous: false,
      profileCompleted: true,
      createdAt: DateTime.utc(2025, 1, 1),
      updatedAt: DateTime.utc(2025, 1, 1),
    );
  }

  Widget app(Widget home) {
    return MaterialApp(
      theme: buildEveryInsuranceTheme(Brightness.dark),
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: AccessScope(
        roleId: viewer.roleId,
        permissions: getDefaultPermissionsForRole(viewer.roleId),
        child: home,
      ),
    );
  }

  setUp(() {
    chatStore = FakeChatStore();
    chats = ChatRepository(store: chatStore);
    users = MockUserRepository();
    social = MockSocialRepository();
    viewer = person('viewer', 'Vera Viewer');

    when(
      () => social.listContacts(limit: any(named: 'limit')),
    ).thenAnswer((_) async => [person('contact', 'Carla Contact')]);
    when(
      () => users.searchDirectory(any(), limit: any(named: 'limit')),
    ).thenAnswer(
      (_) async => [person('search', 'Dani Search', username: 'dani')],
    );

    chatStore.chats['dm-recent'] = ChatConversation(
      id: 'dm-recent',
      memberIds: const ['viewer', 'recent'],
      memberNames: const {'viewer': 'Vera Viewer', 'recent': 'Riley Recent'},
      memberPhotos: const {},
      isGroup: false,
      lastMessage: 'See you soon',
      lastMessageAt: DateTime.utc(2026, 1, 3),
      createdAt: DateTime.utc(2026, 1, 1),
      createdBy: 'viewer',
      dmMessagingEnabled: true,
    );
  });

  tearDown(() {
    chatStore.dispose();
  });

  testWidgets('shows recent conversations, contacts, and indexed search', (
    tester,
  ) async {
    await tester.pumpWidget(
      app(
        ChatPeopleScreen(
          profile: viewer,
          chatRepository: chats,
          userRepository: users,
          socialRepository: social,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('People'), findsOneWidget);
    expect(find.text('Riley Recent'), findsOneWidget);
    expect(find.text('Carla Contact'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'dani');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();

    expect(find.text('Dani Search'), findsOneWidget);
    expect(find.text('@dani'), findsOneWidget);
    expect(find.byTooltip('Add contact'), findsOneWidget);
    verify(() => users.searchDirectory('dani', limit: 30)).called(1);
    verify(() => social.listContacts(limit: any(named: 'limit'))).called(1);
    verifyNever(
      () => users.listDirectory(
        excludeUid: any(named: 'excludeUid'),
        limit: any(named: 'limit'),
      ),
    );
  });

  testWidgets('admin directory lists members without requiring contacts', (
    tester,
  ) async {
    viewer = person('viewer', 'Vera Viewer', role: UserRole.admin);
    when(
      () => users.listDirectory(
        excludeUid: any(named: 'excludeUid'),
        limit: any(named: 'limit'),
      ),
    ).thenAnswer((_) async => [person('dir', 'Dana Directory')]);

    await tester.pumpWidget(
      app(
        ChatPeopleScreen(
          profile: viewer,
          chatRepository: chats,
          userRepository: users,
          socialRepository: social,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('DIRECTORY'), findsOneWidget);
    expect(find.text('Dana Directory'), findsOneWidget);
    expect(find.byTooltip('Message'), findsWidgets);
    verify(
      () => users.listDirectory(excludeUid: 'viewer', limit: 80),
    ).called(1);
    verifyNever(() => social.listContacts(limit: any(named: 'limit')));
  });

  testWidgets('opens People from the Chats header', (tester) async {
    await tester.pumpWidget(
      app(
        ChatsScreen(
          profile: viewer,
          chatRepository: chats,
          userRepository: users,
          socialRepository: social,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.byTooltip('People'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(ChatPeopleScreen), findsOneWidget);
  });
}
