import 'package:cloud_firestore/cloud_firestore.dart';

import '../../l10n/app_localizations.dart';
import '../../users/user_role.dart';

/// Compact post reference shared into a private chat.
class SharedPostPreview {
  const SharedPostPreview({
    required this.threadId,
    required this.title,
    this.excerpt = '',
    this.authorName,
    this.tags = const [],
  });

  final String threadId;
  final String title;
  final String excerpt;
  final String? authorName;
  final List<String> tags;

  Map<String, Object?> toMap() {
    return {
      'threadId': threadId,
      'title': title,
      'excerpt': excerpt,
      'authorName': authorName,
      'tags': tags,
    };
  }

  factory SharedPostPreview.fromMap(Map<String, dynamic> data) {
    return SharedPostPreview(
      threadId: data['threadId'] as String? ?? '',
      title: data['title'] as String? ?? '',
      excerpt: data['excerpt'] as String? ?? '',
      authorName: data['authorName'] as String?,
      tags: (data['tags'] as List<dynamic>?)
              ?.map((e) => '$e')
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
    );
  }
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.memberIds,
    required this.memberNames,
    required this.isGroup,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.createdAt,
    required this.createdBy,
    this.title,
    this.dmKey,
    this.lastMessageSenderId,
    this.unreadCounts = const {},
    this.pinnedBy = const {},
  });

  final String id;
  final List<String> memberIds;
  final Map<String, String> memberNames;
  final bool isGroup;
  final String? title;
  final String? dmKey;
  final String lastMessage;
  final DateTime lastMessageAt;
  final String? lastMessageSenderId;
  final Map<String, int> unreadCounts;
  final Map<String, bool> pinnedBy;
  final DateTime createdAt;
  final String createdBy;

  int unreadFor(String uid) => unreadCounts[uid] ?? 0;

  bool isPinnedFor(String uid) => pinnedBy[uid] == true;

  String titleFor(String viewerUid) {
    if (isGroup && title != null && title!.trim().isNotEmpty) {
      return title!.trim();
    }
    final other = memberIds.where((id) => id != viewerUid).toList();
    if (other.isEmpty) {
      return title?.trim().isNotEmpty == true ? title! : 'Chat';
    }
    return memberNames[other.first] ?? 'Chat';
  }

  String initialsFor(String viewerUid) {
    return chatInitials(titleFor(viewerUid));
  }

  ChatConversation copyWith({
    String? lastMessage,
    DateTime? lastMessageAt,
    String? lastMessageSenderId,
    Map<String, int>? unreadCounts,
    Map<String, bool>? pinnedBy,
    Map<String, String>? memberNames,
  }) {
    return ChatConversation(
      id: id,
      memberIds: memberIds,
      memberNames: memberNames ?? this.memberNames,
      isGroup: isGroup,
      title: title,
      dmKey: dmKey,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
      unreadCounts: unreadCounts ?? this.unreadCounts,
      pinnedBy: pinnedBy ?? this.pinnedBy,
      createdAt: createdAt,
      createdBy: createdBy,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'memberIds': memberIds,
      'memberNames': memberNames,
      'isGroup': isGroup,
      'title': title,
      'dmKey': dmKey,
      'lastMessage': lastMessage,
      'lastMessageAt': Timestamp.fromDate(lastMessageAt.toUtc()),
      'lastMessageSenderId': lastMessageSenderId,
      'unreadCounts': unreadCounts,
      'pinnedBy': pinnedBy,
      'createdAt': Timestamp.fromDate(createdAt.toUtc()),
      'createdBy': createdBy,
    };
  }

  factory ChatConversation.fromMap(String id, Map<String, dynamic> data) {
    final namesRaw = data['memberNames'];
    final names = <String, String>{};
    if (namesRaw is Map) {
      for (final entry in namesRaw.entries) {
        names['${entry.key}'] = '${entry.value}';
      }
    }

    final unreadRaw = data['unreadCounts'];
    final unread = <String, int>{};
    if (unreadRaw is Map) {
      for (final entry in unreadRaw.entries) {
        final v = entry.value;
        unread['${entry.key}'] = v is int ? v : int.tryParse('$v') ?? 0;
      }
    }

    final pinnedRaw = data['pinnedBy'];
    final pinned = <String, bool>{};
    if (pinnedRaw is Map) {
      for (final entry in pinnedRaw.entries) {
        pinned['${entry.key}'] = entry.value == true;
      }
    }

    return ChatConversation(
      id: id,
      memberIds: (data['memberIds'] as List<dynamic>?)
              ?.map((e) => '$e')
              .toList() ??
          const [],
      memberNames: names,
      isGroup: data['isGroup'] as bool? ?? false,
      title: data['title'] as String?,
      dmKey: data['dmKey'] as String?,
      lastMessage: data['lastMessage'] as String? ?? '',
      lastMessageAt: _readDate(data['lastMessageAt']) ?? DateTime.now().toUtc(),
      lastMessageSenderId: data['lastMessageSenderId'] as String?,
      unreadCounts: unread,
      pinnedBy: pinned,
      createdAt: _readDate(data['createdAt']) ?? DateTime.now().toUtc(),
      createdBy: data['createdBy'] as String? ?? '',
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.chatId,
    required this.body,
    required this.senderId,
    required this.senderName,
    required this.createdAt,
    this.sharedPost,
  });

  final String id;
  final String chatId;
  final String body;
  final String senderId;
  final String senderName;
  final DateTime createdAt;
  final SharedPostPreview? sharedPost;

  bool isMine(String uid) => senderId == uid;

  Map<String, Object?> toMap() {
    return {
      'chatId': chatId,
      'body': body,
      'senderId': senderId,
      'senderName': senderName,
      'createdAt': Timestamp.fromDate(createdAt.toUtc()),
      if (sharedPost != null) 'sharedPost': sharedPost!.toMap(),
    };
  }

  factory ChatMessage.fromMap(String id, Map<String, dynamic> data) {
    final sharedRaw = data['sharedPost'];
    return ChatMessage(
      id: id,
      chatId: data['chatId'] as String? ?? '',
      body: data['body'] as String? ?? '',
      senderId: data['senderId'] as String? ?? '',
      senderName: data['senderName'] as String? ?? '',
      createdAt: _readDate(data['createdAt']) ?? DateTime.now().toUtc(),
      sharedPost: sharedRaw is Map<String, dynamic>
          ? SharedPostPreview.fromMap(sharedRaw)
          : sharedRaw is Map
              ? SharedPostPreview.fromMap(Map<String, dynamic>.from(sharedRaw))
              : null,
    );
  }
}

String dmKeyFor(String a, String b) {
  final parts = [a, b]..sort();
  return '${parts[0]}_${parts[1]}';
}

String chatInitials(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) {
    final s = parts.first;
    return s.substring(0, s.length >= 2 ? 2 : 1).toUpperCase();
  }
  return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
}

String formatChatTime(
  DateTime at,
  AppLocalizations l10n, {
  DateTime? now,
}) {
  final local = at.toLocal();
  final n = (now ?? DateTime.now()).toLocal();
  final today = DateTime(n.year, n.month, n.day);
  final day = DateTime(local.year, local.month, local.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) {
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
  if (diff == 1) return l10n.chatTimeYesterday;
  final weekdays = [
    l10n.weekdayMon,
    l10n.weekdayTue,
    l10n.weekdayWed,
    l10n.weekdayThu,
    l10n.weekdayFri,
    l10n.weekdaySat,
    l10n.weekdaySun,
  ];
  if (diff < 7) return weekdays[local.weekday - 1];
  return '${local.day}/${local.month}';
}

DateTime? _readDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value.toUtc();
  if (value is String) return DateTime.tryParse(value)?.toUtc();
  if (value is Timestamp) return value.toDate().toUtc();
  return null;
}

bool canParticipateInChats({
  required UserRole role,
  required bool isAnonymous,
}) {
  if (isAnonymous || role == UserRole.guest) return false;
  return role == UserRole.student ||
      role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.admin;
}

String friendlyChatError(Object error, AppLocalizations l10n) {
  final raw = '$error';
  if (raw.contains('permission') || raw.contains('PERMISSION')) {
    return l10n.errNoPermission;
  }

  final cleaned = raw
      .replaceFirst(RegExp(r'^.*?Exception:\s*'), '')
      .replaceFirst(RegExp(r'^Bad state:\s*'), '')
      .replaceFirst(RegExp(r'^Invalid argument\(s\):\s*'), '')
      .replaceFirst('StateError: ', '')
      .replaceFirst('ArgumentError: ', '')
      .trim();

  final known = <String, String Function(AppLocalizations)>{
    'No puedes chatear contigo mismo.': (l) => l.errChatCantChatSelf,
    "You can't chat with yourself.": (l) => l.errChatCantChatSelf,
    'Escribe un mensaje.': (l) => l.errChatEmptyMessage,
    'Write a message.': (l) => l.errChatEmptyMessage,
    'La pregunta a compartir no es válida.': (l) => l.errChatInvalidShare,
    "The question to share isn't valid.": (l) => l.errChatInvalidShare,
    'No eres miembro de este chat.': (l) => l.errChatNotMember,
    "You're not a member of this chat.": (l) => l.errChatNotMember,
    'Este chat ya no existe.': (l) => l.errChatGone,
    'This chat no longer exists.': (l) => l.errChatGone,
    'Regístrate con una cuenta para usar los chats.': (l) => l.errChatRegister,
    'Sign up with an account to use chats.': (l) => l.errChatRegister,
  };

  final mapped = known[cleaned];
  if (mapped != null) return mapped(l10n);
  if (cleaned.isNotEmpty &&
      (cleaned.contains('No tienes') ||
          cleaned.contains('No puedes') ||
          cleaned.contains('Regístrate') ||
          cleaned.contains("You don't") ||
          cleaned.contains("You can't") ||
          cleaned.contains('Sign up'))) {
    return cleaned;
  }
  return l10n.errGenericRetry;
}

