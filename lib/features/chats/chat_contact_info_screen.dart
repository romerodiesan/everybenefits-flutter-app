import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';

class ChatContactInfoScreen extends StatelessWidget {
  const ChatContactInfoScreen({super.key, required this.chat});

  final DemoChat chat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Info')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.brandOf(context).withValues(alpha: 0.2),
              child: Text(
                chat.initials,
                style: theme.textTheme.headlineMedium,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            chat.title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22),
          ),
          const SizedBox(height: AppSpacing.xl),
          PulseSheet(
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Silenciar'),
                  trailing: Icon(Icons.notifications_off_outlined,
                      color: colors.muted),
                  onTap: () {},
                ),
                Divider(color: colors.border),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    'Bloquear',
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
