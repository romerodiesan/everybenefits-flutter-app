import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../university/course_detail_screen.dart';
import '../university/course_repository.dart';
import '../university/path_detail_screen.dart';
import 'pulse_ai_models.dart';

/// Opens a citation using the same destinations the web agent links to.
Future<void> openPulseSource(
  BuildContext context, {
  required PulseSource source,
  required UserProfile profile,
  CourseRepository? courseRepository,
}) async {
  final courses = courseRepository ?? CourseRepository();

  switch (source.type) {
    case PulseSourceType.acceptedForumAnswer:
      if (source.sourceId.isEmpty) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ThreadDetailScreen(
            threadId: source.sourceId,
            profile: profile,
            forumRepository: ForumRepository(),
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
            courseRepository: courses,
          ),
        ),
      );
    case PulseSourceType.path:
      if (source.sourceId.isEmpty) return;
      final path = await courses.fetchPath(source.sourceId);
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
            courseRepository: courses,
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
            courseRepository: courses,
          ),
        ),
      );
    case PulseSourceType.official:
      final uri = Uri.tryParse(source.url);
      if (uri == null) return;
      await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
