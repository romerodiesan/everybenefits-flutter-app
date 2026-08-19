import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/chats/chat_conversation_screen.dart';
import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/users.dart';

import '../../helpers/fake_chat_store.dart';

void main() {
  testWidgets('conversation can listen to chat stream from app bar and body', (
    tester,
  ) async {
    final store = FakeChatStore();
    addTearDown(store.dispose);
    const chatId = 'dm-1';
    final now = DateTime.utc(2026, 1, 2);
    store.chats[chatId] = ChatConversation(
      id: chatId,
      memberIds: const ['me', 'other'],
      memberNames: const {'me': 'Me', 'other': 'Other'},
      memberPhotos: const {},
      isGroup: false,
      lastMessage: 'Hello',
      lastMessageAt: now,
      createdAt: now,
      createdBy: 'me',
      dmMessagingEnabled: true,
    );
    store.messages[chatId] = [
      ChatMessage(
        id: 'm1',
        chatId: chatId,
        body: 'Hello',
        senderId: 'other',
        senderName: 'Other',
        createdAt: now,
      ),
      ChatMessage(
        id: 'm2',
        chatId: chatId,
        body: 'On my way',
        senderId: 'me',
        senderName: 'Me',
        createdAt: now.add(const Duration(minutes: 1)),
      ),
    ];
    final profile = UserProfile(
      uid: 'me',
      displayName: 'Me',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
    );

    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: AccessScope(
          roleId: profile.roleId,
          permissions: getDefaultPermissionsForRole(profile.roleId),
          child: ChatConversationScreen(
            chat: store.chats[chatId]!,
            profile: profile,
            chatRepository: ChatRepository(store: store),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);

    // LayoutBuilder rebuilds the scaffold with new constraints; StreamBuilders
    // must be able to resubscribe without "already listened to".
    await tester.binding.setSurfaceSize(const Size(360, 640));
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.text('Other'), findsWidgets);
    expect(find.text('Hello'), findsOneWidget);
    expect(find.text('On my way'), findsOneWidget);
    expect(find.byKey(const ValueKey('chat-avatar-other')), findsOneWidget);
    expect(find.byKey(const ValueKey('chat-avatar-me')), findsOneWidget);

    final ownAvatar = tester.getRect(
      find.byKey(const ValueKey('chat-avatar-me')),
    );
    final ownBubble = tester.getRect(find.text('On my way'));
    final otherAvatar = tester.getRect(
      find.byKey(const ValueKey('chat-avatar-other')),
    );
    final otherBubble = tester.getRect(find.text('Hello'));

    expect(ownAvatar.left - ownBubble.right, lessThan(32));
    expect(otherBubble.left - otherAvatar.right, lessThan(32));
    expect(ownBubble.left, greaterThan(otherBubble.left));
    expect(ownAvatar.left, greaterThan(otherAvatar.left + 80));
  });
}
