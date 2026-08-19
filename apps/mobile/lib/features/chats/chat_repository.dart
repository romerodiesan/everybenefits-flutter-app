import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_database/firebase_database.dart';

import '../../firebase/https_callable.dart';
import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import 'chat_models.dart';

typedef ChatIdFactory = String Function();

const kChatMessagePageSize = 40;

/// Persistence port for chats (testable without Firebase).
abstract class ChatStore {
  /// Prepares server-backed authorization state before opening RTDB streams.
  /// In-memory stores need no preparation.
  Future<void> prepareAccess() async {}

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
  Future<bool> hasUserChatIndex({required String uid, required String chatId});

  /// Removes this chat from [uid]'s inbox index (hide for me).
  Future<void> removeUserChatIndex({
    required String uid,
    required String chatId,
  });

  /// Patches [uid]'s inbox row (own index only). Used to refresh listeners on pin.
  Future<void> patchUserChatIndex({
    required String uid,
    required String chatId,
    required int lastMessageAt,
    bool? pinned,
  });

  /// Ensures inbox rows exist for all indexable members (e.g. after a new message).
  Future<void> ensureUserChatIndexes(ChatConversation chat);

  /// Own unread only — `chats/{id}/unreadCounts/{uid}` (rules allow self).
  Future<void> patchOwnUnread({
    required String chatId,
    required String uid,
    required int count,
  });

  /// Own photo/username on this chat (rules allow self).
  Future<void> patchChatMemberSelf({
    required String chatId,
    required String uid,
    String? photoUrl,
    String? username,
  });

  /// Own pin only — `chats/{id}/pinnedBy/{uid}` (rules allow self).
  Future<void> patchOwnPinned({
    required String chatId,
    required String uid,
    required bool pinned,
  });

  Future<ChatMessage> addMessage(ChatMessage message);

  /// Sets or clears `messages/{chatId}/{messageId}/reactions/{uid}`.
  Future<void> setMessageReaction({
    required String chatId,
    required String messageId,
    required String uid,
    String? emoji,
  });

  Stream<Set<String>> watchHiddenMessageIds({
    required String chatId,
    required String uid,
  });

  Future<void> setMessageHidden({
    required String chatId,
    required String messageId,
    required String uid,
    required bool hidden,
  });

  /// uid → last typing heartbeat (ms).
  Stream<Map<String, int>> watchTyping(String chatId);

  Future<void> setTyping({
    required String chatId,
    required String uid,
    required bool typing,
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
  RtdbChatStore({
    FirebaseDatabase? database,
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _db = database ?? FirebaseDatabase.instance,
       _callables = callables ?? HttpsCallableClient(functions: functions);

  final FirebaseDatabase _db;
  final HttpsCallableClient _callables;
  Future<void>? _accessReady;

  DatabaseReference get _root => _db.ref();

  @override
  Future<void> prepareAccess() async {
    final pending = _accessReady;
    if (pending != null) return pending;
    final next = _refreshChatAccess();
    _accessReady = next;
    try {
      await next;
    } catch (_) {
      _accessReady = null;
      rethrow;
    }
  }

  Future<void> _refreshChatAccess() async {
    try {
      final result = await _callables.call(
        'refreshMyChatAccess',
        <String, dynamic>{},
      );
      final data = _asStringKeyedMap(result);
      if (data['allowed'] == false) {
        throw StateError('No tienes permisos para usar los chats.');
      }
    } on FirebaseFunctionsException catch (error) {
      // Backward-compatible during a rolling deploy against older Functions.
      if (error.code == 'not-found' || error.code == 'unimplemented') return;
      rethrow;
    }
  }

  Map<String, dynamic> _asStringKeyedMap(Object? raw) {
    if (raw is! Map) return {};
    return raw.map((key, value) => MapEntry('$key', value));
  }

  /// Chat meta cache for legacy index rows (only `lastMessageAt`) written
  /// before syncChatInbox denormalized the inbox. Refreshed per chat when a
  /// newer message lands.
  final Map<String, Map<String, dynamic>> _legacyChatMeta = {};

  Future<List<ChatConversation>> _inboxFromIndex(
    Object? raw, {
    required String viewerUid,
  }) async {
    if (raw is! Map || raw.isEmpty) return <ChatConversation>[];

    final entries = raw.entries.toList();
    entries.sort((a, b) {
      final aAt = _readMillis(_asStringKeyedMap(a.value)['lastMessageAt']);
      final bAt = _readMillis(_asStringKeyedMap(b.value)['lastMessageAt']);
      return bAt.compareTo(aAt);
    });

    Future<void> refreshLegacyMeta(String chatId) async {
      try {
        final snap = await _root.child('chats/$chatId').get();
        final value = snap.value;
        if (value is Map) {
          _legacyChatMeta[chatId] = _asStringKeyedMap(value);
        }
      } catch (_) {
        // Names stay blank for rows we could not read.
      }
    }

    final pending = <Future<void>>[];
    for (final entry in entries) {
      final row = _asStringKeyedMap(entry.value);
      if (row['memberIds'] is List) continue;
      final chatId = '${entry.key}';
      final cached = _legacyChatMeta[chatId];
      if (cached == null ||
          _readMillis(row['lastMessageAt']) >
              _readMillis(cached['lastMessageAt'])) {
        pending.add(refreshLegacyMeta(chatId));
      }
    }
    if (pending.isNotEmpty) await Future.wait(pending);

    return [
      for (final entry in entries)
        _conversationFromIndexRow(
          '${entry.key}',
          _asStringKeyedMap(entry.value),
          viewerUid: viewerUid,
        ),
    ];
  }

  ChatConversation _conversationFromIndexRow(
    String chatId,
    Map<String, dynamic> row, {
    required String viewerUid,
  }) {
    if (row['memberIds'] is! List) {
      final meta = _legacyChatMeta[chatId];
      if (meta != null) {
        final data = Map<String, dynamic>.from(meta);
        if (row['pinned'] is bool) {
          data['pinnedBy'] = {
            ..._asStringKeyedMap(meta['pinnedBy']),
            viewerUid: row['pinned'] == true,
          };
        }
        return ChatConversation.fromMap(chatId, data);
      }
    }
    return ChatConversation.fromMap(chatId, {
      ...row,
      'members': {
        for (final id in (row['memberIds'] as List? ?? const [])) '$id': true,
      },
      'unreadCounts': {viewerUid: _readMillis(row['unreadCount'])},
      'pinnedBy': {viewerUid: row['pinned'] == true},
    });
  }

  /// RTDB `onValue` streams are single-subscription; [Stream.multi] makes each
  /// `.listen` start a fresh native subscription (needed when the inbox pauses).
  @override
  Stream<List<ChatConversation>> watchChats(String uid) async* {
    await prepareAccess();
    unawaited(_rebuildInbox());
    yield* Stream.multi((controller) {
      final sub = _root
          .child('userChats/$uid')
          .onValue
          .listen(
            (event) async {
              try {
                controller.add(
                  await _inboxFromIndex(event.snapshot.value, viewerUid: uid),
                );
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

  Future<void> _rebuildInbox() async {
    try {
      await _callables.call('rebuildChatInbox', <String, dynamic>{});
    } catch (_) {
      // Legacy rows refresh automatically on the next chat write.
    }
  }

  @override
  Stream<ChatConversation?> watchChat(String chatId) async* {
    await prepareAccess();
    yield* Stream.multi((controller) {
      final sub = _root
          .child('chats/$chatId')
          .onValue
          .listen(
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
  }) async* {
    await prepareAccess();
    yield* Stream.multi((controller) {
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
            list.add(
              ChatMessage.fromMap('${entry.key}', {...data, 'chatId': chatId}),
            );
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
    await prepareAccess();
    final byId = await _root.child('chats/$dmKey').get();
    if (byId.exists && byId.value is Map) {
      final chat = ChatConversation.fromMap(
        dmKey,
        _asStringKeyedMap(byId.value),
      );
      if (chat.memberIds.contains(viewerUid)) return chat;
    }

    final index = await _root.child('dmIndex/$dmKey').get();
    final mappedId = index.value?.toString();
    if (mappedId == null || mappedId.isEmpty) return null;
    final snap = await _root.child('chats/$mappedId').get();
    if (!snap.exists || snap.value is! Map) return null;
    final chat = ChatConversation.fromMap(
      mappedId,
      _asStringKeyedMap(snap.value),
    );
    if (!chat.memberIds.contains(viewerUid)) return null;
    return chat;
  }

  @override
  Future<bool> hasUserChatIndex({
    required String uid,
    required String chatId,
  }) async {
    await prepareAccess();
    final snap = await _root.child('userChats/$uid/$chatId').get();
    return snap.exists;
  }

  @override
  Future<ChatConversation> createChat(ChatConversation chat) async {
    if (chat.isGroup) {
      final result = await _callables.call(
        'createGroupChat',
        <String, dynamic>{'title': chat.title, 'memberIds': chat.memberIds},
      );
      final data = _asStringKeyedMap(result);
      final chatId = '${data['chatId'] ?? ''}'.trim();
      if (chatId.isEmpty) {
        throw StateError('No se pudo crear el grupo.');
      }
      final createdAtMs = data['createdAt'] is num
          ? (data['createdAt'] as num).toInt()
          : DateTime.now().millisecondsSinceEpoch;
      final createdAt = DateTime.fromMillisecondsSinceEpoch(createdAtMs);
      // Do not await an RTDB read here — a stuck client connection hangs the
      // UI forever even after the callable succeeds.
      return ChatConversation(
        id: chatId,
        memberIds: List<String>.from(chat.memberIds)..sort(),
        memberNames: Map<String, String>.from(chat.memberNames),
        memberPhotos: Map<String, String>.from(chat.memberPhotos),
        memberUsernames: Map<String, String>.from(chat.memberUsernames),
        isGroup: true,
        title: chat.title,
        dmKey: null,
        lastMessage: '',
        lastMessageAt: createdAt,
        lastMessageSenderId: null,
        unreadCounts: {for (final id in chat.memberIds) id: 0},
        pinnedBy: const {},
        createdAt: createdAt,
        createdBy: chat.createdBy,
        isDefaultAgentGroup: false,
      );
    }

    final otherUid = chat.memberIds.firstWhere(
      (id) => id != chat.createdBy,
      orElse: () => '',
    );
    if (otherUid.isEmpty) {
      throw StateError('Valid recipient required.');
    }
    final result = await _callables.call(
      'createDm',
      <String, dynamic>{'otherUid': otherUid},
    );
    final data = _asStringKeyedMap(result);
    final chatId = '${data['chatId'] ?? chat.dmKey ?? ''}'.trim();
    if (chatId.isEmpty) {
      throw StateError('No se pudo crear el chat.');
    }
    final createdAtMs = data['createdAt'] is num
        ? (data['createdAt'] as num).toInt()
        : DateTime.now().millisecondsSinceEpoch;
    final createdAt = DateTime.fromMillisecondsSinceEpoch(createdAtMs);
    final memberIds = (data['memberIds'] is List)
        ? (data['memberIds'] as List).map((e) => '$e').toList()
        : List<String>.from(chat.memberIds);
    final memberNames = data['memberNames'] is Map
        ? _asStringKeyedMap(
            data['memberNames'],
          ).map((k, v) => MapEntry(k, '$v'))
        : Map<String, String>.from(chat.memberNames);
    return ChatConversation(
      id: chatId,
      memberIds: memberIds..sort(),
      memberNames: memberNames,
      memberPhotos: Map<String, String>.from(chat.memberPhotos),
      memberUsernames: Map<String, String>.from(chat.memberUsernames),
      isGroup: false,
      title: null,
      dmKey: chat.dmKey ?? chatId,
      lastMessage: '',
      lastMessageAt: createdAt,
      lastMessageSenderId: null,
      unreadCounts: {for (final id in memberIds) id: 0},
      pinnedBy: const {},
      createdAt: createdAt,
      createdBy: chat.createdBy,
      isDefaultAgentGroup: false,
    );
  }

  @override
  Future<void> patchOwnUnread({
    required String chatId,
    required String uid,
    required int count,
  }) async {
    await prepareAccess();
    await _root.child('chats/$chatId/unreadCounts/$uid').set(count);
  }

  @override
  Future<void> patchChatMemberSelf({
    required String chatId,
    required String uid,
    String? photoUrl,
    String? username,
  }) async {
    await prepareAccess();
    final updates = <String, Object?>{};
    if (photoUrl != null) {
      updates['chats/$chatId/memberPhotos/$uid'] = photoUrl.trim().isEmpty
          ? null
          : photoUrl.trim();
    }
    if (username != null) {
      updates['chats/$chatId/memberUsernames/$uid'] = username.trim().isEmpty
          ? null
          : username.trim();
    }
    if (updates.isNotEmpty) await _root.update(updates);
  }

  @override
  Future<void> patchOwnPinned({
    required String chatId,
    required String uid,
    required bool pinned,
  }) async {
    await prepareAccess();
    final ref = _root.child('chats/$chatId/pinnedBy/$uid');
    if (pinned) {
      await ref.set(true);
    } else {
      await ref.remove();
    }
  }

  @override
  Future<void> removeUserChatIndex({
    required String uid,
    required String chatId,
  }) async {
    await prepareAccess();
    await _root.child('userChats/$uid/$chatId').remove();
  }

  @override
  Future<void> patchUserChatIndex({
    required String uid,
    required String chatId,
    required int lastMessageAt,
    bool? pinned,
  }) async {
    await prepareAccess();
    final updates = <String, Object?>{
      'userChats/$uid/$chatId/lastMessageAt': lastMessageAt,
    };
    if (pinned != null) {
      updates['userChats/$uid/$chatId/pinned'] = pinned;
    }
    await _root.update(updates);
  }

  @override
  Future<void> ensureUserChatIndexes(ChatConversation chat) async {
    // syncChatInbox fans out denormalized rows with Admin privileges.
  }

  @override
  Future<ChatMessage> addMessage(ChatMessage message) async {
    await prepareAccess();
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
    await prepareAccess();
    final ref = _root.child('messages/$chatId/$messageId/reactions/$uid');
    final trimmed = emoji?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      await ref.remove();
    } else {
      await ref.set(trimmed);
    }
  }

  @override
  Stream<Set<String>> watchHiddenMessageIds({
    required String chatId,
    required String uid,
  }) async* {
    await prepareAccess();
    yield* _root.child('hiddenMessages/$uid/$chatId').onValue.map((event) {
      final raw = event.snapshot.value;
      if (raw is! Map) return <String>{};
      return raw.entries
          .where((entry) => entry.value == true)
          .map((entry) => '${entry.key}')
          .toSet();
    });
  }

  @override
  Future<void> setMessageHidden({
    required String chatId,
    required String messageId,
    required String uid,
    required bool hidden,
  }) async {
    await prepareAccess();
    final ref = _root.child('hiddenMessages/$uid/$chatId/$messageId');
    if (hidden) {
      await ref.set(true);
    } else {
      await ref.remove();
    }
  }

  @override
  Stream<Map<String, int>> watchTyping(String chatId) async* {
    await prepareAccess();
    yield* Stream.multi((controller) {
      final sub = _root
          .child('typing/$chatId')
          .onValue
          .listen(
            (event) {
              final raw = event.snapshot.value;
              if (raw is! Map) {
                controller.add(const {});
                return;
              }
              final out = <String, int>{};
              for (final entry in raw.entries) {
                final row = _asStringKeyedMap(entry.value);
                out['${entry.key}'] = _readMillis(row['at']);
              }
              controller.add(out);
            },
            onError: controller.addError,
            onDone: controller.close,
          );
      controller.onCancel = sub.cancel;
    });
  }

  @override
  Future<void> setTyping({
    required String chatId,
    required String uid,
    required bool typing,
  }) async {
    await prepareAccess();
    final ref = _root.child('typing/$chatId/$uid');
    if (typing) {
      await ref.set({'at': DateTime.now().toUtc().millisecondsSinceEpoch});
    } else {
      await ref.remove();
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
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
    ChatIdFactory? idFactory,
    DateTime Function()? clock,
  }) : this._(
         store: store,
         callables: callables ?? HttpsCallableClient(functions: functions),
         idFactory: idFactory,
         clock: clock,
       );

  ChatRepository._({
    required ChatStore? store,
    required HttpsCallableClient callables,
    ChatIdFactory? idFactory,
    DateTime Function()? clock,
  }) : _callables = callables,
       _store = store ?? RtdbChatStore(callables: callables),
       _idFactory = idFactory,
       _clock = clock ?? (() => DateTime.now().toUtc());

  final ChatStore _store;
  final HttpsCallableClient _callables;
  final ChatIdFactory? _idFactory;
  final DateTime Function() _clock;

  Stream<List<ChatConversation>> watchChats(String uid) =>
      _store.watchChats(uid);

  Stream<ChatConversation?> watchChat(String chatId) =>
      _store.watchChat(chatId);

  Stream<List<ChatMessage>> watchMessages(
    String chatId, {
    int limit = kChatMessagePageSize,
  }) => _store.watchMessages(chatId, limit: limit);

  Stream<Map<String, int>> watchTyping(String chatId) =>
      _store.watchTyping(chatId);

  Stream<Set<String>> watchHiddenMessageIds({
    required String chatId,
    required String uid,
  }) => _store.watchHiddenMessageIds(chatId: chatId, uid: uid);

  Future<void> setTyping({
    required String chatId,
    required String uid,
    required bool typing,
  }) => _store.setTyping(chatId: chatId, uid: uid, typing: typing);

  Future<ChatConversation> getOrCreateDm({
    required UserProfile me,
    required UserProfile other,
    Object? access,
  }) async {
    _ensureCanChat(me);
    _ensureCanChat(other);
    if (me.uid == other.uid) {
      throw StateError('No puedes chatear contigo mismo.');
    }

    final key = dmKeyFor(me.uid, other.uid);
    if (!canAccessAllChatContacts(access ?? me.roleId)) {
      final existing = await _store.findDmByKey(key, viewerUid: me.uid);
      if (existing != null) {
        await _ensureDirectMessaging(existing, me.uid);
        return existing;
      }
    }

    final now = _clock();
    final id = _idFactory?.call() ?? key;
    final chat = ChatConversation(
      id: id,
      memberIds: [me.uid, other.uid]..sort(),
      memberNames: {me.uid: me.headlineName, other.uid: other.headlineName},
      memberPhotos: {
        if (me.photoUrl != null && me.photoUrl!.trim().isNotEmpty)
          me.uid: me.photoUrl!,
        if (other.photoUrl != null && other.photoUrl!.trim().isNotEmpty)
          other.uid: other.photoUrl!,
      },
      memberUsernames: {
        if (me.hasUsername) me.uid: me.handle,
        if (other.hasUsername) other.uid: other.handle,
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
    if (!canCreateChatGroups(creator.roleId)) {
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
      memberNames: {for (final p in all) p.uid: p.headlineName},
      memberPhotos: {
        for (final p in all)
          if (p.photoUrl != null && p.photoUrl!.trim().isNotEmpty)
            p.uid: p.photoUrl!,
      },
      memberUsernames: {
        for (final p in all)
          if (p.hasUsername) p.uid: p.handle,
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
    );
    return _store.createChat(chat);
  }

  Future<ChatMessage> sendMessage({
    required String chatId,
    required String body,
    required UserProfile author,
    ChatReplyTo? replyTo,
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
      replyTo: replyTo,
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
      replyTo: null,
    );
  }

  Future<void> markRead({required String chatId, required String uid}) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    if (chat.unreadFor(uid) == 0) return;
    await _store.patchOwnUnread(chatId: chatId, uid: uid, count: 0);
  }

  Future<void> setPinned({
    required String chatId,
    required String uid,
    required bool pinned,
  }) async {
    final chat = await _requireChat(chatId);
    if (chat.isDefaultAgentGroup) {
      throw StateError('Este chat no se puede fijar.');
    }
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    await _store.patchOwnPinned(chatId: chatId, uid: uid, pinned: pinned);
    // Touch own inbox row so watchChats (listens to userChats) refreshes.
    await _store.patchUserChatIndex(
      uid: uid,
      chatId: chatId,
      lastMessageAt: chat.lastMessageAt.toUtc().millisecondsSinceEpoch,
      pinned: pinned,
    );
  }

  /// Hides [chatId] from [uid]'s inbox only (other members keep their row).
  Future<void> hideChatForMe({
    required String chatId,
    required String uid,
  }) async {
    final chat = await _requireChat(chatId);
    if (chat.isDefaultAgentGroup) {
      throw StateError('Este chat no se puede eliminar.');
    }
    if (!chat.memberIds.contains(uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    if (chat.isPinnedFor(uid)) {
      await _store.patchOwnPinned(chatId: chatId, uid: uid, pinned: false);
    }
    // Only this user's index — never other members' userChats.
    await _store.removeUserChatIndex(uid: uid, chatId: chatId);
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

  Future<void> hideMessageForMe({
    required String chatId,
    required String messageId,
    required String uid,
  }) {
    return _store.setMessageHidden(
      chatId: chatId,
      messageId: messageId,
      uid: uid,
      hidden: true,
    );
  }

  Future<void> deleteMessageForEveryone({
    required String chatId,
    required String messageId,
  }) async {
    await _callables.call('deleteChatMessage', <String, dynamic>{
      'chatId': chatId,
      'messageId': messageId,
    });
  }

  Future<void> clearMessages(String chatId) async {
    await _callables.call('clearChatMessages', <String, dynamic>{
      'chatId': chatId,
    });
  }

  Future<List<ChatConversation>> listManagedGroups({int limit = 100}) async {
    final result = await _callables.call(
      'listManagedGroupChats',
      <String, dynamic>{'limit': limit},
    );
    final payload = result is Map ? result : const {};
    final raw = payload['groups'];
    return (raw is List ? raw : const [])
        .whereType<Map>()
        .map((item) {
          final data = Map<String, dynamic>.from(item);
          final id = '${data.remove('id') ?? data['chatId'] ?? ''}';
          return ChatConversation.fromMap(id, data);
        })
        .where((chat) => chat.id.isNotEmpty && chat.isGroup)
        .toList();
  }

  Future<void> updateGroup({
    required String chatId,
    required String title,
    required Iterable<String> memberIds,
    String? photoUrl,
  }) async {
    await _callables.call('updateGroupChat', <String, dynamic>{
      'chatId': chatId,
      'title': title.trim(),
      'memberIds': memberIds.toSet().toList(),
      'photoUrl': ?photoUrl,
    });
  }

  Future<String> uploadGroupPhoto({
    required String chatId,
    required Uint8List bytes,
    String contentType = 'image/jpeg',
  }) async {
    final result = await _callables.call('uploadGroupChatPhoto', <String, dynamic>{
      'chatId': chatId,
      'contentType': contentType,
      'bytesBase64': base64Encode(bytes),
    });
    if (result is Map && result['downloadUrl'] is String) {
      return result['downloadUrl'] as String;
    }
    throw StateError('uploadGroupChatPhoto did not return a download URL.');
  }

  Future<void> deleteGroup(String chatId) async {
    await _callables.call('deleteGroupChat', <String, dynamic>{
      'chatId': chatId,
    });
  }

  Future<ChatMessage> _appendMessage({
    required String chatId,
    required UserProfile author,
    required String body,
    required String preview,
    required SharedPostPreview? sharedPost,
    ChatReplyTo? replyTo,
  }) async {
    final chat = await _requireChat(chatId);
    if (!chat.memberIds.contains(author.uid)) {
      throw StateError('No eres miembro de este chat.');
    }
    await _ensureDirectMessaging(chat, author.uid);

    final now = _clock();
    // RTDB rules require a non-empty body; shared-post-only uses the preview.
    final bodyForStore = body.trim().isEmpty ? preview : body;
    final message = await _store.addMessage(
      ChatMessage(
        id: '',
        chatId: chatId,
        body: bodyForStore,
        senderId: author.uid,
        senderName: author.headlineName,
        senderPhotoUrl: author.photoUrl,
        createdAt: now,
        sharedPost: sharedPost,
        replyTo: replyTo,
      ),
    );

    await _store.patchChatMemberSelf(
      chatId: chatId,
      uid: author.uid,
      photoUrl: author.photoUrl,
      username: author.hasUsername ? author.handle : null,
    );

    // lastMessage / unreadCounts are applied server-side by
    // syncChatMetadataOnMessage (clients cannot forge chat summary fields).
    await _store.ensureUserChatIndexes(chat);
    await _store.setTyping(chatId: chatId, uid: author.uid, typing: false);

    return message;
  }

  /// Best-effort: rewrite this user's photo on chats they belong to.
  Future<void> syncOwnMemberPhoto({
    required String uid,
    required String? photoUrl,
  }) async {
    final chats = await _store.watchChats(uid).first;
    for (final chat in chats.take(50)) {
      await _store.patchChatMemberSelf(
        chatId: chat.id,
        uid: uid,
        photoUrl: photoUrl ?? '',
      );
    }
  }

  Future<ChatConversation> _requireChat(String chatId) async {
    final snap = await _store.watchChat(chatId).first;
    if (snap == null) {
      throw StateError('Este chat ya no existe.');
    }
    return snap;
  }

  Future<void> _ensureDirectMessaging(
    ChatConversation chat,
    String viewerUid,
  ) async {
    if (chat.isGroup || _store is! RtdbChatStore) return;
    final otherUid = chat.memberIds.firstWhere(
      (uid) => uid != viewerUid,
      orElse: () => '',
    );
    if (otherUid.isEmpty) return;
    await _callables.call('createDm', <String, dynamic>{
      'otherUid': otherUid,
    });
  }

  void _ensureCanChat(UserProfile profile) {
    if (!canParticipateInChats(
      roleOrPermissions: profile.roleId,
      isAnonymous: profile.isAnonymous,
    )) {
      throw StateError('Regístrate con una cuenta para usar los chats.');
    }
  }
}
