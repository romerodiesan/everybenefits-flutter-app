import 'dart:async';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';

class FakeChatStore implements ChatStore {
  final Map<String, ChatConversation> chats = {};
  final Map<String, List<ChatMessage>> messages = {};
  final _chatsController = StreamController<void>.broadcast();
  final Map<String, StreamController<void>> _messageControllers = {};

  void dispose() {
    _chatsController.close();
    for (final c in _messageControllers.values) {
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
          .where((c) => c.memberIds.contains(uid))
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
    );
    chats[id] = saved;
    messages.putIfAbsent(id, () => []);
    _bumpChats();
    return saved;
  }

  @override
  Future<void> updateChat(ChatConversation chat) async {
    chats[chat.id] = chat;
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
      createdAt: message.createdAt,
      sharedPost: message.sharedPost,
    );
    final list = messages.putIfAbsent(message.chatId, () => []);
    list.add(saved);
    _messagesBump(message.chatId).add(null);
    return saved;
  }
}
