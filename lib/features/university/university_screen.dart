import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'course_detail_screen.dart';
import 'learning_path_screen.dart';
import 'my_learning_screen.dart';
import 'platzi_search_screen.dart';

/// Minimal academy catalog.
class UniversityScreen extends StatelessWidget {
  const UniversityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          'Academia',
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
          IconButton(
            tooltip: 'Buscar',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const PlatziSearchScreen(),
                ),
              );
            },
            icon: const Icon(Icons.search),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          Row(
            children: [
              Expanded(
                child: PulseSheet(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const MyLearningScreen(),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Icon(Icons.school_outlined, color: AppColors.brandOf(context)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Mi aprendizaje',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: PulseSheet(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const LearningPathScreen(),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Icon(Icons.route_outlined, color: colors.ink),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Rutas',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Cursos', style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpacing.md),
          for (final course in demoCourses) ...[
            PulseSheet(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => CourseDetailScreen(course: course),
                  ),
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 88,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Color(course.colorValue).withValues(alpha: 0.35),
                    ),
                    alignment: Alignment.bottomLeft,
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      course.level.toUpperCase(),
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    course.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${course.teacher} · ${course.hours}',
                    style: theme.textTheme.bodyMedium,
                  ),
                  if (course.progress != null) ...[
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: course.progress,
                        minHeight: 6,
                        backgroundColor: colors.border,
                        color: AppColors.brandOf(context),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.md),
            child: Text(
              'Catálogo demo — cursos reales próximamente.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
          ),
        ],
      ),
    );
  }
}
