import '../../l10n/app_localizations.dart';
import '../../users/profile_validation.dart';

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

Map<String, String> _chatStringMap(Object? raw) {
  final out = <String, String>{};
  if (raw is Map) {
    for (final entry in raw.entries) {
      final value = '${entry.value}'.trim();
      if (value.isNotEmpty) out['${entry.key}'] = value;
    }
  }
  return out;
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.memberIds,
    required this.memberNames,
    this.memberPhotos = const {},
    this.memberUsernames = const {},
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
    this.dmMessagingEnabled = false,
  });

  /// Fixed RTDB path id for the system agents community chat.
  static const defaultAgentGroupId = 'agents-default';

  final String id;
  final List<String> memberIds;
  final Map<String, String> memberNames;
  final Map<String, String> memberPhotos;
  final Map<String, String> memberUsernames;
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
  final bool dmMessagingEnabled;

  bool get canSendMessages => isGroup || dmMessagingEnabled;

  int unreadFor(String uid) => unreadCounts[uid] ?? 0;

  bool isPinnedFor(String uid) => pinnedBy[uid] == true;

  String titleFor(String viewerUid, {AppLocalizations? l10n}) {
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

  String? photoOf(String uid) {
    final url = memberPhotos[uid]?.trim();
    return (url != null && url.isNotEmpty) ? url : null;
  }

  String? peerId(String viewerUid) {
    for (final id in memberIds) {
      if (id != viewerUid) return id;
    }
    return null;
  }

  String? inboxPhotoUrl(String viewerUid) {
    if (isGroup) return null;
    final other = peerId(viewerUid);
    return other == null ? null : photoOf(other);
  }

  String? uidForUsername(String handle) {
    final parsed = parseUsername(handle);
    if (!parsed.ok) return null;
    for (final entry in memberUsernames.entries) {
      final reserved = parseUsername(entry.value);
      if (reserved.ok && reserved.value == parsed.value) return entry.key;
    }
    return null;
  }

  List<MentionCandidate> mentionCandidates(String viewerUid) {
    final out = <MentionCandidate>[];
    for (final id in memberIds) {
      if (id == viewerUid) continue;
      final parsed = parseUsername(memberUsernames[id] ?? '');
      if (!parsed.ok) continue;
      out.add(
        MentionCandidate(
          uid: id,
          username: parsed.value,
          name: memberNames[id] ?? id,
          photoUrl: photoOf(id),
        ),
      );
    }
    return out;
  }

  ChatConversation copyWith({
    String? lastMessage,
    DateTime? lastMessageAt,
    String? lastMessageSenderId,
    Map<String, int>? unreadCounts,
    Map<String, bool>? pinnedBy,
    Map<String, String>? memberNames,
    Map<String, String>? memberPhotos,
    Map<String, String>? memberUsernames,
    String? title,
    bool? isDefaultAgentGroup,
    bool? dmMessagingEnabled,
  }) {
    return ChatConversation(
      id: id,
      memberIds: memberIds,
      memberNames: memberNames ?? this.memberNames,
      memberPhotos: memberPhotos ?? this.memberPhotos,
      memberUsernames: memberUsernames ?? this.memberUsernames,
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
      dmMessagingEnabled: dmMessagingEnabled ?? this.dmMessagingEnabled,
    );
  }

  /// RTDB payload (members as map for security rules).
  Map<String, Object?> toRtdbMap() {
    return {
      'members': {for (final id in memberIds) id: true},
      'memberCount': memberIds.length,
      'memberNames': memberNames,
      'memberPhotos': memberPhotos,
      'memberUsernames': memberUsernames,
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
      'dmMessagingEnabled': dmMessagingEnabled,
    };
  }

  Map<String, Object?> toMap() {
    return {
      'memberIds': memberIds,
      'memberNames': memberNames,
      'memberPhotos': memberPhotos,
      'memberUsernames': memberUsernames,
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
      'dmMessagingEnabled': dmMessagingEnabled,
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
      memberPhotos: _chatStringMap(data['memberPhotos']),
      memberUsernames: _chatStringMap(data['memberUsernames']),
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
      dmMessagingEnabled: data['isGroup'] == true ||
          data['dmMessagingEnabled'] == true,
    );
  }
}

/// Inbox buckets: community, pins, then recent.
class ChatInboxSections {
  const ChatInboxSections({
    required this.community,
    required this.pinned,
    required this.recent,
  });

  final List<ChatConversation> community;
  final List<ChatConversation> pinned;
  final List<ChatConversation> recent;
}

ChatInboxSections partitionChatInbox(
  List<ChatConversation> chats,
  String viewerUid,
) {
  final community = <ChatConversation>[];
  final pinned = <ChatConversation>[];
  final recent = <ChatConversation>[];
  for (final chat in chats) {
    if (chat.isDefaultAgentGroup) {
      community.add(chat);
    } else if (chat.isPinnedFor(viewerUid)) {
      pinned.add(chat);
    } else {
      recent.add(chat);
    }
  }
  return ChatInboxSections(
    community: community,
    pinned: pinned,
    recent: recent,
  );
}

class ChatReplyTo {
  const ChatReplyTo({
    required this.messageId,
    required this.senderName,
    required this.bodyPreview,
  });

  final String messageId;
  final String senderName;
  final String bodyPreview;

  static const maxPreviewLength = 140;

  static String previewOf(ChatMessage message) {
    final title = message.sharedPost?.title.trim();
    final source =
        (title != null && title.isNotEmpty) ? title : message.body.trim();
    if (source.length <= maxPreviewLength) return source;
    return '${source.substring(0, maxPreviewLength)}…';
  }

  Map<String, Object?> toMap() {
    return {
      'messageId': messageId,
      'senderName': senderName,
      'bodyPreview': bodyPreview,
    };
  }

  factory ChatReplyTo.fromMap(Map<String, dynamic> data) {
    return ChatReplyTo(
      messageId: data['messageId'] as String? ?? '',
      senderName: data['senderName'] as String? ?? '',
      bodyPreview: data['bodyPreview'] as String? ?? '',
    );
  }
}

enum ChatInboxFilter { all, unread, groups }

bool chatMatchesInboxFilter(
  ChatConversation chat,
  ChatInboxFilter filter,
  String viewerUid,
) {
  switch (filter) {
    case ChatInboxFilter.all:
      return true;
    case ChatInboxFilter.unread:
      return chat.unreadFor(viewerUid) > 0;
    case ChatInboxFilter.groups:
      return chat.isGroup;
  }
}

bool chatMatchesInboxQuery(
  ChatConversation chat,
  String query,
  String viewerUid, {
  String? title,
}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return true;
  final resolved = (title ?? chat.titleFor(viewerUid)).toLowerCase();
  return resolved.contains(q) || chat.lastMessage.toLowerCase().contains(q);
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.chatId,
    required this.body,
    required this.senderId,
    required this.senderName,
    this.senderPhotoUrl,
    required this.createdAt,
    this.sharedPost,
    this.reactions = const {},
    this.replyTo,
  });

  /// Quick-reaction strip shown on long-press.
  static const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  final String id;
  final String chatId;
  final String body;
  final String senderId;
  final String senderName;
  final String? senderPhotoUrl;
  final DateTime createdAt;
  final SharedPostPreview? sharedPost;

  /// uid → emoji (one reaction per user).
  final Map<String, String> reactions;
  final ChatReplyTo? replyTo;

  bool isMine(String uid) => senderId == uid;

  /// RTDB requires a non-empty body; share-only messages store a title preview.
  bool get isSyntheticShareBody {
    final post = sharedPost;
    if (post == null) return false;
    final trimmed = body.trim();
    if (trimmed.isEmpty) return true;
    final title = post.title.trim();
    return trimmed == 'Pregunta: $title' || trimmed == 'Question: $title';
  }

  bool get showsTextBubble =>
      body.trim().isNotEmpty && !isSyntheticShareBody;

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
      if (senderPhotoUrl != null && senderPhotoUrl!.trim().isNotEmpty)
        'senderPhotoUrl': senderPhotoUrl,
      'createdAt': createdAt.toUtc().millisecondsSinceEpoch,
      if (sharedPost != null) 'sharedPost': sharedPost!.toMap(),
      if (reactions.isNotEmpty) 'reactions': reactions,
      if (replyTo != null) 'replyTo': replyTo!.toMap(),
    };
  }

  factory ChatMessage.fromMap(String id, Map<String, dynamic> data) {
    final sharedRaw = data['sharedPost'];
    final replyRaw = data['replyTo'];
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
      senderPhotoUrl: data['senderPhotoUrl'] as String?,
      createdAt: _readDate(data['createdAt']) ?? DateTime.now().toUtc(),
      sharedPost: sharedRaw is Map<String, dynamic>
          ? SharedPostPreview.fromMap(sharedRaw)
          : sharedRaw is Map
              ? SharedPostPreview.fromMap(Map<String, dynamic>.from(sharedRaw))
              : null,
      reactions: reactions,
      replyTo: replyRaw is Map<String, dynamic>
          ? ChatReplyTo.fromMap(replyRaw)
          : replyRaw is Map
              ? ChatReplyTo.fromMap(Map<String, dynamic>.from(replyRaw))
              : null,
    );
  }

  ChatMessage copyWith({
    Map<String, String>? reactions,
    ChatReplyTo? replyTo,
  }) {
    return ChatMessage(
      id: id,
      chatId: chatId,
      body: body,
      senderId: senderId,
      senderName: senderName,
      senderPhotoUrl: senderPhotoUrl,
      createdAt: createdAt,
      sharedPost: sharedPost,
      reactions: reactions ?? this.reactions,
      replyTo: replyTo ?? this.replyTo,
    );
  }
}

String dmKeyFor(String a, String b) {
  final parts = [a, b]..sort();
  return '${parts[0]}_${parts[1]}';
}

/// Members that get an inbox row under `userChats/{uid}`.
List<String> userChatIndexMemberIds(Iterable<String> memberIds) {
  return [for (final id in memberIds) id];
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

String formatChatDayLabel(
  DateTime at,
  AppLocalizations l10n, {
  DateTime? now,
}) {
  final local = at.toLocal();
  final n = (now ?? DateTime.now()).toLocal();
  final today = DateTime(n.year, n.month, n.day);
  final day = DateTime(local.year, local.month, local.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return l10n.chatTimeToday;
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
    'not-contacts': (l) => l.chatsNeedContacts,
    'direct-messages-disabled': (l) => l.chatsNeedContacts,
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
