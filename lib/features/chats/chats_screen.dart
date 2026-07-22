import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'chat_conversation_screen.dart';
import 'chat_new_chat_screen.dart';

/// Minimal chat list (1:1 essence).
class ChatsScreen extends StatelessWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          'Chats',
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
          IconButton(
            tooltip: 'Nuevo chat',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ChatNewChatScreen(),
                ),
              );
            },
            icon: const Icon(Icons.edit_outlined),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab-chats-new',
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const ChatNewChatScreen(),
            ),
          );
        },
        tooltip: 'Nuevo chat',
        child: const Icon(Icons.add_rounded),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.only(bottom: AppSpacing.xl),
        itemCount: demoChats.length,
        separatorBuilder: (_, _) => Divider(
          height: 1,
          indent: 76,
          color: colors.border,
        ),
        itemBuilder: (context, index) {
          final chat = demoChats[index];
          return ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: 4,
            ),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ChatConversationScreen(chat: chat),
                ),
              );
            },
            leading: CircleAvatar(
              radius: 26,
              backgroundColor: AppColors.brandOf(context).withValues(alpha: 0.18),
              child: Text(
                chat.initials,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colors.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    chat.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  chat.time,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: chat.unread > 0 ? AppColors.brandOf(context) : colors.muted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            subtitle: Row(
              children: [
                Expanded(
                  child: Text(
                    chat.preview,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                if (chat.unread > 0)
                  Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.brandOf(context),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${chat.unread}',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onPrimary,
                        fontSize: 11,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
