import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';

class AiSettingsScreen extends StatelessWidget {
  const AiSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Ajustes de IA')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text('Modelo', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          PulseSheet(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Gemini'),
              subtitle: Text(
                'Próximamente vía Firebase AI Logic',
                style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
