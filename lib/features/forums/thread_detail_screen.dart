import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/glass_card.dart';
import '../../app/widgets/mesh_background.dart';
import '../../users/users.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'widgets/forum_avatar.dart';
import 'widgets/forum_meta_line.dart';
import 'widgets/forum_tag_wrap.dart';

class ThreadDetailScreen extends StatefulWidget {
  const ThreadDetailScreen({
    super.key,
    required this.threadId,
    required this.profile,
    required this.forumRepository,
  });

  final String threadId;
  final UserProfile profile;
  final ForumRepository forumRepository;

  @override
  State<ThreadDetailScreen> createState() => _ThreadDetailScreenState();
}

class _ThreadDetailScreenState extends State<ThreadDetailScreen> {
  final _replyController = TextEditingController();
  bool _sending = false;

  static const _fieldRadius = BorderRadius.all(Radius.circular(16));

  bool get _canPost => canParticipateInForums(
        role: widget.profile.role,
        isAnonymous: widget.profile.isAnonymous,
      );

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.forumRepository.addReply(
        threadId: widget.threadId,
        body: text,
        author: widget.profile,
      );
      _replyController.clear();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo publicar: $error')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _deleteThread(ForumThread thread) async {
    try {
      await widget.forumRepository.deleteThread(
        thread: thread,
        actor: widget.profile,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo eliminar: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return MeshBackground(
      child: StreamBuilder<ForumThread?>(
        stream: widget.forumRepository.watchThread(widget.threadId),
        builder: (context, threadSnapshot) {
          final thread = threadSnapshot.data;
          final loading = threadSnapshot.connectionState ==
                  ConnectionState.waiting &&
              thread == null;
          final missing = !loading && thread == null;
          final canDelete = thread != null &&
              (widget.profile.role == UserRole.admin ||
                  thread.authorId == widget.profile.uid);

          return Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              title: Text(
                thread?.title ?? 'Publicación',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              actions: [
                if (canDelete)
                  IconButton(
                    tooltip: 'Eliminar publicación',
                    onPressed: () => _deleteThread(thread),
                    icon: const Icon(Icons.delete_outline),
                  ),
              ],
            ),
            body: loading
                ? const Center(child: CircularProgressIndicator())
                : missing
                    ? const EmptyState(
                        mark: '?',
                        title: 'Publicación no encontrada',
                        subtitle: 'Puede haber sido eliminada.',
                      )
                    : Column(
                        children: [
                          Expanded(
                            child: StreamBuilder<List<ForumReply>>(
                              stream: widget.forumRepository
                                  .watchReplies(widget.threadId),
                              builder: (context, repliesSnapshot) {
                                final replies =
                                    repliesSnapshot.data ?? const [];
                                final commentsLabel = thread!.replyCount == 1
                                    ? '1 comentario'
                                    : '${thread.replyCount} comentarios';

                                return ListView(
                                  padding: const EdgeInsets.fromLTRB(
                                    AppSpacing.md,
                                    AppSpacing.sm,
                                    AppSpacing.md,
                                    AppSpacing.lg,
                                  ),
                                  children: [
                                    _OriginalPostCard(thread: thread),
                                    const SizedBox(height: AppSpacing.md),
                                    Text(
                                      commentsLabel,
                                      style:
                                          theme.textTheme.labelLarge?.copyWith(
                                        color: colors.muted,
                                        letterSpacing: 0.4,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    if (replies.isEmpty)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: AppSpacing.sm,
                                        ),
                                        child: Text(
                                          'Sé el primero en comentar.',
                                          style: theme.textTheme.bodyMedium
                                              ?.copyWith(color: colors.muted),
                                        ),
                                      )
                                    else
                                      for (var i = 0;
                                          i < replies.length;
                                          i++) ...[
                                        if (i > 0)
                                          const SizedBox(
                                            height: AppSpacing.sm,
                                          ),
                                        _CommentCard(reply: replies[i]),
                                      ],
                                  ],
                                );
                              },
                            ),
                          ),
                          Divider(height: 1, color: colors.glassBorder),
                          SafeArea(
                            top: false,
                            child: ColoredBox(
                              color:
                                  colors.meshDeep.withValues(alpha: 0.92),
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.md,
                                  AppSpacing.sm,
                                  AppSpacing.md,
                                  AppSpacing.sm,
                                ),
                                child: _canPost
                                    ? Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          ForumAvatar(
                                            name: widget.profile
                                                        .displayName
                                                        ?.trim()
                                                        .isNotEmpty ==
                                                    true
                                                ? widget
                                                    .profile.displayName!
                                                : (widget.profile.email ??
                                                    'Tú'),
                                            photoUrl:
                                                widget.profile.photoUrl,
                                            size: 36,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: TextField(
                                              controller: _replyController,
                                              minLines: 1,
                                              maxLines: 4,
                                              textCapitalization:
                                                  TextCapitalization
                                                      .sentences,
                                              decoration: InputDecoration(
                                                hintText:
                                                    'Escribe un comentario…',
                                                filled: true,
                                                fillColor: colors.glassFill,
                                                border:
                                                    const OutlineInputBorder(
                                                  borderRadius:
                                                      _fieldRadius,
                                                ),
                                                enabledBorder:
                                                    OutlineInputBorder(
                                                  borderRadius:
                                                      _fieldRadius,
                                                  borderSide: BorderSide(
                                                    color:
                                                        colors.glassBorder,
                                                  ),
                                                ),
                                                focusedBorder:
                                                    const OutlineInputBorder(
                                                  borderRadius:
                                                      _fieldRadius,
                                                  borderSide: BorderSide(
                                                    color: AppColors.accent,
                                                    width: 1.4,
                                                  ),
                                                ),
                                                contentPadding:
                                                    const EdgeInsets
                                                        .symmetric(
                                                  horizontal: 14,
                                                  vertical: 12,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          FilledButton(
                                            onPressed: _sending
                                                ? null
                                                : _sendReply,
                                            style: FilledButton.styleFrom(
                                              minimumSize:
                                                  const Size(48, 48),
                                              padding:
                                                  const EdgeInsets.all(12),
                                              shape:
                                                  RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(
                                                  14,
                                                ),
                                              ),
                                            ),
                                            child: _sending
                                                ? const SizedBox(
                                                    width: 18,
                                                    height: 18,
                                                    child:
                                                        CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                                  )
                                                : const Icon(
                                                    Icons.send_rounded,
                                                    size: 20,
                                                  ),
                                          ),
                                        ],
                                      )
                                    : Padding(
                                        padding:
                                            const EdgeInsets.symmetric(
                                          vertical: AppSpacing.sm,
                                        ),
                                        child: Text(
                                          'Regístrate para comentar en la comunidad.',
                                          style: theme
                                              .textTheme.bodyMedium
                                              ?.copyWith(
                                            color: colors.muted,
                                          ),
                                        ),
                                      ),
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

class _OriginalPostCard extends StatelessWidget {
  const _OriginalPostCard({required this.thread});

  final ForumThread thread;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ForumAvatar(
                name: thread.authorName,
                photoUrl: thread.authorPhotoUrl,
                size: 48,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: ForumMetaLine(
                  authorName: thread.authorName,
                  role: thread.authorRole,
                  at: thread.createdAt,
                  social: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            thread.title,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontSize: 24,
              height: 1.2,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            thread.body,
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.55),
          ),
          if (thread.tags.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            ForumTagWrap(tags: thread.tags),
          ],
        ],
      ),
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({required this.reply});

  final ForumReply reply;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GlassCard(
      padding: const EdgeInsets.all(12),
      borderRadius: 14,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ForumAvatar(
            name: reply.authorName,
            photoUrl: reply.authorPhotoUrl,
            size: 36,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ForumMetaLine(
                  authorName: reply.authorName,
                  role: reply.authorRole,
                  at: reply.createdAt,
                  social: true,
                  dense: true,
                  showRole: false,
                ),
                const SizedBox(height: 6),
                Text(
                  reply.body,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    height: 1.45,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
