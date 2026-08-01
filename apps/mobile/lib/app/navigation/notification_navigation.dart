import 'package:flutter/material.dart';

import '../../features/chats/chat_models.dart';
import '../../features/chats/chat_repository.dart';
import '../../features/chats/chats_screen.dart';
import '../../features/forums/forum_repository.dart';
import '../../features/forums/thread_detail_screen.dart';
import '../../features/notifications/notification_models.dart';
import '../../features/notifications/notification_target.dart';
import '../../features/university/course_detail_screen.dart';
import '../../features/university/course_repository.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';

/// Opens the destination encoded on [item], if any.
Future<void> openNotificationTarget(
  BuildContext context, {
  required AppNotification item,
  required UserProfile profile,
  required ForumRepository forumRepository,
  required ChatRepository chatRepository,
  required CourseRepository courseRepository,
}) async {
  final target = notificationTargetFor(item);
  if (!target.canNavigate) return;

  final id = target.id!;
  switch (target.kind) {
    case NotificationTargetKind.forum:
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ThreadDetailScreen(
            threadId: id,
            profile: profile,
            forumRepository: forumRepository,
            chatRepository: chatRepository,
          ),
        ),
      );
    case NotificationTargetKind.chat:
      ChatConversation? chat;
      try {
        chat = await chatRepository.watchChat(id).first;
      } catch (_) {
        chat = null;
      }
      if (!context.mounted) return;
      if (chat == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.l10n.errGenericRetry)),
        );
        return;
      }
      openChat(
        context,
        chat: chat,
        profile: profile,
        chatRepository: chatRepository,
      );
    case NotificationTargetKind.academy:
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CourseDetailScreen(
            courseId: id,
            profile: profile,
            courseRepository: courseRepository,
          ),
        ),
      );
    case NotificationTargetKind.inbox:
      return;
  }
}
