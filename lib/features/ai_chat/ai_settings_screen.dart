import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';

class AiSettingsScreen extends StatelessWidget {
  const AiSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.aiSettingsTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(l10n.aiModelSection, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          PulseSheet(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Gemini'),
              subtitle: Text(
                l10n.aiModelSubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
