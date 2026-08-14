import 'notification_models.dart';

/// In-app destination resolved from a notification payload.
enum NotificationTargetKind { forum, chat, academy, member, inbox }

class NotificationTarget {
  const NotificationTarget(this.kind, [this.id]);

  final NotificationTargetKind kind;
  final String? id;

  bool get canNavigate =>
      kind != NotificationTargetKind.inbox && (id?.isNotEmpty ?? false);
}

/// Resolves where a notification should open, matching web `destinationFor`.
///
/// Preference: stored [AppNotification.href] / [AppNotification.deepLink], then
/// [AppNotification.ref] keys (`chatId`, `threadId`, `courseId`).
NotificationTarget notificationTargetFor(AppNotification item) {
  final fromLink = _parseLink(item.deepLink) ?? _parseLink(item.href);
  if (fromLink != null) return fromLink;

  final ref = item.ref;
  final chatId = ref['chatId']?.trim();
  if (chatId != null && chatId.isNotEmpty) {
    return NotificationTarget(NotificationTargetKind.chat, chatId);
  }
  final threadId = ref['threadId']?.trim();
  if (threadId != null && threadId.isNotEmpty) {
    return NotificationTarget(NotificationTargetKind.forum, threadId);
  }
  final courseId = ref['courseId']?.trim();
  if (courseId != null && courseId.isNotEmpty) {
    return NotificationTarget(NotificationTargetKind.academy, courseId);
  }
  final memberId = ref['uid']?.trim();
  if (memberId != null && memberId.isNotEmpty) {
    return NotificationTarget(NotificationTargetKind.member, memberId);
  }
  return const NotificationTarget(NotificationTargetKind.inbox);
}

NotificationTarget? _parseLink(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return null;

  final uri = Uri.tryParse(value);
  if (uri == null) return null;

  if (uri.scheme == 'pulse') {
    return _fromSegments(uri.host, uri.pathSegments);
  }

  // Web hrefs: /chats/:id, /home/:id, /academy/:id, /notifications
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty) return null;
  return _fromSegments(segments.first, segments.skip(1).toList());
}

NotificationTarget? _fromSegments(String? head, List<String> rest) {
  final kind = (head ?? '').toLowerCase();
  final id = rest.isNotEmpty ? rest.first.trim() : '';

  switch (kind) {
    case 'chats':
    case 'chat':
      if (id.isEmpty) return const NotificationTarget(NotificationTargetKind.inbox);
      return NotificationTarget(NotificationTargetKind.chat, id);
    case 'forums':
    case 'forum':
    case 'home':
      if (id.isEmpty) return const NotificationTarget(NotificationTargetKind.inbox);
      return NotificationTarget(NotificationTargetKind.forum, id);
    case 'academy':
    case 'course':
    case 'courses':
      if (id.isEmpty) return const NotificationTarget(NotificationTargetKind.inbox);
      return NotificationTarget(NotificationTargetKind.academy, id);
    case 'members':
    case 'member':
      if (id.isEmpty) {
        return const NotificationTarget(NotificationTargetKind.inbox);
      }
      return NotificationTarget(NotificationTargetKind.member, id);
    case 'notifications':
    case 'notification':
      return const NotificationTarget(NotificationTargetKind.inbox);
    default:
      return null;
  }
}
