import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/notifications/notification_models.dart';
import 'package:every_benefits/features/notifications/notification_target.dart';

AppNotification _item({
  String href = '',
  String deepLink = '',
  Map<String, String> ref = const {},
}) {
  return AppNotification(
    id: 'n1',
    type: 'forum_reply',
    title: 't',
    body: 'b',
    href: href,
    deepLink: deepLink,
    ref: ref,
    read: false,
    createdAt: DateTime.utc(2026, 7, 26),
  );
}

void main() {
  test('parses pulse deep links', () {
    expect(
      notificationTargetFor(
        _item(deepLink: 'pulse://forums/thread-1'),
      ).id,
      'thread-1',
    );
    expect(
      notificationTargetFor(
        _item(deepLink: 'pulse://chats/chat-9'),
      ).kind,
      NotificationTargetKind.chat,
    );
    expect(
      notificationTargetFor(
        _item(deepLink: 'pulse://academy/course-3'),
      ).kind,
      NotificationTargetKind.academy,
    );
    expect(
      notificationTargetFor(
        _item(deepLink: 'pulse://notifications'),
      ).kind,
      NotificationTargetKind.inbox,
    );
  });

  test('parses web hrefs', () {
    final forum = notificationTargetFor(_item(href: '/home/abc'));
    expect(forum.kind, NotificationTargetKind.forum);
    expect(forum.id, 'abc');

    final chat = notificationTargetFor(_item(href: '/chats/chat_u1'));
    expect(chat.kind, NotificationTargetKind.chat);
    expect(chat.id, 'chat_u1');

    final course = notificationTargetFor(_item(href: '/academy/c1'));
    expect(course.kind, NotificationTargetKind.academy);
    expect(course.id, 'c1');
  });

  test('inbox preview links stay put even when ref has ids', () {
    // Seed previews intentionally keep inbox links; prefer staying put.
    final seed = notificationTargetFor(
      _item(
        href: '/notifications',
        deepLink: 'pulse://notifications',
        ref: {'threadId': 'should-not-win'},
      ),
    );
    expect(seed.kind, NotificationTargetKind.inbox);
    expect(seed.canNavigate, isFalse);
  });

  test('uses ref when href and deepLink are empty', () {
    final fromRef = notificationTargetFor(
      _item(ref: {'chatId': 'dm_1'}),
    );
    expect(fromRef.kind, NotificationTargetKind.chat);
    expect(fromRef.id, 'dm_1');
  });

  test('deepLink wins over href', () {
    final target = notificationTargetFor(
      _item(
        deepLink: 'pulse://chats/from-deep',
        href: '/home/from-href',
      ),
    );
    expect(target.kind, NotificationTargetKind.chat);
    expect(target.id, 'from-deep');
  });
}
