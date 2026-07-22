import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'chat_conversation_screen.dart';

class ChatNewChatScreen extends StatelessWidget {
  const ChatNewChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Nuevo chat')),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.sm,
            ),
            child: Text(
              'Contactos',
              style: theme.textTheme.labelLarge?.copyWith(color: colors.muted),
            ),
          ),
          for (final person in demoPeople)
            ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.brandOf(context).withValues(alpha: 0.18),
                child: Text(
                  person.initials,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              title: Text(
                person.name,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              subtitle: Text(person.handle),
              onTap: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute<void>(
                    builder: (_) => ChatConversationScreen(
                      chat: DemoChat(
                        id: person.handle,
                        title: person.name,
                        preview: '',
                        time: '',
                        initials: person.initials,
                      ),
                    ),
                  ),
                );
              },
            ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Text(
              'Placeholder — chats reales próximamente.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
          ),
        ],
      ),
    );
  }
}
