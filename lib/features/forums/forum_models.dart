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
    required this.createdAt,
    required this.updatedAt,
    required this.lastReplyAt,
    this.authorPhotoUrl,
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
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime lastReplyAt;

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
      createdAt: _readForumDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readForumDate(data['updatedAt']) ?? DateTime.now().toUtc(),
      lastReplyAt: _readForumDate(data['lastReplyAt']) ??
          _readForumDate(data['createdAt']) ??
          DateTime.now().toUtc(),
    );
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
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, Object?> toMap() {
    return {
      'body': body,
      'authorId': authorId,
      'authorName': authorName,
      'authorPhotoUrl': authorPhotoUrl,
      'authorRole': authorRole.wireValue,
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
      createdAt: _readForumDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readForumDate(data['updatedAt']) ?? DateTime.now().toUtc(),
    );
  }
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
