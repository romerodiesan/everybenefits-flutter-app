import 'package:cloud_firestore/cloud_firestore.dart';

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.href,
    required this.deepLink,
    required this.ref,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final String href;
  final String deepLink;
  final Map<String, String> ref;
  final bool read;
  final DateTime? createdAt;

  factory AppNotification.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? {};
    final refRaw = data['ref'];
    final ref = <String, String>{};
    if (refRaw is Map) {
      for (final e in refRaw.entries) {
        ref['${e.key}'] = '${e.value}';
      }
    }
    final created = data['createdAt'];
    return AppNotification(
      id: doc.id,
      type: '${data['type'] ?? ''}',
      title: '${data['title'] ?? ''}',
      body: '${data['body'] ?? ''}',
      href: '${data['href'] ?? ''}',
      deepLink: '${data['deepLink'] ?? ''}',
      ref: ref,
      read: data['read'] == true,
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }
}

class NotificationPrefs {
  const NotificationPrefs({
    this.pushChats = true,
    this.pushForums = true,
    this.pushAcademy = true,
    this.pushSupport = true,
  });

  final bool pushChats;
  final bool pushForums;
  final bool pushAcademy;
  final bool pushSupport;

  Map<String, bool> toMap() => {
        'pushChats': pushChats,
        'pushForums': pushForums,
        'pushAcademy': pushAcademy,
        'pushSupport': pushSupport,
      };

  factory NotificationPrefs.fromMap(Map<String, dynamic>? data) {
    return NotificationPrefs(
      pushChats: data?['pushChats'] != false,
      pushForums: data?['pushForums'] != false,
      pushAcademy: data?['pushAcademy'] != false,
      pushSupport: data?['pushSupport'] != false,
    );
  }
}

class NotificationState {
  const NotificationState({
    this.unreadCount = 0,
    this.unreadForumCount = 0,
    this.lastFeedSeenAt,
    this.prefs = const NotificationPrefs(),
  });

  final int unreadCount;
  final int unreadForumCount;
  final DateTime? lastFeedSeenAt;
  final NotificationPrefs prefs;

  factory NotificationState.fromMap(Map<String, dynamic>? data) {
    final last = data?['lastFeedSeenAt'];
    return NotificationState(
      unreadCount: (data?['unreadCount'] as num?)?.toInt() ?? 0,
      unreadForumCount: (data?['unreadForumCount'] as num?)?.toInt() ?? 0,
      lastFeedSeenAt: last is Timestamp ? last.toDate() : null,
      prefs: NotificationPrefs.fromMap(
        data?['prefs'] is Map
            ? Map<String, dynamic>.from(data!['prefs'] as Map)
            : null,
      ),
    );
  }
}
