import 'package:flutter/material.dart';

import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'course_detail_screen.dart';

class PlatziSearchScreen extends StatelessWidget {
  const PlatziSearchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PulseScaffold(
      appBar: AppBar(
        title: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Buscar cursos…',
            border: InputBorder.none,
          ),
        ),
      ),
      body: ListView(
        children: [
          for (final course in demoCourses)
            ListTile(
              title: Text(course.title),
              subtitle: Text(
                course.teacher,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.of(context).muted,
                ),
              ),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => CourseDetailScreen(course: course),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
