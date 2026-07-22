import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/user_profile.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../forums/widgets/share_to_chat_sheet.dart';
import 'chat_contact_info_screen.dart';

class ChatConversationScreen extends StatefulWidget {
  const ChatConversationScreen({
    super.key,
    required this.chat,
    this.initialSharedPost,
    this.viewerProfile,
    this.forumRepository,
  });

  final DemoChat chat;
  final SharedPostPreview? initialSharedPost;
  final UserProfile? viewerProfile;
  final ForumRepository? forumRepository;

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final _controller = TextEditingController();
  late final List<DemoMessage> _messages = [
    ...demoMessages,
    if (widget.initialSharedPost != null)
      DemoMessage(
        body: '',
        time: 'Ahora',
        mine: true,
        sharedPost: widget.initialSharedPost,
      ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(DemoMessage(body: text, time: 'Ahora', mine: true));
      _controller.clear();
    });
  }

  void _openSharedPost(SharedPostPreview preview) {
    final profile = widget.viewerProfile;
    if (profile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir la pregunta desde este chat.'),
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: preview.threadId,
          profile: profile,
          forumRepository: widget.forumRepository ?? ForumRepository(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ChatContactInfoScreen(chat: widget.chat),
              ),
            );
          },
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor:
                    AppColors.brandOf(context).withValues(alpha: 0.2),
                child: Text(
                  widget.chat.initials,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.chat.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final shared = msg.sharedPost;

                if (shared != null) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Align(
                      alignment: msg.mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
                        ),
                        child: Column(
                          crossAxisAlignment: msg.mine
                              ? CrossAxisAlignment.end
                              : CrossAxisAlignment.start,
                          children: [
                            SharedPostCard(
                              preview: shared,
                              onTap: () => _openSharedPost(shared),
                            ),
                            if (msg.body.trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  10,
                                  12,
                                  8,
                                ),
                                decoration: BoxDecoration(
                                  color: msg.mine
                                      ? AppColors.brandOf(context)
                                          .withValues(alpha: 0.14)
                                      : colors.sheet,
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft:
                                        Radius.circular(msg.mine ? 16 : 4),
                                    bottomRight:
                                        Radius.circular(msg.mine ? 4 : 16),
                                  ),
                                  border: Border.all(color: colors.border),
                                ),
                                child: Text(
                                  msg.body,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: colors.ink,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              msg.time,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colors.muted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                return Align(
                  alignment:
                      msg.mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.sizeOf(context).width * 0.78,
                    ),
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                    decoration: BoxDecoration(
                      color: msg.mine
                          ? AppColors.brandOf(context).withValues(alpha: 0.14)
                          : colors.sheet,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(msg.mine ? 16 : 4),
                        bottomRight: Radius.circular(msg.mine ? 4 : 16),
                      ),
                      border: Border.all(color: colors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          msg.body,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: colors.ink,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          msg.time,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.muted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Divider(height: 1, color: colors.border),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.sm,
                AppSpacing.sm,
                AppSpacing.sm,
                AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: 'Mensaje',
                        filled: true,
                        fillColor: colors.sheet,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide(color: colors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide(color: colors.border),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _send,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.brandOf(context),
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                    ),
                    icon: const Icon(Icons.send_rounded, size: 20),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
