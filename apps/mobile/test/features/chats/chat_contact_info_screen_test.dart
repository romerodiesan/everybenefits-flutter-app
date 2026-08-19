import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/chats/chat_contact_info_screen.dart';
import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/fake_chat_store.dart';

class MockSocialRepository extends Mock implements SocialRepository {}

void main() {
  testWidgets('group info searches members and hydrates missing names', (
    tester,
  ) async {
    final store = FakeChatStore();
    addTearDown(store.dispose);
    final social = MockSocialRepository();
    const chatId = 'group-1';
    final now = DateTime.utc(2026, 1, 2);
    store.chats[chatId] = ChatConversation(
      id: chatId,
      memberIds: const ['me', 'ann', 'uid-hidden'],
      memberNames: const {'me': 'Me', 'ann': 'Ann Agent'},
      memberPhotos: const {},
      memberUsernames: const {'ann': 'ann'},
      isGroup: true,
      title: 'Licensing',
      lastMessage: 'Hi',
      lastMessageAt: now,
      createdAt: now,
      createdBy: 'me',
    );
    when(() => social.fetchPublicProfile(any())).thenAnswer((invocation) async {
      final uid = invocation.positionalArguments.first as String;
      if (uid == 'uid-hidden') {
        return UserProfile(
          uid: 'uid-hidden',
          displayName: 'Hidden Member',
          username: 'hidden',
          role: UserRole.agent,
          isAnonymous: false,
          profileCompleted: true,
          createdAt: now,
          updatedAt: now,
        );
      }
      return null;
    });

    final profile = UserProfile(
      uid: 'me',
      displayName: 'Me',
      role: UserRole.admin,
      isAnonymous: false,
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ChatContactInfoScreen(
          chat: store.chats[chatId]!,
          profile: profile,
          chatRepository: ChatRepository(store: store),
          socialRepository: social,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Licensing'), findsOneWidget);
    expect(find.textContaining('3 members'), findsOneWidget);
    expect(find.text('Ann Agent'), findsOneWidget);
    expect(find.text('Hidden Member'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'ann');
    await tester.pump();

    expect(find.text('Ann Agent'), findsOneWidget);
    expect(find.text('Hidden Member'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('group info pages members instead of dumping the full list', (
    tester,
  ) async {
    final store = FakeChatStore();
    addTearDown(store.dispose);
    final social = MockSocialRepository();
    when(() => social.fetchPublicProfile(any())).thenAnswer((_) async => null);
    const chatId = 'group-big';
    final now = DateTime.utc(2026, 1, 2);
    final memberIds = ['me', ...List.generate(29, (i) => 'u$i')];
    final memberNames = {
      'me': 'Me',
      for (var i = 0; i < 29; i++)
        'u$i': 'Person ${i.toString().padLeft(2, '0')}',
    };
    store.chats[chatId] = ChatConversation(
      id: chatId,
      memberIds: memberIds,
      memberNames: memberNames,
      isGroup: true,
      title: 'Big Group',
      lastMessage: 'Hi',
      lastMessageAt: now,
      createdAt: now,
      createdBy: 'me',
    );
    final profile = UserProfile(
      uid: 'me',
      displayName: 'Me',
      role: UserRole.admin,
      isAnonymous: false,
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: AccessScope(
          roleId: profile.roleId,
          permissions: getDefaultPermissionsForRole(profile.roleId),
          child: ChatContactInfoScreen(
            chat: store.chats[chatId]!,
            profile: profile,
            chatRepository: ChatRepository(store: store),
            socialRepository: social,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.textContaining('30 members'), findsOneWidget);
    expect(find.text('Person 23'), findsNothing);
    expect(find.text('Load more'), findsOneWidget);
    expect(find.text('Add member'), findsOneWidget);

    await tester.tap(find.text('Load more'));
    await tester.pump();

    expect(find.text('Load more'), findsNothing);
    final list = find.byType(ListView);
    for (var i = 0; i < 20 && find.text('Person 28').evaluate().isEmpty; i++) {
      await tester.drag(list, const Offset(0, -400));
      await tester.pump();
    }
    expect(find.text('Person 28'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
