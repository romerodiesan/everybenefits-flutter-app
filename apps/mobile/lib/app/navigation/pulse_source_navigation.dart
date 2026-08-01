import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/ai_chat/pulse_ai_models.dart';
import '../../features/forums/forum_repository.dart';
import '../../features/forums/thread_detail_screen.dart';
import '../../features/university/course_detail_screen.dart';
import '../../features/university/course_repository.dart';
import '../../features/university/path_detail_screen.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';

/// Opens a citation using the same destinations the web agent links to.
Future<void> openPulseSource(
  BuildContext context, {
  required PulseSource source,
  required UserProfile profile,
  required CourseRepository courseRepository,
  required ForumRepository forumRepository,
}) async {
  switch (source.type) {
    case PulseSourceType.acceptedForumAnswer:
      if (source.sourceId.isEmpty) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ThreadDetailScreen(
            threadId: source.sourceId,
            profile: profile,
            forumRepository: forumRepository,
          ),
        ),
      );
    case PulseSourceType.course:
      if (source.sourceId.isEmpty) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CourseDetailScreen(
            courseId: source.sourceId,
            profile: profile,
            courseRepository: courseRepository,
          ),
        ),
      );
    case PulseSourceType.path:
      if (source.sourceId.isEmpty) return;
      final path = await courseRepository.fetchPath(source.sourceId);
      if (!context.mounted) return;
      if (path == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.l10n.aiSourceMissing)),
        );
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => PathDetailScreen(
            path: path,
            profile: profile,
            courseRepository: courseRepository,
          ),
        ),
      );
    case PulseSourceType.lesson:
      final courseId = source.parentId;
      if (courseId == null || courseId.isEmpty) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CourseDetailScreen(
            courseId: courseId,
            profile: profile,
            courseRepository: courseRepository,
          ),
        ),
      );
    case PulseSourceType.official:
      final uri = Uri.tryParse(source.url);
      if (uri == null) return;
      await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
