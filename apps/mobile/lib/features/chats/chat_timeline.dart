import 'chat_models.dart';

enum ChatTimelineKind { message, day, unread }

const kChatGroupWindow = Duration(minutes: 2);

class ChatTimelineItem {
  const ChatTimelineItem.message({
    required this.message,
    required this.groupedWithOlder,
    required this.groupedWithNewer,
    required this.showSenderName,
    required this.showTime,
  })  : kind = ChatTimelineKind.message,
        day = null;

  const ChatTimelineItem.day(this.day)
      : kind = ChatTimelineKind.day,
        message = null,
        groupedWithOlder = false,
        groupedWithNewer = false,
        showSenderName = false,
        showTime = false;

  const ChatTimelineItem.unread()
      : kind = ChatTimelineKind.unread,
        message = null,
        day = null,
        groupedWithOlder = false,
        groupedWithNewer = false,
        showSenderName = false,
        showTime = false;

  final ChatTimelineKind kind;
  final ChatMessage? message;
  final DateTime? day;
  final bool groupedWithOlder;
  final bool groupedWithNewer;
  final bool showSenderName;
  final bool showTime;
}

DateTime chatDayKey(DateTime at) {
  final local = at.toLocal();
  return DateTime(local.year, local.month, local.day);
}

bool messagesGroupTogether(ChatMessage a, ChatMessage b) {
  if (a.senderId != b.senderId) return false;
  if (chatDayKey(a.createdAt) != chatDayKey(b.createdAt)) return false;
  final delta = a.createdAt.difference(b.createdAt).abs();
  return delta <= kChatGroupWindow;
}

/// Builds items for a reverse [ListView] (index 0 = newest / bottom).
///
/// [newestFirst] must already be newest → oldest.
List<ChatTimelineItem> buildChatTimelineNewestFirst({
  required List<ChatMessage> newestFirst,
  required String viewerUid,
  required bool isGroup,
  int unreadCount = 0,
}) {
  final items = <ChatTimelineItem>[];
  var remainingUnread = unreadCount < 0 ? 0 : unreadCount;

  for (var i = 0; i < newestFirst.length; i++) {
    final msg = newestFirst[i];
    final older = i + 1 < newestFirst.length ? newestFirst[i + 1] : null;
    final newer = i > 0 ? newestFirst[i - 1] : null;
    final groupedWithOlder =
        older != null && messagesGroupTogether(msg, older);
    final groupedWithNewer =
        newer != null && messagesGroupTogether(msg, newer);
    final mine = msg.isMine(viewerUid);

    items.add(
      ChatTimelineItem.message(
        message: msg,
        groupedWithOlder: groupedWithOlder,
        groupedWithNewer: groupedWithNewer,
        showSenderName:
            isGroup && !mine && !groupedWithOlder && msg.senderName.trim().isNotEmpty,
        showTime: !groupedWithNewer,
      ),
    );

    if (remainingUnread > 0) {
      remainingUnread -= 1;
      if (remainingUnread == 0) {
        items.add(const ChatTimelineItem.unread());
      }
    }

    final startsDay = older == null ||
        chatDayKey(msg.createdAt) != chatDayKey(older.createdAt);
    if (startsDay) {
      items.add(ChatTimelineItem.day(chatDayKey(msg.createdAt)));
    }
  }

  return items;
}
