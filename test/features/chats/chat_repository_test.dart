import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

import '../../helpers/fake_chat_store.dart';

UserProfile _user(
  String uid, {
  String? name,
  UserRole role = UserRole.agent,
  bool anonymous = false,
}) {
  final now = DateTime.utc(2024, 1, 1);
  return UserProfile(
    uid: uid,
    displayName: name ?? 'User $uid',
    role: role,
    isAnonymous: anonymous,
    profileCompleted: true,
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  late FakeChatStore store;
  late ChatRepository repo;

  setUp(() {
    store = FakeChatStore();
    repo = ChatRepository(store: store, idFactory: () => 'chat-1');
  });

  tearDown(() => store.dispose());

  group('dmKeyFor', () {
    test('is order-independent', () {
      expect(dmKeyFor('a', 'b'), dmKeyFor('b', 'a'));
      expect(dmKeyFor('uid-2', 'uid-1'), 'uid-1_uid-2');
    });
  });

  group('getOrCreateDm', () {
    test('rejects guests and anonymous', () async {
      final guest = _user('g1', role: UserRole.guest, anonymous: true);
      final agent = _user('a1');
      expect(
        () => repo.getOrCreateDm(me: guest, other: agent),
        throwsA(isA<StateError>()),
      );
    });

    test('creates a new DM and reuses it', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');

      final first = await repo.getOrCreateDm(me: me, other: other);
      expect(first.memberIds, containsAll(['me', 'other']));
      expect(first.isGroup, isFalse);
      expect(first.dmKey, 'me_other');
      expect(first.titleFor('me'), 'Carlos');
      expect(first.initialsFor('me'), 'CA');

      final second = await repo.getOrCreateDm(me: me, other: other);
      expect(second.id, first.id);
      expect(store.chats.length, 1);
    });
  });

  group('sendMessage', () {
    test('appends message and updates preview/unread', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');
      final chat = await repo.getOrCreateDm(me: me, other: other);

      final msg = await repo.sendMessage(
        chatId: chat.id,
        body: 'Hola Carlos',
        author: me,
      );

      expect(msg.body, 'Hola Carlos');
      expect(msg.senderId, 'me');
      expect(store.messages[chat.id]!.length, 1);

      final updated = store.chats[chat.id]!;
      expect(updated.lastMessage, 'Hola Carlos');
      expect(updated.lastMessageSenderId, 'me');
      expect(updated.unreadFor('other'), 1);
      expect(updated.unreadFor('me'), 0);
    });

    test('rejects empty body', () async {
      final me = _user('me');
      final other = _user('other');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      expect(
        () => repo.sendMessage(chatId: chat.id, body: '  ', author: me),
        throwsA(isA<ArgumentError>()),
      );
    });
  });

  group('sharePost', () {
    test('stores shared post preview as last message', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      final preview = SharedPostPreview(
        threadId: 't1',
        title: '¿Cómo cito vida?',
        excerpt: 'Detalle…',
        authorName: 'Ana',
        tags: const ['vida'],
      );

      final msg = await repo.sharePost(
        chatId: chat.id,
        author: me,
        preview: preview,
      );

      expect(msg.sharedPost?.threadId, 't1');
      expect(store.chats[chat.id]!.lastMessage, contains('Pregunta'));
    });
  });

  group('markRead and pin', () {
    test('markRead clears unread for viewer', () async {
      final me = _user('me');
      final other = _user('other');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      await repo.sendMessage(chatId: chat.id, body: 'hey', author: me);

      await repo.markRead(chatId: chat.id, uid: 'other');
      expect(store.chats[chat.id]!.unreadFor('other'), 0);
    });

    test('setPinned toggles for viewer', () async {
      final me = _user('me');
      final other = _user('other');
      final chat = await repo.getOrCreateDm(me: me, other: other);

      await repo.setPinned(chatId: chat.id, uid: 'me', pinned: true);
      expect(store.chats[chat.id]!.isPinnedFor('me'), isTrue);
      expect(store.chats[chat.id]!.isPinnedFor('other'), isFalse);
    });
  });

  group('formatChatTime', () {
    test('formats today as time and older as weekday-ish labels', () {
      final now = DateTime(2024, 6, 12, 15, 30);
      expect(
        formatChatTime(DateTime(2024, 6, 12, 9, 5), now: now),
        '09:05',
      );
      expect(
        formatChatTime(DateTime(2024, 6, 11, 9, 5), now: now),
        'Ayer',
      );
    });
  });
}
