import 'dart:async';

import 'package:firebase_database/firebase_database.dart';

import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import 'chat_models.dart';

typedef ChatIdFactory = String Function();

const kChatMessagePageSize = 40;

/// Persistence port for chats (testable without Firebase).
abstract class ChatStore {
  Stream<List<ChatConversation>> watchChats(String uid);

  Stream<ChatConversation?> watchChat(String chatId);

  /// Newest messages first (for reverse ListView). Limited page size.
  Stream<List<ChatMessage>> watchMessages(
    String chatId, {
    int limit = kChatMessagePageSize,
  });

  Future<ChatConversation?> findDmByKey(
    String dmKey, {
    required String viewerUid,
  });

  Future<ChatConversation> createChat(ChatConversation chat);

  /// True when `userChats/{uid}/{chatId}` exists (safe existence probe).
  Future<bool> hasUserChatIndex({
    required String uid,
    required String chatId,
  });

  Future<void> updateChat(ChatConversation chat);

  Future<ChatMessage> addMessage(ChatMessage message);

  /// Sets or clears `messages/{chatId}/{messageId}/reactions/{uid}`.
  Future<void> setMessageReaction({
    required String chatId,
    required String messageId,
    required String uid,
    String? emoji,
  });
}

/// Realtime Database chat persistence.
///
/// Paths:
/// - `chats/{id}` — conversation meta (`members` map for rules)
/// - `messages/{chatId}/{messageId}` — message bodies
/// - `userChats/{uid}/{chatId}` — inbox index (`lastMessageAt`)
/// - `dmIndex/{dmKey}` — DM id lookup
class RtdbChatStore implements ChatStore {
  RtdbChatStore({FirebaseDatabase? database})
      : _db = database ?? FirebaseDatabase.instance;

  final FirebaseDatabase _db;

  DatabaseReference get _root => _db.ref();

  Map<String, dynamic> _asStringKeyedMap(Object? raw) {
    if (raw is! Map) return {};
    return raw.map((key, value) => MapEntry('$key', value));
  }

  Future<List<ChatConversation>> _inboxFromIndex(Object? raw) async {
    if (raw is! Map || raw.isEmpty) return <ChatConversation>[];

    final entries = raw.entries.toList();
    entries.sort((a, b) {
      final aAt = _readMillis(_asStringKeyedMap(a.value)['lastMessageAt']);
      final bAt = _readMillis(_asStringKeyedMap(b.value)['lastMessageAt']);
      return bAt.compareTo(aAt);
    });

    final chats = <ChatConversation>[];
    for (final entry in entries) {
      final chatId = '${entry.key}';
      final snap = await _root.child('chats/$chatId').get();
      if (!snap.exists || snap.value is! Map) continue;
      chats.add(
        ChatConversation.fromMap(chatId, _asStringKeyedMap(snap.value)),
      );
    }
    return chats;
  }

  /// RTDB `onValue` streams are single-subscription; [Stream.multi] makes each
  /// `.listen` start a fresh native subscription (needed when the inbox pauses).
  @override
  Stream<List<ChatConversation>> watchChats(String uid) {
    return Stream.multi((controller) {
      final sub = _root.child('userChats/$uid').onValue.listen(
        (event) async {
          try {
            controller.add(await _inboxFromIndex(event.snapshot.value));
          } catch (e, st) {
            controller.addError(e, st);
          }
        },
        onError: controller.addError,
        onDone: controller.close,
      );
      controller.onCancel = sub.cancel;
    });
  }

  @override
  Stream<ChatConversation?> watchChat(String chatId) {
    return Stream.multi((controller) {
      final sub = _root.child('chats/$chatId').onValue.listen(
        (event) {
          final snap = event.snapshot;
          if (!snap.exists || snap.value is! Map) {
            controller.add(null);
            return;
          }
          controller.add(
            ChatConversation.fromMap(chatId, _asStringKeyedMap(snap.value)),
          );
        },
        onError: controller.addError,
        onDone: controller.close,
      );
      controller.onCancel = sub.cancel;
    });
  }

  @override
  Stream<List<ChatMessage>> watchMessages(
    String chatId, {
    int limit = kChatMessagePageSize,
  }) {
    return Stream.multi((controller) {
      final query = _root
          .child('messages/$chatId')
          .orderByChild('createdAt')
          .limitToLast(limit);
      final sub = query.onValue.listen(
        (event) {
          final raw = event.snapshot.value;
          if (raw is! Map) {
            controller.add(<ChatMessage>[]);
            return;
          }
          final list = <ChatMessage>[];
          for (final entry in raw.entries) {
            final data = _asStringKeyedMap(entry.value);
            list.add(ChatMessage.fromMap('${entry.key}', {
              ...data,
              'chatId': chatId,
            }));
          }
          list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          controller.add(list);
        },
        onError: controller.addError,
        onDone: controller.close,
      );
      controller.onCancel = sub.cancel;
    });
  }

  @override
  Future<ChatConversation?> findDmByKey(
    String dmKey, {
    required String viewerUid,
  }) async {
    final byId = await _root.child('chats/$dmKey').get();
    if (byId.exists && byId.value is Map) {
      final chat = ChatConversation.fromMap(dmKey, _asStringKeyedMap(byId.value));
      if (chat.memberIds.contains(viewerUid)) return chat;
    }

    final index = await _root.child('dmIndex/$dmKey').get();
    final mappedId = index.value?.toString();
    if (mappedId == null || mappedId.isEmpty) return null;
    final snap = await _root.child('chats/$mappedId').get();
    if (!snap.exists || snap.value is! Map) return null;
    final chat =
        ChatConversation.fromMap(mappedId, _asStringKeyedMap(snap.value));
    if (!chat.memberIds.contains(viewerUid)) return null;
    return chat;
  }

  @override
  Future<bool> hasUserChatIndex({
    required String uid,
    required String chatId,
  }) async {
    final snap = await _root.child('userChats/$uid/$chatId').get();
    return snap.exists;
  }

  @override
  Future<ChatConversation> createChat(ChatConversation chat) async {
    final ref = chat.id.isEmpty
        ? _root.child('chats').push()
        : _root.child('chats/${chat.id}');
    final id = ref.key!;
    final saved = ChatConversation(
      id: id,
      memberIds: chat.memberIds,
      memberNames: chat.memberNames,
      isGroup: chat.isGroup,
      title: chat.title,
      dmKey: chat.dmKey,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      lastMessageSenderId: chat.lastMessageSenderId,
      unreadCounts: chat.unreadCounts,
      pinnedBy: chat.pinnedBy,
      createdAt: chat.createdAt,
      createdBy: chat.createdBy,
      isDefaultAgentGroup: chat.isDefaultAgentGroup,
      isSupportChat: chat.isSupportChat,
    );

    final updates = <String, Object?>{
      'chats/$id': saved.toRtdbMap(),
    };
    final at = saved.lastMessageAt.toUtc().millisecondsSinceEpoch;
    for (final memberId in userChatIndexMemberIds(saved.memberIds)) {
      updates['userChats/$memberId/$id'] = {'lastMessageAt': at};
    }
    if (saved.dmKey != null && saved.dmKey!.isNotEmpty) {
      updates['dmIndex/${saved.dmKey}'] = id;
    }
    await _root.update(updates);
    return saved;
  }

  @override
  Future<void> updateChat(ChatConversation chat) async {
    final at = chat.lastMessageAt.toUtc().millisecondsSinceEpoch;
    final updates = <String, Object?>{
      'chats/${chat.id}/memberNames': chat.memberNames,
      'chats/${chat.id}/title': chat.title,
      'chats/${chat.id}/lastMessage': chat.lastMessage,
      'chats/${chat.id}/lastMessageAt': at,
      'chats/${chat.id}/lastMessageSenderId': chat.lastMessageSenderId,
      'chats/${chat.id}/unreadCounts': chat.unreadCounts,
      'chats/${chat.id}/pinnedBy': {
        for (final e in chat.pinnedBy.entries)
          if (e.value) e.key: true,
      },
    };
    for (final memberId in userChatIndexMemberIds(chat.memberIds)) {
      updates['userChats/$memberId/${chat.id}/lastMessageAt'] = at;
    }
    await _root.update(updates);
  }

  @override
  Future<ChatMessage> addMessage(ChatMessage message) async {
    final ref = _root.child('messages/${message.chatId}').push();
    final id = ref.key!;
    final payload = message.toMap()
      ..remove('chatId')
      ..remove('reactions');
    await ref.set(payload);
    return ChatMessage.fromMap(id, {
      ...payload,
      'chatId': message.chatId,
      'createdAt': message.createdAt,
    });
  }

  @override
  Future<void> setMessageReaction({
    required String chatId,
    required String messageId,
    required String uid,
    String? emoji,
  }) async {
    final ref = _root.child('messages/$chatId/$messageId/reactions/$uid');
    final trimmed = emoji?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      await ref.remove();
    } else {
      await ref.set(trimmed);
    }
  }

  int _readMillis(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return 0;
  }
}

class ChatRepository {
  ChatRepository({
    ChatStore? store,
    this._idFactory,
    DateTime Function()? clock,
  })  : _store = store ?? RtdbChatStore(),
        _clock = clock ?? (() => DateTime.now().toUtc());

  final ChatStore _store;
  final ChatIdFactory? _idFactory;
  final DateTime Function() _clock;

  Stream<List<ChatConversation>> watchChats(String uid) =>
      _store.watchChats(uid);

  Stream<ChatConversation?> watchChat(String chatId) =>
      _store.watchChat(chatId);

  Stream<List<ChatMessage>> watchMessages(
    String chatId, {
    int limit = kChatMessagePageSize,
  }) =>
      _store.watchMessages(chatId, limit: limit);

  Future<ChatConversation> getOrCreateDm({
    required UserProfile me,
    required UserProfile other,
  }) async {
    _ensureCanChat(me);
    _ensureCanChat(other);
    if (me.uid == other.uid) {
      throw StateError('No puedes chatear contigo mismo.');
    }

    final key = dmKeyFor(me.uid, other.uid);
    final existing = await _store.findDmByKey(key, viewerUid: me.uid);
    if (existing != null) return existing;

    final now = _clock();
    final id = _idFactory?.call() ?? key;
    final chat = ChatConversation(
      id: id,
      memberIds: [me.uid, other.uid]..sort(),
      memberNames: {
        me.uid: me.headlineName,
        other.uid: other.headlineName,
      },
      isGroup: false,
      dmKey: key,
      lastMessage: '',
      lastMessageAt: now,
      createdAt: now,
      createdBy: me.uid,
      unreadCounts: {me.uid: 0, other.uid: 0},
      pinnedBy: const {},
    );
    return _store.createChat(chat);
  }

  /// Creates a group chat. Only admin / instructor / manager.
  Future<ChatConversation> createGroup({
    required UserProfile creator,
    required String title,
    required List<UserProfile> members,
  }) async {
    _ensureCanChat(creator);
    if (!canCreateChatGroups(creator.role)) {
      throw StateError(
        'Only admins, instructors, and managers can create groups.',
      );
    }
    final trimmed = title.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('Enter a group name.');
    }
    final others = <UserProfile>[];
    final seen = <String>{creator.uid};
    for (final member in members) {
      if (seen.add(member.uid)) {
        _ensureCanChat(member);
        others.add(member);
      }
    }
    if (others.isEmpty) {
      throw ArgumentError('Pick at least one other member.');
    }
    final all = [creator, ...others];
    if (all.length > 20) {
      throw ArgumentError('Groups can have at most 20 members.');
    }

    final now = _clock();
    final id = _idFactory?.call() ?? '';
    final chat = ChatConversation(
      id: id,
      memberIds: all.map((p) => p.uid).toList()..sort(),
      memberNames: {
        for (final p in all) p.uid: p.headlineName,
      },
      isGroup: true,
      title: trimmed,
      lastMessage: '',
      lastMessageAt: now,
      createdAt: now,
      createdBy: creator.uid,
      unreadCounts: {for (final p in all) p.uid: 0},
      pinnedBy: const {},
      isDefaultAgentGroup: false,
      isSupportChat: false,
    );
    return _store.createChat(chat);
  }

  /// One hybrid support thread per user (AI assistant + human agents).
  Future<ChatConversation> getOrCreateSupportChat({
    required UserProfile me,
    String aiName = 'Support Assistant',
    String? welcomeMessage,
  }) async {
    _ensureCanChat(me);
    final id = supportChatIdFor(me.uid);
    // Probe via userChats (always readable by owner). Reading chats/$id when
    // missing is denied by membership rules and surfaces as permission-denied.
    if (await _store.hasUserChatIndex(uid: me.uid, chatId: id)) {
      final existing = await _store.watchChat(id).first;
      if (existing != null) return existing;
    }

    final now = _clock();
    final chat = await _store.createChat(
      ChatConversation(
        id: id,
        memberIds: [me.uid, ChatConversation.supportAiUid]..sort(),
        memberNames: {
          me.uid: me.headlineName,
          ChatConversation.supportAiUid: aiName,
        },
        isGroup: true,
        title: 'Support',
        lastMessage: '',
        lastMessageAt: now,
        createdAt: now,
        createdBy: me.uid,
        unreadCounts: {
          me.uid: 0,
          ChatConversation.supportAiUid: 0,
        },
        pinnedBy: const {},
        isDefaultAgentGroup: false,
        isSupportChat: true,
      ),
    );

    final welcome = welcomeMessage?.trim();
    if (welcome != null && welcome.isNotEmpty) {
      await sendSupportAiReply(
        chatId: chat.id,
        body: welcome,
        aiName: aiName,
      );
      return (await _store.watchChat(chat.id).first) ?? chat;
    }
    return chat;
  }

  /// Posts an automated support reply as the synthetic AI member.
  Future<ChatMessage> sendSupportAiReply({
    required String chatId,
    required String body,
    String aiName = 'Support Assistant',
  }) async {
    final text = body.trim();
    if (text.isEmpty) {
      throw ArgumentError('Write a message.');
    }
    final chat = await _requireChat(chatId);
    if (!chat.isSupportChat) {
      throw StateError('Not a support chat.');
    }

    final now = _clock();
    final message = await _store.addMessage(
      ChatMessage(
        id: '',
        chatId: chatId,
        body: text,
        senderId: ChatConversation.supportAiUid,
        senderName: aiName,
        createdAt: now,
        isAi: true,
      ),
    );

    final nextUnread = Map<String, int>.from(chat.unreadCounts);
    for (final memberId in chat.memberIds) {
      if (memberId == ChatConversation.supportAiUid) {
        nextUnread[memberId] = 0;
      } else {
        nextUnread[memberId] = (nextUnread[memberId] ?? 0) + 1;
      }
    }

    await _store.updateChat(
      chat.copyWith(
        lastMessage: text,
        lastMessageAt: now,
        lastMessageSenderId: ChatConversation.supportAiUid,
        unreadCounts: nextUnread,
        memberNames: {
          ...chat.memberNames,
          ChatConversation.supportAiUid: aiName,
        },
      ),
    );
    return message;
  }

  Future<ChatMessage> sendMessage({
    required String chatId,
    required String body,
    required UserProfile author,
  }) async {
    _ensureCanChat(author);
    final text = body.trim();
    if (text.isEmpty) {
      throw ArgumentError('Escribe un mensaje.');
    }
    return _appendMessage(
      chatId: chatId,
      author: author,
      body: text,
      preview: text,
      sharedPost: null,
    );
  }

  Future<ChatMessage> sharePost({
    required String chatId,
    required UserProfile author,
    required SharedPostPreview preview,
  }) async {
    _ensureCanChat(author);
    if (preview.threadId.trim().isEmpty || preview.title.trim().isEmpty) {
      throw ArgumentError('La pregunta a compartir no es válida.');
    }
    return _appendMessage(
      chatId: chatId,
      author: author,
      body: '',
      preview: 'Pregunta: ${preview.title}',
      sharedPost: preview,
    );
  }

  Future<void> markRead({
    required String chatId,
    required String uid,
  }) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    if (chat.unreadFor(uid) == 0) return;
    final nextUnread = Map<String, int>.from(chat.unreadCounts)..[uid] = 0;
    await _store.updateChat(chat.copyWith(unreadCounts: nextUnread));
  }

  Future<void> setPinned({
    required String chatId,
    required String uid,
    required bool pinned,
  }) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    final nextPinned = Map<String, bool>.from(chat.pinnedBy)..[uid] = pinned;
    await _store.updateChat(chat.copyWith(pinnedBy: nextPinned));
  }

  /// Toggles [emoji] for [uid] on a message (same emoji again clears).
  Future<void> toggleReaction({
    required String chatId,
    required String messageId,
    required String uid,
    required String emoji,
  }) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    final trimmed = emoji.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('Pick a reaction.');
    }

    final messages = await _store.watchMessages(chatId).first;
    ChatMessage? target;
    for (final m in messages) {
      if (m.id == messageId) {
        target = m;
        break;
      }
    }
    if (target == null) {
      throw StateError('Este chat ya no existe.');
    }

    final current = target.reactions[uid];
    await _store.setMessageReaction(
      chatId: chatId,
      messageId: messageId,
      uid: uid,
      emoji: current == trimmed ? null : trimmed,
    );
  }

  Future<ChatMessage> _appendMessage({
    required String chatId,
    required UserProfile author,
    required String body,
    required String preview,
    required SharedPostPreview? sharedPost,
  }) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(author.uid)) {
      throw StateError('No eres miembro de este chat.');
    }

    final now = _clock();
    final message = await _store.addMessage(
      ChatMessage(
        id: '',
        chatId: chatId,
        body: body,
        senderId: author.uid,
        senderName: author.headlineName,
        createdAt: now,
        sharedPost: sharedPost,
      ),
    );

    final nextUnread = Map<String, int>.from(chat.unreadCounts);
    for (final memberId in chat.memberIds) {
      if (memberId == author.uid) {
        nextUnread[memberId] = 0;
      } else {
        nextUnread[memberId] = (nextUnread[memberId] ?? 0) + 1;
      }
    }

    final names = Map<String, String>.from(chat.memberNames)
      ..[author.uid] = author.headlineName;

    await _store.updateChat(
      chat.copyWith(
        lastMessage: preview,
        lastMessageAt: now,
        lastMessageSenderId: author.uid,
        unreadCounts: nextUnread,
        memberNames: names,
      ),
    );

    return message;
  }

  Future<ChatConversation> _requireChat(String chatId) async {
    final snap = await _store.watchChat(chatId).first;
    if (snap == null) {
      throw StateError('Este chat ya no existe.');
    }
    return snap;
  }

  void _ensureCanChat(UserProfile profile) {
    if (!canParticipateInChats(
      role: profile.role,
      isAnonymous: profile.isAnonymous,
    )) {
      throw StateError('Regístrate con una cuenta para usar los chats.');
    }
  }
}
