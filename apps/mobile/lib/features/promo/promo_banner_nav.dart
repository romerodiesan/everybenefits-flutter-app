import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../users/user_profile.dart';
import '../chats/chat_repository.dart';
import '../forums/forum_repository.dart';
import '../notifications/notification_models.dart';
import '../notifications/notification_navigation.dart';
import '../notifications/notification_target.dart';
import '../university/course_repository.dart';
import 'promo_banner_match.dart';

/// Opens a promo CTA href. Skips tools/cotizador; supports web paths and https.
Future<void> openPromoBannerHref(
  BuildContext context, {
  required String href,
  required UserProfile profile,
  ForumRepository? forumRepository,
  ChatRepository? chatRepository,
  CourseRepository? courseRepository,
}) async {
  final raw = href.trim();
  if (raw.isEmpty || isToolsHref(raw)) return;

  if (RegExp(r'^https://', caseSensitive: false).hasMatch(raw)) {
    final uri = Uri.tryParse(raw);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }

  // Reuse notification deep-link parsing for /home/:id, /academy/:id, /chats/:id.
  final fake = AppNotification(
    id: 'promo',
    type: 'promo',
    title: '',
    body: '',
    href: raw,
    deepLink: '',
    ref: const {},
    read: true,
    createdAt: DateTime.now().toUtc(),
  );
  final target = notificationTargetFor(fake);
  if (!target.canNavigate) {
    // Surface-level links without an id (e.g. /academy, /home) — switch tabs
    // is handled by callers when needed; nothing to push here.
    return;
  }
  if (!context.mounted) return;
  await openNotificationTarget(
    context,
    item: fake,
    profile: profile,
    forumRepository: forumRepository,
    chatRepository: chatRepository,
    courseRepository: courseRepository,
  );
}
