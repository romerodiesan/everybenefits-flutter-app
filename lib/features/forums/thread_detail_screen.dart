import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/users.dart';
import '../chats/chat_repository.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'forum_tags.dart';
import 'widgets/forum_avatar.dart';
import 'widgets/forum_meta_line.dart';
import 'widgets/forum_tag_wrap.dart';
import 'widgets/relevance_controls.dart';
import 'widgets/relative_time.dart';
import 'widgets/share_to_chat_sheet.dart';

class ThreadDetailScreen extends StatefulWidget {
  const ThreadDetailScreen({
    super.key,
    required this.threadId,
    required this.profile,
    required this.forumRepository,
    this.chatRepository,
  });

  final String threadId;
  final UserProfile profile;
  final ForumRepository forumRepository;
  final ChatRepository? chatRepository;

  @override
  State<ThreadDetailScreen> createState() => _ThreadDetailScreenState();
}

class _ThreadDetailScreenState extends State<ThreadDetailScreen> {
  final _replyController = TextEditingController();
  final _replyFocus = FocusNode();
  bool _sending = false;

  static const _composerRadius = BorderRadius.all(Radius.circular(20));

  bool get _canPost => canParticipateInForums(
        role: widget.profile.role,
        isAnonymous: widget.profile.isAnonymous,
      );

  bool _isAuthorOrAdmin(String authorId) {
    return widget.profile.role == UserRole.admin ||
        authorId == widget.profile.uid;
  }

  @override
  void dispose() {
    _replyController.dispose();
    _replyFocus.dispose();
    super.dispose();
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(friendlyForumError(error))),
    );
  }

  Future<bool> _confirmDelete({
    required String title,
    required String message,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    return result == true;
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
      _replyFocus.unfocus();
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _deleteThread(ForumThread thread) async {
    final confirmed = await _confirmDelete(
      title: 'Eliminar pregunta',
      message: 'Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    try {
      await widget.forumRepository.deleteThread(
        thread: thread,
        actor: widget.profile,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _deleteReply(ForumReply reply) async {
    final confirmed = await _confirmDelete(
      title: 'Eliminar respuesta',
      message: 'Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    try {
      await widget.forumRepository.deleteReply(
        reply: reply,
        actor: widget.profile,
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _editThread(ForumThread thread) async {
    final titleController = TextEditingController(text: thread.title);
    final bodyController = TextEditingController(text: thread.body);
    final tagInput = TextEditingController();
    var tags = {...thread.tags};

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
            top: AppSpacing.sm,
          ),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Editar pregunta',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: titleController,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Título',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: bodyController,
                      textCapitalization: TextCapitalization.sentences,
                      minLines: 4,
                      maxLines: 8,
                      decoration: const InputDecoration(
                        labelText: 'Contenido',
                        border: OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: tagInput,
                      textInputAction: TextInputAction.done,
                      decoration: const InputDecoration(
                        labelText: 'Agregar tag',
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (_) {
                        final tag = normalizeForumTag(tagInput.text);
                        if (tag.isEmpty || tags.contains(tag)) {
                          tagInput.clear();
                          return;
                        }
                        if (tags.length >= 5) return;
                        setModalState(() {
                          tags.add(tag);
                          tagInput.clear();
                        });
                      },
                    ),
                    if (tags.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      ForumTagWrap(
                        tags: tags.toList(),
                        onTagRemove: (tag) {
                          setModalState(() => tags.remove(tag));
                        },
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text('Guardar'),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    final title = titleController.text;
    final body = bodyController.text;
    final tagList = tags.toList();
    titleController.dispose();
    bodyController.dispose();
    tagInput.dispose();

    if (saved != true) return;
    try {
      await widget.forumRepository.updateThread(
        thread: thread,
        actor: widget.profile,
        title: title,
        body: body,
        tags: tagList,
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _editReply(ForumReply reply) async {
    final bodyController = TextEditingController(text: reply.body);
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
            top: AppSpacing.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Editar respuesta',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: bodyController,
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                minLines: 4,
                maxLines: 8,
                decoration: const InputDecoration(
                  labelText: 'Respuesta',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Guardar'),
              ),
            ],
          ),
        );
      },
    );

    final body = bodyController.text;
    bodyController.dispose();
    if (saved != true) return;
    try {
      await widget.forumRepository.updateReply(
        reply: reply,
        actor: widget.profile,
        body: body,
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _acceptReply(ForumThread thread, ForumReply reply) async {
    try {
      await widget.forumRepository.acceptReply(
        thread: thread,
        reply: reply,
        actor: widget.profile,
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _voteThread(ForumThread thread, RelevanceVote next) async {
    try {
      await widget.forumRepository.setThreadRelevance(
        thread: thread,
        actor: widget.profile,
        vote: next,
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _voteReply(ForumReply reply, RelevanceVote next) async {
    try {
      await widget.forumRepository.setReplyRelevance(
        reply: reply,
        actor: widget.profile,
        vote: next,
      );
    } catch (error) {
      _showError(error);
    }
  }

  RelevanceVote _toggle(RelevanceVote current, RelevanceVote pressed) {
    return current == pressed ? RelevanceVote.none : pressed;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return StreamBuilder<ForumThread?>(
      stream: widget.forumRepository.watchThread(widget.threadId),
      builder: (context, threadSnapshot) {
        final thread = threadSnapshot.data;
        final loading =
            threadSnapshot.connectionState == ConnectionState.waiting &&
                thread == null;
        final missing = !loading && thread == null;
        final canManageThread =
            thread != null && _isAuthorOrAdmin(thread.authorId);
        final canAccept =
            thread != null && _isAuthorOrAdmin(thread.authorId);
        final canVote = _canPost &&
            thread != null &&
            thread.authorId != widget.profile.uid;

        return PulseScaffold(
          appBar: AppBar(
            title: Text(
              thread?.title ?? 'Pregunta',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              if (thread != null)
                IconButton(
                  tooltip: 'Compartir en chat',
                  onPressed: () => showShareToChatSheet(
                    context: context,
                    thread: thread,
                    profile: widget.profile,
                    forumRepository: widget.forumRepository,
                    chatRepository: widget.chatRepository,
                  ),
                  icon: const Icon(Icons.forum_outlined),
                ),
            ],
          ),
          body: loading
              ? const Center(child: CircularProgressIndicator())
              : missing
                  ? const EmptyState(
                      mark: '?',
                      title: 'Pregunta no encontrada',
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
                              final count = thread!.replyCount;
                              final answersLabel = count == 1
                                  ? '1 respuesta'
                                  : '$count respuestas';

                              return ListView(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.md,
                                  AppSpacing.sm,
                                  AppSpacing.md,
                                  AppSpacing.lg,
                                ),
                                children: [
                                  StreamBuilder<RelevanceVote>(
                                    stream: widget.forumRepository
                                        .watchThreadVote(
                                      threadId: thread.id,
                                      uid: widget.profile.uid,
                                    ),
                                    builder: (context, voteSnap) {
                                      final vote = voteSnap.data ??
                                          RelevanceVote.none;
                                      return _OriginalPost(
                                        thread: thread,
                                        vote: vote,
                                        canVote: canVote,
                                        canManage: canManageThread,
                                        onUp: () => _voteThread(
                                          thread,
                                          _toggle(vote, RelevanceVote.up),
                                        ),
                                        onDown: () => _voteThread(
                                          thread,
                                          _toggle(vote, RelevanceVote.down),
                                        ),
                                        onAnswer: _canPost
                                            ? () =>
                                                _replyFocus.requestFocus()
                                            : null,
                                        onShare: () => showShareToChatSheet(
                                          context: context,
                                          thread: thread,
                                          profile: widget.profile,
                                          forumRepository:
                                              widget.forumRepository,
                                          chatRepository: widget.chatRepository,
                                        ),
                                        onEdit: () => _editThread(thread),
                                        onDelete: () =>
                                            _deleteThread(thread),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: AppSpacing.lg),
                                  Text(
                                    answersLabel,
                                    style: theme.textTheme.labelLarge
                                        ?.copyWith(
                                      color: colors.muted,
                                      letterSpacing: 0.4,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ordenadas por relevancia',
                                    style: theme.textTheme.bodySmall
                                        ?.copyWith(color: colors.muted),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  if (replies.isEmpty)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: AppSpacing.sm,
                                      ),
                                      child: Text(
                                        'Sé el primero en responder.',
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
                                          height: AppSpacing.md,
                                        ),
                                      _PulseAnswer(
                                        thread: thread,
                                        reply: replies[i],
                                        profile: widget.profile,
                                        canParticipate: _canPost,
                                        canManage: _isAuthorOrAdmin(
                                          replies[i].authorId,
                                        ),
                                        canAccept: canAccept,
                                        forumRepository:
                                            widget.forumRepository,
                                        onVote: (next) =>
                                            _voteReply(replies[i], next),
                                        onEdit: () =>
                                            _editReply(replies[i]),
                                        onDelete: () =>
                                            _deleteReply(replies[i]),
                                        onAccept: () => _acceptReply(
                                          thread,
                                          replies[i],
                                        ),
                                      ),
                                    ],
                                ],
                              );
                            },
                          ),
                        ),
                        _CommentComposerBar(
                          canPost: _canPost,
                          controller: _replyController,
                          focusNode: _replyFocus,
                          sending: _sending,
                          profile: widget.profile,
                          fieldRadius: _composerRadius,
                          onSend: _sendReply,
                        ),
                      ],
                    ),
        );
      },
    );
  }
}

class _OriginalPost extends StatelessWidget {
  const _OriginalPost({
    required this.thread,
    required this.vote,
    required this.canVote,
    required this.canManage,
    required this.onUp,
    required this.onDown,
    this.onAnswer,
    this.onShare,
    this.onEdit,
    this.onDelete,
  });

  final ForumThread thread;
  final RelevanceVote vote;
  final bool canVote;
  final bool canManage;
  final VoidCallback onUp;
  final VoidCallback onDown;
  final VoidCallback? onAnswer;
  final VoidCallback? onShare;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseSheet(
      padding: const EdgeInsets.fromLTRB(10, 14, 14, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RelevanceControls(
            score: thread.score,
            vote: vote,
            enabled: canVote,
            onUp: onUp,
            onDown: onDown,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ForumAvatar(
                      name: thread.authorName,
                      photoUrl: thread.authorPhotoUrl,
                      size: 40,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: ForumMetaLine(
                        authorName: thread.authorName,
                        role: thread.authorRole,
                        at: thread.createdAt,
                        social: true,
                        dense: true,
                      ),
                    ),
                    if (canManage)
                      PopupMenuButton<_ThreadAction>(
                        tooltip: 'Opciones',
                        onSelected: (action) {
                          switch (action) {
                            case _ThreadAction.edit:
                              onEdit?.call();
                            case _ThreadAction.delete:
                              onDelete?.call();
                          }
                        },
                        itemBuilder: (context) => const [
                          PopupMenuItem(
                            value: _ThreadAction.edit,
                            child: Text('Editar'),
                          ),
                          PopupMenuItem(
                            value: _ThreadAction.delete,
                            child: Text('Eliminar'),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  thread.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                    letterSpacing: -0.3,
                  ),
                ),
                if (thread.body.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    thread.body,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colors.ink.withValues(alpha: 0.88),
                      height: 1.45,
                      fontSize: 15,
                    ),
                  ),
                ],
                if (thread.tags.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  ForumTagWrap(tags: thread.tags),
                ],
                const SizedBox(height: AppSpacing.sm),
                Divider(height: 1, color: colors.border),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _PostAction(
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'Responder',
                      onTap: onAnswer,
                    ),
                    _PostAction(
                      icon: Icons.forum_outlined,
                      label: 'Chats',
                      onTap: onShare,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _ThreadAction { edit, delete }

class _PostAction extends StatelessWidget {
  const _PostAction({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: colors.muted),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: colors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PulseAnswer extends StatelessWidget {
  const _PulseAnswer({
    required this.thread,
    required this.reply,
    required this.profile,
    required this.canParticipate,
    required this.canManage,
    required this.canAccept,
    required this.forumRepository,
    required this.onVote,
    required this.onEdit,
    required this.onDelete,
    required this.onAccept,
  });

  final ForumThread thread;
  final ForumReply reply;
  final UserProfile profile;
  final bool canParticipate;
  final bool canManage;
  final bool canAccept;
  final ForumRepository forumRepository;
  final ValueChanged<RelevanceVote> onVote;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onAccept;

  RelevanceVote _toggle(RelevanceVote current, RelevanceVote pressed) {
    return current == pressed ? RelevanceVote.none : pressed;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final canVote = canParticipate && reply.authorId != profile.uid;
    final accepted = reply.isAcceptedBy(thread);

    return StreamBuilder<RelevanceVote>(
      stream: forumRepository.watchReplyVote(
        threadId: reply.threadId,
        replyId: reply.id,
        uid: profile.uid,
      ),
      builder: (context, voteSnap) {
        final vote = voteSnap.data ?? RelevanceVote.none;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RelevanceControls(
              score: reply.score,
              vote: vote,
              compact: true,
              enabled: canVote,
              onUp: () => onVote(_toggle(vote, RelevanceVote.up)),
              onDown: () => onVote(_toggle(vote, RelevanceVote.down)),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: colors.glassFill,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: accepted
                            ? AppColors.brandOf(context).withValues(alpha: 0.55)
                            : colors.border,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  reply.authorName,
                                  style: theme.textTheme.labelLarge?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                    letterSpacing: -0.1,
                                    color: colors.ink,
                                  ),
                                ),
                              ),
                              if (accepted)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.brandOf(context)
                                        .withValues(alpha: 0.14),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    'Aceptada',
                                    style: theme.textTheme.labelSmall?.copyWith(
                                      color: AppColors.brandOf(context),
                                      fontWeight: FontWeight.w800,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              if (canManage)
                                PopupMenuButton<_ThreadAction>(
                                  tooltip: 'Opciones',
                                  padding: EdgeInsets.zero,
                                  onSelected: (action) {
                                    switch (action) {
                                      case _ThreadAction.edit:
                                        onEdit();
                                      case _ThreadAction.delete:
                                        onDelete();
                                    }
                                  },
                                  itemBuilder: (context) => const [
                                    PopupMenuItem(
                                      value: _ThreadAction.edit,
                                      child: Text('Editar'),
                                    ),
                                    PopupMenuItem(
                                      value: _ThreadAction.delete,
                                      child: Text('Eliminar'),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            reply.body,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              fontSize: 14.5,
                              height: 1.4,
                              fontWeight: FontWeight.w500,
                              color: colors.ink.withValues(alpha: 0.92),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, top: 5),
                    child: Row(
                      children: [
                        Text(
                          formatRelativeTime(reply.createdAt),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colors.muted,
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                            letterSpacing: 0.2,
                          ),
                        ),
                        if (canAccept) ...[
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: onAccept,
                            style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              accepted ? 'Quitar aceptación' : 'Aceptar',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _CommentComposerBar extends StatelessWidget {
  const _CommentComposerBar({
    required this.canPost,
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.profile,
    required this.fieldRadius,
    required this.onSend,
  });

  final bool canPost;
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final UserProfile profile;
  final BorderRadius fieldRadius;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return Material(
      color: colors.sheet.withValues(alpha: 0.96),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: colors.border)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: canPost
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      ForumAvatar(
                        name: profile.displayName?.trim().isNotEmpty == true
                            ? profile.displayName!
                            : (profile.email ?? 'Tú'),
                        photoUrl: profile.photoUrl,
                        size: 36,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: controller,
                          focusNode: focusNode,
                          minLines: 1,
                          maxLines: 4,
                          textCapitalization: TextCapitalization.sentences,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => onSend(),
                          decoration: InputDecoration(
                            hintText: 'Escribe una respuesta…',
                            filled: true,
                            fillColor: colors.glassFill,
                            border: OutlineInputBorder(
                              borderRadius: fieldRadius,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: fieldRadius,
                              borderSide: BorderSide(color: colors.border),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: fieldRadius,
                              borderSide: BorderSide(
                                color: AppColors.brandOf(context),
                                width: 1.4,
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: sending ? null : onSend,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(48, 48),
                          padding: const EdgeInsets.all(12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: sending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 20),
                      ),
                    ],
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: AppSpacing.sm,
                    ),
                    child: Text(
                      'Regístrate para responder en la comunidad.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
