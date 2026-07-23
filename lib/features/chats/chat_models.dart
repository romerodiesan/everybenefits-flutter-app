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
    this.isDefaultAgentGroup = false,
    this.isSupportChat = false,
  });

  /// Fixed RTDB path id for the system agents community chat.
  static const defaultAgentGroupId = 'agents-default';

  /// Synthetic member that posts automated support replies.
  static const supportAiUid = 'support-ai';

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
  final bool isDefaultAgentGroup;
  final bool isSupportChat;

  int unreadFor(String uid) => unreadCounts[uid] ?? 0;

  bool isPinnedFor(String uid) => pinnedBy[uid] == true;

  String titleFor(String viewerUid, {AppLocalizations? l10n}) {
    if (isSupportChat) {
      return l10n?.chatsSupportTitle ?? title?.trim() ?? 'Support';
    }
    if (isDefaultAgentGroup) {
      return l10n?.chatsDefaultGroupTitle ?? title?.trim() ?? 'Team';
    }
    if (isGroup && title != null && title!.trim().isNotEmpty) {
      return title!.trim();
    }
    final other = memberIds.where((id) => id != viewerUid).toList();
    if (other.isEmpty) {
      return title?.trim().isNotEmpty == true ? title! : 'Chat';
    }
    return memberNames[other.first] ?? 'Chat';
  }

  String initialsFor(String viewerUid, {AppLocalizations? l10n}) {
    return chatInitials(titleFor(viewerUid, l10n: l10n));
  }

  ChatConversation copyWith({
    String? lastMessage,
    DateTime? lastMessageAt,
    String? lastMessageSenderId,
    Map<String, int>? unreadCounts,
    Map<String, bool>? pinnedBy,
    Map<String, String>? memberNames,
    String? title,
    bool? isDefaultAgentGroup,
    bool? isSupportChat,
  }) {
    return ChatConversation(
      id: id,
      memberIds: memberIds,
      memberNames: memberNames ?? this.memberNames,
      isGroup: isGroup,
      title: title ?? this.title,
      dmKey: dmKey,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
      unreadCounts: unreadCounts ?? this.unreadCounts,
      pinnedBy: pinnedBy ?? this.pinnedBy,
      createdAt: createdAt,
      createdBy: createdBy,
      isDefaultAgentGroup: isDefaultAgentGroup ?? this.isDefaultAgentGroup,
      isSupportChat: isSupportChat ?? this.isSupportChat,
    );
  }

  /// RTDB payload (members as map for security rules).
  Map<String, Object?> toRtdbMap() {
    return {
      'members': {for (final id in memberIds) id: true},
      'memberNames': memberNames,
      'isGroup': isGroup,
      'title': title,
      'dmKey': dmKey,
      'lastMessage': lastMessage,
      'lastMessageAt': lastMessageAt.toUtc().millisecondsSinceEpoch,
      'lastMessageSenderId': lastMessageSenderId,
      'unreadCounts': unreadCounts,
      'pinnedBy': {
        for (final e in pinnedBy.entries)
          if (e.value) e.key: true,
      },
      'createdAt': createdAt.toUtc().millisecondsSinceEpoch,
      'createdBy': createdBy,
      'isDefaultAgentGroup': isDefaultAgentGroup,
      'isSupportChat': isSupportChat,
    };
  }

  Map<String, Object?> toMap() {
    return {
      'memberIds': memberIds,
      'memberNames': memberNames,
      'isGroup': isGroup,
      'title': title,
      'dmKey': dmKey,
      'lastMessage': lastMessage,
      'lastMessageAt': lastMessageAt.toUtc().millisecondsSinceEpoch,
      'lastMessageSenderId': lastMessageSenderId,
      'unreadCounts': unreadCounts,
      'pinnedBy': pinnedBy,
      'createdAt': createdAt.toUtc().millisecondsSinceEpoch,
      'createdBy': createdBy,
      'isDefaultAgentGroup': isDefaultAgentGroup,
      'isSupportChat': isSupportChat,
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
        unread['${entry.key}'] = v is int
            ? v
            : (v is num ? v.toInt() : int.tryParse('$v') ?? 0);
      }
    }

    final pinnedRaw = data['pinnedBy'];
    final pinned = <String, bool>{};
    if (pinnedRaw is Map) {
      for (final entry in pinnedRaw.entries) {
        pinned['${entry.key}'] = entry.value == true;
      }
    }

    final membersRaw = data['members'];
    final List<String> memberIds;
    if (membersRaw is Map) {
      memberIds = membersRaw.keys.map((e) => '$e').toList()..sort();
    } else {
      memberIds = (data['memberIds'] as List<dynamic>?)
              ?.map((e) => '$e')
              .toList() ??
          const [];
    }

    return ChatConversation(
      id: id,
      memberIds: memberIds,
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
      isDefaultAgentGroup: data['isDefaultAgentGroup'] as bool? ??
          id == ChatConversation.defaultAgentGroupId,
      isSupportChat: data['isSupportChat'] as bool? ??
          id.startsWith('support_'),
    );
  }
}

/// Inbox buckets: support, community, pins, then recent.
class ChatInboxSections {
  const ChatInboxSections({
    required this.support,
    required this.community,
    required this.pinned,
    required this.recent,
  });

  final List<ChatConversation> support;
  final List<ChatConversation> community;
  final List<ChatConversation> pinned;
  final List<ChatConversation> recent;
}

ChatInboxSections partitionChatInbox(
  List<ChatConversation> chats,
  String viewerUid,
) {
  final support = <ChatConversation>[];
  final community = <ChatConversation>[];
  final pinned = <ChatConversation>[];
  final recent = <ChatConversation>[];
  for (final chat in chats) {
    if (chat.isSupportChat) {
      support.add(chat);
    } else if (chat.isDefaultAgentGroup) {
      community.add(chat);
    } else if (chat.isPinnedFor(viewerUid)) {
      pinned.add(chat);
    } else {
      recent.add(chat);
    }
  }
  return ChatInboxSections(
    support: support,
    community: community,
    pinned: pinned,
    recent: recent,
  );
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
    this.isAi = false,
    this.reactions = const {},
  });

  /// Quick-reaction strip shown on long-press.
  static const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  final String id;
  final String chatId;
  final String body;
  final String senderId;
  final String senderName;
  final DateTime createdAt;
  final SharedPostPreview? sharedPost;
  final bool isAi;

  /// uid → emoji (one reaction per user).
  final Map<String, String> reactions;

  bool isMine(String uid) => senderId == uid && !isAi;

  /// Aggregated emoji → count for chips.
  Map<String, int> reactionCounts() {
    final counts = <String, int>{};
    for (final emoji in reactions.values) {
      counts[emoji] = (counts[emoji] ?? 0) + 1;
    }
    return counts;
  }

  Map<String, Object?> toMap() {
    return {
      'chatId': chatId,
      'body': body,
      'senderId': senderId,
      'senderName': senderName,
      'createdAt': createdAt.toUtc().millisecondsSinceEpoch,
      if (sharedPost != null) 'sharedPost': sharedPost!.toMap(),
      if (isAi) 'isAi': true,
      if (reactions.isNotEmpty) 'reactions': reactions,
    };
  }

  factory ChatMessage.fromMap(String id, Map<String, dynamic> data) {
    final sharedRaw = data['sharedPost'];
    final reactionsRaw = data['reactions'];
    final reactions = <String, String>{};
    if (reactionsRaw is Map) {
      for (final entry in reactionsRaw.entries) {
        final value = '${entry.value}'.trim();
        if (value.isNotEmpty) reactions['${entry.key}'] = value;
      }
    }
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
      isAi: data['isAi'] == true ||
          data['senderId'] == ChatConversation.supportAiUid,
      reactions: reactions,
    );
  }

  ChatMessage copyWith({Map<String, String>? reactions}) {
    return ChatMessage(
      id: id,
      chatId: chatId,
      body: body,
      senderId: senderId,
      senderName: senderName,
      createdAt: createdAt,
      sharedPost: sharedPost,
      isAi: isAi,
      reactions: reactions ?? this.reactions,
    );
  }
}

String dmKeyFor(String a, String b) {
  final parts = [a, b]..sort();
  return '${parts[0]}_${parts[1]}';
}

String supportChatIdFor(String uid) => 'support_$uid';

/// Members that get an inbox row under `userChats/{uid}`.
/// Synthetic bots (support AI) never own an inbox.
List<String> userChatIndexMemberIds(Iterable<String> memberIds) {
  return [
    for (final id in memberIds)
      if (id != ChatConversation.supportAiUid) id,
  ];
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
  if (value is int) {
    return DateTime.fromMillisecondsSinceEpoch(value, isUtc: true);
  }
  if (value is num) {
    return DateTime.fromMillisecondsSinceEpoch(value.toInt(), isUtc: true);
  }
  if (value is String) return DateTime.tryParse(value)?.toUtc();
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
      role == UserRole.manager ||
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
    'Only admins, instructors, and managers can create groups.': (l) =>
        l.errChatCannotCreateGroup,
    'Solo admins, instructores y managers pueden crear grupos.': (l) =>
        l.errChatCannotCreateGroup,
    'Enter a group name.': (l) => l.newGroupNeedTitle,
    'Pick at least one other member.': (l) => l.newGroupNeedMembers,
    'Groups can have at most 20 members.': (l) => l.newGroupTooMany,
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

