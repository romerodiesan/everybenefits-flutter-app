import 'package:cloud_firestore/cloud_firestore.dart';

import '../../l10n/app_localizations.dart';
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
      role == UserRole.manager ||
      role == UserRole.admin;
}

/// Aggregate relevance for a discovery tag chip in the feed.
class ForumTagStat {
  const ForumTagStat({
    required this.tag,
    required this.questionCount,
    required this.totalScore,
    required this.latestActivity,
  });

  final String tag;
  final int questionCount;
  final int totalScore;
  final DateTime latestActivity;
}

/// Builds tag chips from threads that actually have questions.
///
/// Empty tags are omitted. Ordering follows [sort]:
/// - [ForumSort.relevant]: higher total score, then more questions
/// - [ForumSort.recent]: more recent activity, then more questions
List<ForumTagStat> rankForumTags(
  Iterable<ForumThread> threads, {
  ForumSort sort = ForumSort.relevant,
}) {
  final counts = <String, int>{};
  final scores = <String, int>{};
  final latest = <String, DateTime>{};

  for (final thread in threads) {
    for (final tag in thread.tags) {
      if (tag.isEmpty) continue;
      counts[tag] = (counts[tag] ?? 0) + 1;
      scores[tag] = (scores[tag] ?? 0) + thread.score;
      final prev = latest[tag];
      if (prev == null || thread.lastReplyAt.isAfter(prev)) {
        latest[tag] = thread.lastReplyAt;
      }
    }
  }

  final ranked = [
    for (final tag in counts.keys)
      ForumTagStat(
        tag: tag,
        questionCount: counts[tag]!,
        totalScore: scores[tag] ?? 0,
        latestActivity: latest[tag] ?? DateTime.fromMillisecondsSinceEpoch(0),
      ),
  ]..sort((a, b) {
      switch (sort) {
        case ForumSort.relevant:
          final byScore = b.totalScore.compareTo(a.totalScore);
          if (byScore != 0) return byScore;
          final byCount = b.questionCount.compareTo(a.questionCount);
          if (byCount != 0) return byCount;
          return a.tag.compareTo(b.tag);
        case ForumSort.recent:
          final byTime = b.latestActivity.compareTo(a.latestActivity);
          if (byTime != 0) return byTime;
          final byCount = b.questionCount.compareTo(a.questionCount);
          if (byCount != 0) return byCount;
          return a.tag.compareTo(b.tag);
      }
    });

  return ranked;
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

String friendlyForumError(Object error, AppLocalizations l10n) {
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
    'No tienes permiso para publicar en la comunidad.': (l) =>
        l.errForumNoPostPermission,
    "You don't have permission to post in the community.": (l) =>
        l.errForumNoPostPermission,
    'Título y contenido son obligatorios.': (l) => l.errForumTitleBodyRequired,
    'Title and body are required.': (l) => l.errForumTitleBodyRequired,
    'Agrega al menos un tag.': (l) => l.errForumNeedTag,
    'Add at least one tag.': (l) => l.errForumNeedTag,
    'No puedes editar esta pregunta.': (l) => l.errForumCantEditQuestion,
    "You can't edit this question.": (l) => l.errForumCantEditQuestion,
    'No tienes permiso para responder.': (l) => l.errForumNoReplyPermission,
    "You don't have permission to reply.": (l) => l.errForumNoReplyPermission,
    'La respuesta no puede estar vacía.': (l) => l.errForumEmptyReply,
    "The reply can't be empty.": (l) => l.errForumEmptyReply,
    'No puedes editar esta respuesta.': (l) => l.errForumCantEditReply,
    "You can't edit this reply.": (l) => l.errForumCantEditReply,
    'No puedes eliminar esta pregunta.': (l) => l.errForumCantDeleteQuestion,
    "You can't delete this question.": (l) => l.errForumCantDeleteQuestion,
    'No puedes eliminar esta respuesta.': (l) => l.errForumCantDeleteReply,
    "You can't delete this reply.": (l) => l.errForumCantDeleteReply,
    'Solo el autor de la pregunta puede aceptar respuestas.': (l) =>
        l.errForumOnlyAuthorAccept,
    'Only the question author can accept replies.': (l) =>
        l.errForumOnlyAuthorAccept,
    'La respuesta no pertenece a esta pregunta.': (l) =>
        l.errForumReplyNotOnThread,
    "The reply doesn't belong to this question.": (l) =>
        l.errForumReplyNotOnThread,
    'Regístrate para marcar relevancia.': (l) => l.errForumRegisterToVote,
    'Sign up to mark relevance.': (l) => l.errForumRegisterToVote,
    'No puedes votar tu propia pregunta.': (l) => l.errForumCantVoteOwnQuestion,
    "You can't vote on your own question.": (l) =>
        l.errForumCantVoteOwnQuestion,
    'No puedes votar tu propia respuesta.': (l) => l.errForumCantVoteOwnReply,
    "You can't vote on your own reply.": (l) => l.errForumCantVoteOwnReply,
  };

  final mapped = known[cleaned];
  if (mapped != null) return mapped(l10n);
  if (cleaned.isNotEmpty &&
      (cleaned.contains('No tienes') ||
          cleaned.contains('No puedes') ||
          cleaned.contains('Regístrate') ||
          cleaned.contains("You don't") ||
          cleaned.contains("You can't") ||
          cleaned.contains('Sign up') ||
          cleaned.contains('Add at least') ||
          cleaned.contains('required'))) {
    return cleaned;
  }
  return l10n.errGenericRetry;
}

