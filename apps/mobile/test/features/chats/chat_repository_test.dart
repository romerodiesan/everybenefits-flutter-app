import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/l10n/app_localizations_en.dart';
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

    test('uses dmKey as document id when no id factory is set', () async {
      final localStore = FakeChatStore();
      addTearDown(localStore.dispose);
      final localRepo = ChatRepository(store: localStore);
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');

      final chat = await localRepo.getOrCreateDm(me: me, other: other);
      expect(chat.id, 'me_other');
      expect(chat.dmKey, 'me_other');
      expect(localStore.chats.containsKey('me_other'), isTrue);
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

  group('createGroup', () {
    test('rejects agents', () async {
      final me = _user('me');
      final other = _user('other');
      expect(
        () => repo.createGroup(
          creator: me,
          title: 'Team',
          members: [other],
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('creates group for manager', () async {
      final me = _user('me', role: UserRole.manager, name: 'Mgr');
      final other = _user('other', name: 'Peer');
      final chat = await repo.createGroup(
        creator: me,
        title: ' Cohort A ',
        members: [other],
      );
      expect(chat.isGroup, isTrue);
      expect(chat.title, 'Cohort A');
      expect(chat.isDefaultAgentGroup, isFalse);
      expect(chat.memberIds, containsAll(['me', 'other']));
      expect(chat.createdBy, 'me');
    });
  });

  group('getOrCreateSupportChat', () {
    test('creates a hybrid support thread and reuses it', () async {
      final me = _user('me', name: 'María', role: UserRole.student);
      final first = await repo.getOrCreateSupportChat(me: me);
      expect(first.id, 'support_me');
      expect(first.isSupportChat, isTrue);
      expect(first.isGroup, isTrue);
      expect(
        first.memberIds,
        containsAll(['me', ChatConversation.supportAiUid]),
      );
      expect(first.titleFor('me'), isNotEmpty);

      final second = await repo.getOrCreateSupportChat(me: me);
      expect(second.id, first.id);
      expect(store.chats.length, 1);
    });

    test('sendMessage then sendSupportAiReply appends AI bubble', () async {
      final me = _user('me', name: 'María');
      final chat = await repo.getOrCreateSupportChat(me: me);
      await repo.sendMessage(chatId: chat.id, body: 'Need help', author: me);
      final ai = await repo.sendSupportAiReply(
        chatId: chat.id,
        body: 'Thanks — a teammate can jump in too.',
      );
      expect(ai.senderId, ChatConversation.supportAiUid);
      expect(ai.isAi, isTrue);
      expect(ai.isMine('me'), isFalse);
      expect(store.messages[chat.id]!.length, 2);
    });
  });

  group('toggleReaction', () {
    test('sets and clears a reaction for the viewer', () async {
      final me = _user('me');
      final other = _user('other');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      final msg = await repo.sendMessage(
        chatId: chat.id,
        body: 'hello',
        author: me,
      );

      await repo.toggleReaction(
        chatId: chat.id,
        messageId: msg.id,
        uid: 'other',
        emoji: '👍',
      );
      expect(store.messages[chat.id]!.first.reactions['other'], '👍');

      await repo.toggleReaction(
        chatId: chat.id,
        messageId: msg.id,
        uid: 'other',
        emoji: '👍',
      );
      expect(store.messages[chat.id]!.first.reactions.containsKey('other'), isFalse);

      await repo.toggleReaction(
        chatId: chat.id,
        messageId: msg.id,
        uid: 'other',
        emoji: '❤️',
      );
      expect(store.messages[chat.id]!.first.reactions['other'], '❤️');
    });

    test('rejects reactions on support chat', () async {
      final me = _user('me', name: 'María');
      final chat = await repo.getOrCreateSupportChat(me: me);
      final msg = await repo.sendMessage(
        chatId: chat.id,
        body: 'Need help',
        author: me,
      );

      expect(
        () => repo.toggleReaction(
          chatId: chat.id,
          messageId: msg.id,
          uid: me.uid,
          emoji: '👍',
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('soporte'),
          ),
        ),
      );
    });
  });

  group('hideChatForMe', () {
    test('hides from inbox and reappears after a new message', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      await repo.sendMessage(chatId: chat.id, body: 'hola', author: me);

      await repo.hideChatForMe(chatId: chat.id, uid: me.uid);
      final hidden = await repo.watchChats(me.uid).first;
      expect(hidden.any((c) => c.id == chat.id), isFalse);

      await repo.sendMessage(chatId: chat.id, body: 'back', author: other);
      final again = await repo.watchChats(me.uid).first;
      expect(again.any((c) => c.id == chat.id), isTrue);
    });

    test('rejects support and default community chats', () async {
      final me = _user('me', name: 'María', role: UserRole.agent);
      final support = await repo.getOrCreateSupportChat(me: me);
      expect(
        () => repo.hideChatForMe(chatId: support.id, uid: me.uid),
        throwsA(isA<StateError>()),
      );

      final community = await store.createChat(
        ChatConversation(
          id: 'agents-default',
          memberIds: [me.uid],
          memberNames: {me.uid: me.headlineName},
          isGroup: true,
          title: 'Team',
          lastMessage: '',
          lastMessageAt: DateTime.utc(2024, 1, 1),
          createdAt: DateTime.utc(2024, 1, 1),
          createdBy: 'system',
          unreadCounts: {me.uid: 0},
          pinnedBy: const {},
          isDefaultAgentGroup: true,
          isSupportChat: false,
        ),
      );
      expect(
        () => repo.hideChatForMe(chatId: community.id, uid: me.uid),
        throwsA(isA<StateError>()),
      );
      expect(
        () => repo.setPinned(chatId: community.id, uid: me.uid, pinned: true),
        throwsA(isA<StateError>()),
      );
    });

    test('clears pin when hiding', () async {
      final me = _user('me');
      final other = _user('other');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      await repo.setPinned(chatId: chat.id, uid: me.uid, pinned: true);
      await repo.hideChatForMe(chatId: chat.id, uid: me.uid);
      final updated = await repo.watchChat(chat.id).first;
      expect(updated!.isPinnedFor(me.uid), isFalse);
    });

    test('hide only removes chat for that user', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');
      final chat = await repo.getOrCreateDm(me: me, other: other);
      await repo.hideChatForMe(chatId: chat.id, uid: me.uid);

      final mine = await repo.watchChats(me.uid).first;
      final theirs = await repo.watchChats(other.uid).first;
      expect(mine.any((c) => c.id == chat.id), isFalse);
      expect(theirs.any((c) => c.id == chat.id), isTrue);
    });
  });

  group('setPinned inbox', () {
    test('pinned chat appears in pinned partition for that user only', () async {
      final me = _user('me', name: 'María');
      final other = _user('other', name: 'Carlos');
      final chat = await repo.getOrCreateDm(me: me, other: other);

      await repo.setPinned(chatId: chat.id, uid: me.uid, pinned: true);

      final mine = await repo.watchChats(me.uid).first;
      final sections = partitionChatInbox(mine, me.uid);
      expect(sections.pinned.map((c) => c.id), contains(chat.id));
      expect(sections.recent.map((c) => c.id), isNot(contains(chat.id)));

      final theirs = await repo.watchChats(other.uid).first;
      final otherSections = partitionChatInbox(theirs, other.uid);
      expect(otherSections.pinned.map((c) => c.id), isNot(contains(chat.id)));
      expect(otherSections.recent.map((c) => c.id), contains(chat.id));
    });
  });

  group('formatChatTime', () {
    test('formats today as time and older as weekday-ish labels', () {
      final l10n = AppLocalizationsEn();
      final now = DateTime(2024, 6, 12, 15, 30);
      expect(
        formatChatTime(DateTime(2024, 6, 12, 9, 5), l10n, now: now),
        '09:05',
      );
      expect(
        formatChatTime(DateTime(2024, 6, 11, 9, 5), l10n, now: now),
        'Yesterday',
      );
    });
  });
}
