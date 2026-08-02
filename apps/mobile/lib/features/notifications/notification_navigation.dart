import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../chats/chat_models.dart';
import '../chats/chat_repository.dart';
import '../chats/chats_screen.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../university/course_detail_screen.dart';
import '../university/course_repository.dart';
import 'notification_models.dart';
import 'notification_target.dart';

/// Opens the destination encoded on [item], if any.
Future<void> openNotificationTarget(
  BuildContext context, {
  required AppNotification item,
  required UserProfile profile,
  ForumRepository? forumRepository,
  ChatRepository? chatRepository,
  CourseRepository? courseRepository,
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
            forumRepository: forumRepository ?? ForumRepository(),
            chatRepository: chatRepository,
          ),
        ),
      );
    case NotificationTargetKind.chat:
      final chats = chatRepository ?? ChatRepository();
      ChatConversation? chat;
      try {
        chat = await chats.watchChat(id).first;
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
        chatRepository: chats,
      );
    case NotificationTargetKind.academy:
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CourseDetailScreen(
            courseId: id,
            profile: profile,
            courseRepository: courseRepository ?? CourseRepository(),
          ),
        ),
      );
    case NotificationTargetKind.inbox:
      return;
  }
}
