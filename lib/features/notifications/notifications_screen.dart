import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../chats/chat_repository.dart';
import '../forums/forum_repository.dart';
import '../university/course_repository.dart';
import 'notification_models.dart';
import 'notification_navigation.dart';
import 'notification_repository.dart';
import 'notification_target.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.uid,
    required this.profile,
    this.repository,
    this.forumRepository,
    this.chatRepository,
    this.courseRepository,
  });

  final String uid;
  final UserProfile profile;
  final NotificationRepository? repository;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final CourseRepository? courseRepository;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final NotificationRepository _repo =
      widget.repository ?? NotificationRepository();
  String? _openingId;

  Future<void> _openItem(AppNotification item) async {
    if (_openingId != null) return;
    setState(() => _openingId = item.id);
    try {
      if (!item.read) {
        try {
          await _repo.markRead(widget.uid, item);
        } catch (_) {}
      }
      if (!mounted) return;
      final target = notificationTargetFor(item);
      if (!target.canNavigate) return;
      await openNotificationTarget(
        context,
        item: item,
        profile: widget.profile,
        forumRepository: widget.forumRepository,
        chatRepository: widget.chatRepository,
        courseRepository: widget.courseRepository,
      );
    } finally {
      if (mounted) setState(() => _openingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notificationsTitle),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await _repo.markAllRead(widget.uid);
              } catch (_) {}
            },
            child: Text(l10n.notificationsMarkAll),
          ),
        ],
      ),
      body: StreamBuilder<List<AppNotification>>(
        stream: _repo.watchNotifications(widget.uid),
        builder: (context, snap) {
          final items = snap.data ?? const <AppNotification>[];
          if (snap.connectionState == ConnectionState.waiting &&
              items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  l10n.notificationsEmpty,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: colors.muted),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final item = items[index];
              final busy = _openingId == item.id;
              return Material(
                color: colors.sheet,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: busy ? null : () => _openItem(item),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (!item.read)
                              Container(
                                width: 7,
                                height: 7,
                                margin: const EdgeInsets.only(right: 8),
                                decoration: BoxDecoration(
                                  color: AppColors.brandOf(context),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            Expanded(
                              child: Text(
                                item.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                            if (busy)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.body,
                          style: TextStyle(
                            color: colors.muted,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
