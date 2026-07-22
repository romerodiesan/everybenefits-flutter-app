import 'package:cloud_firestore/cloud_firestore.dart';

import '../../users/user_profile.dart';
import 'chat_models.dart';

typedef ChatIdFactory = String Function();

/// Persistence port for chats (testable without Firestore).
abstract class ChatStore {
  Stream<List<ChatConversation>> watchChats(String uid);

  Stream<ChatConversation?> watchChat(String chatId);

  Stream<List<ChatMessage>> watchMessages(String chatId);

  Future<ChatConversation?> findDmByKey(String dmKey);

  Future<ChatConversation> createChat(ChatConversation chat);

  Future<void> updateChat(ChatConversation chat);

  Future<ChatMessage> addMessage(ChatMessage message);
}

class FirestoreChatStore implements ChatStore {
  FirestoreChatStore({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _chats =>
      _firestore.collection('chats');

  CollectionReference<Map<String, dynamic>> _messages(String chatId) =>
      _chats.doc(chatId).collection('messages');

  @override
  Stream<List<ChatConversation>> watchChats(String uid) {
    return _chats
        .where('memberIds', arrayContains: uid)
        .orderBy('lastMessageAt', descending: true)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => ChatConversation.fromMap(d.id, d.data()))
              .toList(),
        );
  }

  @override
  Stream<ChatConversation?> watchChat(String chatId) {
    return _chats.doc(chatId).snapshots().map((snap) {
      if (!snap.exists || snap.data() == null) return null;
      return ChatConversation.fromMap(snap.id, snap.data()!);
    });
  }

  @override
  Stream<List<ChatMessage>> watchMessages(String chatId) {
    return _messages(chatId)
        .orderBy('createdAt')
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => ChatMessage.fromMap(d.id, d.data()))
              .toList(),
        );
  }

  @override
  Future<ChatConversation?> findDmByKey(String dmKey) async {
    final snap =
        await _chats.where('dmKey', isEqualTo: dmKey).limit(1).get();
    if (snap.docs.isEmpty) return null;
    final doc = snap.docs.first;
    return ChatConversation.fromMap(doc.id, doc.data());
  }

  @override
  Future<ChatConversation> createChat(ChatConversation chat) async {
    final ref = chat.id.isEmpty ? _chats.doc() : _chats.doc(chat.id);
    final payload = chat.toMap();
    await ref.set(payload);
    return ChatConversation.fromMap(ref.id, {
      ...payload,
      'lastMessageAt': chat.lastMessageAt,
      'createdAt': chat.createdAt,
    });
  }

  @override
  Future<void> updateChat(ChatConversation chat) async {
    await _chats.doc(chat.id).update(chat.toMap());
  }

  @override
  Future<ChatMessage> addMessage(ChatMessage message) async {
    final ref = _messages(message.chatId).doc();
    final payload = message.toMap();
    await ref.set(payload);
    return ChatMessage.fromMap(ref.id, {
      ...payload,
      'createdAt': message.createdAt,
    });
  }
}

class ChatRepository {
  ChatRepository({
    ChatStore? store,
    ChatIdFactory? this._idFactory,
    DateTime Function()? clock,
  })  : _store = store ?? FirestoreChatStore(),
        _clock = clock ?? (() => DateTime.now().toUtc());

  final ChatStore _store;
  final ChatIdFactory? _idFactory;
  final DateTime Function() _clock;

  Stream<List<ChatConversation>> watchChats(String uid) =>
      _store.watchChats(uid);

  Stream<ChatConversation?> watchChat(String chatId) =>
      _store.watchChat(chatId);

  Stream<List<ChatMessage>> watchMessages(String chatId) =>
      _store.watchMessages(chatId);

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
    final existing = await _store.findDmByKey(key);
    if (existing != null) return existing;

    final now = _clock();
    final id = _idFactory?.call() ?? '';
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
