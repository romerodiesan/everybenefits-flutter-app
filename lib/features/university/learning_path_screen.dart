import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';

class LearningPathScreen extends StatelessWidget {
  const LearningPathScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final paths = [
      ('Agente nuevo', '5 cursos · 28h', 0.2),
      ('Cierre de ventas', '4 cursos · 18h', 0.0),
      ('Liderazgo de agencia', '6 cursos · 32h', 0.55),
    ];

    return PulseScaffold(
      appBar: AppBar(title: const Text('Rutas')),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: paths.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final path = paths[index];
          return PulseSheet(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  path.$1,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(path.$2, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: path.$3,
                  color: AppColors.brandOf(context),
                  backgroundColor: colors.border,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
