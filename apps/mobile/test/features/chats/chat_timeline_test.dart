import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_timeline.dart';

ChatMessage _msg({
  required String id,
  required String sender,
  required DateTime at,
  String body = 'hi',
}) {
  return ChatMessage(
    id: id,
    chatId: 'c1',
    body: body,
    senderId: sender,
    senderName: sender,
    createdAt: at,
  );
}

void main() {
  test('groups consecutive same-sender messages within two minutes', () {
    final t0 = DateTime.utc(2026, 8, 14, 12, 0);
    final newestFirst = [
      _msg(id: '3', sender: 'a', at: t0.add(const Duration(minutes: 1))),
      _msg(id: '2', sender: 'a', at: t0.add(const Duration(seconds: 30))),
      _msg(id: '1', sender: 'a', at: t0),
    ];
    final items = buildChatTimelineNewestFirst(
      newestFirst: newestFirst,
      viewerUid: 'me',
      isGroup: true,
    );
    final messages = items.where((i) => i.kind == ChatTimelineKind.message).toList();
    expect(messages[0].groupedWithOlder, isTrue);
    expect(messages[0].groupedWithNewer, isFalse);
    expect(messages[0].showTime, isTrue);
    expect(messages[2].groupedWithOlder, isFalse);
    expect(messages[2].showSenderName, isTrue);
  });

  test('inserts a day pill after the last message of that day in reverse list', () {
    final day1 = DateTime(2026, 8, 13, 10);
    final day2 = DateTime(2026, 8, 14, 10);
    final items = buildChatTimelineNewestFirst(
      newestFirst: [
        _msg(id: '2', sender: 'a', at: day2),
        _msg(id: '1', sender: 'b', at: day1),
      ],
      viewerUid: 'me',
      isGroup: false,
    );
    expect(items.map((i) => i.kind).toList(), [
      ChatTimelineKind.message,
      ChatTimelineKind.day,
      ChatTimelineKind.message,
      ChatTimelineKind.day,
    ]);
  });

  test('unread divider sits after the unread batch in reverse order', () {
    final t0 = DateTime.utc(2026, 8, 14, 12);
    final items = buildChatTimelineNewestFirst(
      newestFirst: [
        _msg(id: '3', sender: 'a', at: t0.add(const Duration(minutes: 2))),
        _msg(id: '2', sender: 'a', at: t0.add(const Duration(minutes: 1))),
        _msg(id: '1', sender: 'a', at: t0),
      ],
      viewerUid: 'me',
      isGroup: false,
      unreadCount: 2,
    );
    expect(items[0].kind, ChatTimelineKind.message);
    expect(items[1].kind, ChatTimelineKind.message);
    expect(items[2].kind, ChatTimelineKind.unread);
  });
}
