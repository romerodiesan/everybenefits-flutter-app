import 'dart:async';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';

class FakeChatStore implements ChatStore {
  final Map<String, ChatConversation> chats = {};
  final Map<String, List<ChatMessage>> messages = {};
  final Set<String> _hiddenInbox = {};
  final _chatsController = StreamController<void>.broadcast();
  final Map<String, StreamController<void>> _messageControllers = {};

  String _hideKey(String uid, String chatId) => '$uid|$chatId';

  void dispose() {
    _chatsController.close();
    for (final c in _messageControllers.values) {
      c.close();
    }
    for (final c in _typingControllers.values) {
      c.close();
    }
  }

  void _bumpChats() => _chatsController.add(null);

  StreamController<void> _messagesBump(String chatId) {
    return _messageControllers.putIfAbsent(
      chatId,
      () => StreamController<void>.broadcast(),
    );
  }

  @override
  Stream<List<ChatConversation>> watchChats(String uid) async* {
    List<ChatConversation> current() {
      final list = chats.values
          .where(
            (c) =>
                c.memberIds.contains(uid) &&
                !_hiddenInbox.contains(_hideKey(uid, c.id)),
          )
          .toList()
        ..sort((a, b) => b.lastMessageAt.compareTo(a.lastMessageAt));
      return list;
    }

    yield current();
    yield* _chatsController.stream.map((_) => current());
  }

  @override
  Stream<ChatConversation?> watchChat(String chatId) async* {
    yield chats[chatId];
    yield* _chatsController.stream.map((_) => chats[chatId]);
  }

  @override
  Stream<List<ChatMessage>> watchMessages(
    String chatId, {
    int limit = kChatMessagePageSize,
  }) async* {
    List<ChatMessage> current() {
      final list = List<ChatMessage>.from(messages[chatId] ?? const []);
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list.take(limit).toList();
    }

    yield current();
    yield* _messagesBump(chatId).stream.map((_) => current());
  }

  @override
  Future<ChatConversation?> findDmByKey(
    String dmKey, {
    required String viewerUid,
  }) async {
    final byId = chats[dmKey];
    if (byId != null && byId.memberIds.contains(viewerUid)) return byId;
    for (final chat in chats.values) {
      if (chat.dmKey == dmKey && chat.memberIds.contains(viewerUid)) {
        return chat;
      }
    }
    return null;
  }

  @override
  Future<bool> hasUserChatIndex({
    required String uid,
    required String chatId,
  }) async {
    final chat = chats[chatId];
    if (chat == null || !chat.memberIds.contains(uid)) return false;
    return !_hiddenInbox.contains(_hideKey(uid, chatId));
  }

  @override
  Future<void> removeUserChatIndex({
    required String uid,
    required String chatId,
  }) async {
    _hiddenInbox.add(_hideKey(uid, chatId));
    _bumpChats();
  }

  @override
  Future<void> patchUserChatIndex({
    required String uid,
    required String chatId,
    required int lastMessageAt,
    bool? pinned,
  }) async {
    final chat = chats[chatId];
    if (chat == null) return;
    if (pinned != null) {
      final next = Map<String, bool>.from(chat.pinnedBy)..[uid] = pinned;
      chats[chatId] = chat.copyWith(pinnedBy: next);
    }
    _hiddenInbox.remove(_hideKey(uid, chatId));
    _bumpChats();
  }

  @override
  Future<void> ensureUserChatIndexes(ChatConversation chat) async {
    for (final memberId in userChatIndexMemberIds(chat.memberIds)) {
      _hiddenInbox.remove(_hideKey(memberId, chat.id));
    }
    _bumpChats();
  }

  @override
  Future<ChatConversation> createChat(ChatConversation chat) async {
    final id = chat.id.isEmpty ? 'c-${chats.length + 1}' : chat.id;
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
    );
    chats[id] = saved;
    messages.putIfAbsent(id, () => []);
    for (final memberId in userChatIndexMemberIds(saved.memberIds)) {
      _hiddenInbox.remove(_hideKey(memberId, id));
    }
    _bumpChats();
    return saved;
  }

  @override
  Future<void> patchOwnUnread({
    required String chatId,
    required String uid,
    required int count,
  }) async {
    final chat = chats[chatId];
    if (chat == null) return;
    final next = Map<String, int>.from(chat.unreadCounts)..[uid] = count;
    chats[chatId] = chat.copyWith(unreadCounts: next);
    _bumpChats();
  }

  @override
  Future<void> patchChatMemberSelf({
    required String chatId,
    required String uid,
    String? photoUrl,
    String? username,
  }) async {
    final chat = chats[chatId];
    if (chat == null) return;
    final photos = Map<String, String>.from(chat.memberPhotos);
    final usernames = Map<String, String>.from(chat.memberUsernames);
    if (photoUrl != null) {
      if (photoUrl.trim().isEmpty) {
        photos.remove(uid);
      } else {
        photos[uid] = photoUrl.trim();
      }
    }
    if (username != null) {
      if (username.trim().isEmpty) {
        usernames.remove(uid);
      } else {
        usernames[uid] = username.trim();
      }
    }
    chats[chatId] = chat.copyWith(
      memberPhotos: photos,
      memberUsernames: usernames,
    );
    _bumpChats();
  }

  @override
  Future<void> patchOwnPinned({
    required String chatId,
    required String uid,
    required bool pinned,
  }) async {
    final chat = chats[chatId];
    if (chat == null) return;
    final next = Map<String, bool>.from(chat.pinnedBy)..[uid] = pinned;
    chats[chatId] = chat.copyWith(pinnedBy: next);
    _bumpChats();
  }

  @override
  Future<ChatMessage> addMessage(ChatMessage message) async {
    final id = message.id.isEmpty
        ? 'm-${(messages[message.chatId]?.length ?? 0) + 1}'
        : message.id;
    final saved = ChatMessage(
      id: id,
      chatId: message.chatId,
      body: message.body,
      senderId: message.senderId,
      senderName: message.senderName,
      senderPhotoUrl: message.senderPhotoUrl,
      createdAt: message.createdAt,
      sharedPost: message.sharedPost,
      reactions: message.reactions,
      replyTo: message.replyTo,
    );
    final list = messages.putIfAbsent(message.chatId, () => []);
    list.add(saved);
    _messagesBump(message.chatId).add(null);

    // Mirror syncChatMetadataOnMessage (Admin SDK in production).
    final chat = chats[message.chatId];
    if (chat != null) {
      final preview = message.sharedPost != null
          ? 'Pregunta: ${message.sharedPost!.title}'
          : message.body;
      final nextUnread = Map<String, int>.from(chat.unreadCounts);
      for (final memberId in chat.memberIds) {
        nextUnread[memberId] =
            memberId == message.senderId ? 0 : (nextUnread[memberId] ?? 0) + 1;
      }
      chats[message.chatId] = chat.copyWith(
        lastMessage: preview,
        lastMessageAt: message.createdAt,
        lastMessageSenderId: message.senderId,
        unreadCounts: nextUnread,
      );
      _bumpChats();
    }

    return saved;
  }

  @override
  Future<void> setMessageReaction({
    required String chatId,
    required String messageId,
    required String uid,
    String? emoji,
  }) async {
    final list = messages[chatId];
    if (list == null) return;
    final index = list.indexWhere((m) => m.id == messageId);
    if (index < 0) return;
    final current = Map<String, String>.from(list[index].reactions);
    final trimmed = emoji?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      current.remove(uid);
    } else {
      current[uid] = trimmed;
    }
    list[index] = list[index].copyWith(reactions: current);
    _messagesBump(chatId).add(null);
  }

  final Map<String, Map<String, int>> typing = {};
  final Map<String, StreamController<void>> _typingControllers = {};

  StreamController<void> _typingBump(String chatId) {
    return _typingControllers.putIfAbsent(
      chatId,
      () => StreamController<void>.broadcast(),
    );
  }

  @override
  Stream<Map<String, int>> watchTyping(String chatId) async* {
    Map<String, int> current() => Map<String, int>.from(typing[chatId] ?? {});
    yield current();
    yield* _typingBump(chatId).stream.map((_) => current());
  }

  @override
  Future<void> setTyping({
    required String chatId,
    required String uid,
    required bool typing,
  }) async {
    final row = this.typing.putIfAbsent(chatId, () => {});
    if (typing) {
      row[uid] = DateTime.now().toUtc().millisecondsSinceEpoch;
    } else {
      row.remove(uid);
    }
    _typingBump(chatId).add(null);
  }
}
