import 'package:cloud_firestore/cloud_firestore.dart';

import '../../users/user_role.dart';
import 'forum_tags.dart';

DateTime? _readForumDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value.toUtc();
  if (value is String) return DateTime.tryParse(value)?.toUtc();
  if (value is Timestamp) return value.toDate().toUtc();
  return null;
}

List<String> _readTags(Map<String, dynamic> data) {
  final raw = data['tags'];
  if (raw is List) {
    return normalizeForumTags(raw.map((e) => e.toString()));
  }
  // Back-compat with older category-based threads.
  final legacy = data['categoryId'] as String?;
  if (legacy != null && legacy.trim().isNotEmpty) {
    return normalizeForumTags([legacy]);
  }
  return const [];
}

/// Stack Overflow–style relevance: +1 (útil), −1 (poco útil), 0 (sin voto).
enum RelevanceVote {
  up(1),
  down(-1),
  none(0);

  const RelevanceVote(this.value);
  final int value;

  static RelevanceVote fromValue(int? raw) {
    switch (raw) {
      case 1:
        return RelevanceVote.up;
      case -1:
        return RelevanceVote.down;
      default:
        return RelevanceVote.none;
    }
  }
}

enum ForumSort { recent, relevant }

class ForumThread {
  const ForumThread({
    required this.id,
    required this.tags,
    required this.title,
    required this.body,
    required this.authorId,
    required this.authorName,
    required this.authorRole,
    required this.replyCount,
    required this.score,
    required this.createdAt,
    required this.updatedAt,
    required this.lastReplyAt,
    this.authorPhotoUrl,
    this.acceptedReplyId,
  });

  final String id;
  final List<String> tags;
  final String title;
  final String body;
  final String authorId;
  final String authorName;
  final String? authorPhotoUrl;
  final UserRole authorRole;
  final int replyCount;
  /// Net relevance (upvotes − downvotes), Stack Overflow–style.
  final int score;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime lastReplyAt;
  final String? acceptedReplyId;

  ForumThread copyWith({
    List<String>? tags,
    String? title,
    String? body,
    int? replyCount,
    int? score,
    DateTime? updatedAt,
    DateTime? lastReplyAt,
    String? authorPhotoUrl,
    String? acceptedReplyId,
    bool clearAcceptedReplyId = false,
  }) {
    return ForumThread(
      id: id,
      tags: tags ?? this.tags,
      title: title ?? this.title,
      body: body ?? this.body,
      authorId: authorId,
      authorName: authorName,
      authorPhotoUrl: authorPhotoUrl ?? this.authorPhotoUrl,
      authorRole: authorRole,
      replyCount: replyCount ?? this.replyCount,
      score: score ?? this.score,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastReplyAt: lastReplyAt ?? this.lastReplyAt,
      acceptedReplyId: clearAcceptedReplyId
          ? null
          : (acceptedReplyId ?? this.acceptedReplyId),
    );
  }

  Map<String, Object?> toMap() {
    return {
      'tags': tags,
      'title': title,
      'body': body,
      'authorId': authorId,
      'authorName': authorName,
      'authorPhotoUrl': authorPhotoUrl,
      'authorRole': authorRole.wireValue,
      'replyCount': replyCount,
      'score': score,
      'acceptedReplyId': acceptedReplyId,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'updatedAt': updatedAt.toUtc().toIso8601String(),
      'lastReplyAt': lastReplyAt.toUtc().toIso8601String(),
    };
  }

  factory ForumThread.fromMap(String id, Map<String, dynamic> data) {
    return ForumThread(
      id: id,
      tags: _readTags(data),
      title: data['title'] as String? ?? '',
      body: data['body'] as String? ?? '',
      authorId: data['authorId'] as String? ?? '',
      authorName: data['authorName'] as String? ?? 'Usuario',
      authorPhotoUrl: data['authorPhotoUrl'] as String?,
      authorRole: UserRole.parse(data['authorRole'] as String?),
      replyCount: (data['replyCount'] as num?)?.toInt() ?? 0,
      score: (data['score'] as num?)?.toInt() ?? 0,
      acceptedReplyId: data['acceptedReplyId'] as String?,
      createdAt: _readForumDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readForumDate(data['updatedAt']) ?? DateTime.now().toUtc(),
      lastReplyAt: _readForumDate(data['lastReplyAt']) ??
          _readForumDate(data['createdAt']) ??
          DateTime.now().toUtc(),
    );
  }

  bool matchesQuery(String rawQuery) {
    final q = rawQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    if (title.toLowerCase().contains(q)) return true;
    if (body.toLowerCase().contains(q)) return true;
    return tags.any((t) => t.toLowerCase().contains(q) || '#$t'.contains(q));
  }
}

class ForumReply {
  const ForumReply({
    required this.id,
    required this.threadId,
    required this.body,
    required this.authorId,
    required this.authorName,
    required this.authorRole,
    required this.score,
    required this.createdAt,
    required this.updatedAt,
    this.authorPhotoUrl,
  });

  final String id;
  final String threadId;
  final String body;
  final String authorId;
  final String authorName;
  final String? authorPhotoUrl;
  final UserRole authorRole;
  final int score;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool isAcceptedBy(ForumThread thread) => thread.acceptedReplyId == id;

  ForumReply copyWith({
    String? body,
    int? score,
    DateTime? updatedAt,
    String? authorPhotoUrl,
  }) {
    return ForumReply(
      id: id,
      threadId: threadId,
      body: body ?? this.body,
      authorId: authorId,
      authorName: authorName,
      authorPhotoUrl: authorPhotoUrl ?? this.authorPhotoUrl,
      authorRole: authorRole,
      score: score ?? this.score,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'body': body,
      'authorId': authorId,
      'authorName': authorName,
      'authorPhotoUrl': authorPhotoUrl,
      'authorRole': authorRole.wireValue,
      'score': score,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'updatedAt': updatedAt.toUtc().toIso8601String(),
    };
  }

  factory ForumReply.fromMap(
    String threadId,
    String id,
    Map<String, dynamic> data,
  ) {
    return ForumReply(
      id: id,
      threadId: threadId,
      body: data['body'] as String? ?? '',
      authorId: data['authorId'] as String? ?? '',
      authorName: data['authorName'] as String? ?? 'Usuario',
      authorPhotoUrl: data['authorPhotoUrl'] as String?,
      authorRole: UserRole.parse(data['authorRole'] as String?),
      score: (data['score'] as num?)?.toInt() ?? 0,
      createdAt: _readForumDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readForumDate(data['updatedAt']) ?? DateTime.now().toUtc(),
    );
  }
}

class ForumThreadPage {
  const ForumThreadPage({
    required this.threads,
    this.nextCursor,
  });

  final List<ForumThread> threads;
  final Object? nextCursor;

  bool get hasMore => nextCursor != null;
}

bool canParticipateInForums({
  required UserRole role,
  required bool isAnonymous,
}) {
  if (isAnonymous || role == UserRole.guest) return false;
  return role == UserRole.student ||
      role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.admin;
}

/// Client-side helpers for discovery over an already-loaded page.
List<ForumThread> filterAndSortThreads(
  List<ForumThread> threads, {
  String query = '',
  ForumSort sort = ForumSort.recent,
}) {
  var list = threads.where((t) => t.matchesQuery(query)).toList();
  switch (sort) {
    case ForumSort.recent:
      list.sort((a, b) => b.lastReplyAt.compareTo(a.lastReplyAt));
    case ForumSort.relevant:
      list.sort((a, b) {
        final byScore = b.score.compareTo(a.score);
        if (byScore != 0) return byScore;
        return b.lastReplyAt.compareTo(a.lastReplyAt);
      });
  }
  return list;
}

List<ForumReply> sortRepliesByRelevance(
  List<ForumReply> replies, {
  String? acceptedReplyId,
}) {
  final list = List<ForumReply>.from(replies);
  list.sort((a, b) {
    final aAccepted = acceptedReplyId != null && a.id == acceptedReplyId;
    final bAccepted = acceptedReplyId != null && b.id == acceptedReplyId;
    if (aAccepted != bAccepted) return aAccepted ? -1 : 1;
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) return byScore;
    return a.createdAt.compareTo(b.createdAt);
  });
  return list;
}

String friendlyForumError(Object error) {
  final raw = '$error';
  if (raw.contains('permission') || raw.contains('PERMISSION')) {
    return 'No tienes permiso para esta acción.';
  }
  if (raw.contains('StateError:')) {
    return raw.replaceFirst('Bad state: ', '').replaceFirst('StateError: ', '');
  }
  if (raw.contains('ArgumentError:')) {
    return raw.replaceFirst('Invalid argument(s): ', '').replaceFirst(
          'ArgumentError: ',
          '',
        );
  }
  if (raw.contains('No tienes') ||
      raw.contains('No puedes') ||
      raw.contains('Regístrate') ||
      raw.contains('Agrega') ||
      raw.contains('obligator')) {
    return raw
        .replaceFirst(RegExp(r'^.*?Exception:\s*'), '')
        .replaceFirst(RegExp(r'^Bad state:\s*'), '')
        .trim();
  }
  return 'Algo salió mal. Intenta de nuevo.';
}
