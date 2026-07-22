import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'course_player_screen.dart';

class CourseDetailScreen extends StatelessWidget {
  const CourseDetailScreen({super.key, required this.course});

  final DemoCourse course;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Curso')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            course.title,
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Por ${course.teacher}',
            style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            children: [
              _Chip(course.level),
              _Chip(course.hours),
              _Chip('${course.students} estudiantes'),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          SignalButton(
            label: course.progress == null ? 'Empezar curso' : 'Continuar',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CoursePlayerScreen(course: course),
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Sobre este curso', style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Contenido demo. Los módulos reales llegarán cuando conectemos el LMS.',
            style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          for (var i = 1; i <= 4; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: colors.sheet,
                child: Text('$i', style: theme.textTheme.labelLarge),
              ),
              title: Text('Módulo $i'),
              subtitle: const Text('4 clases'),
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.sheet,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(fontSize: 12),
      ),
    );
  }
}
