import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/mesh_background.dart';
import '../../users/users.dart';
import 'create_thread_screen.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'thread_detail_screen.dart';
import 'widgets/feed_composer_bar.dart';
import 'widgets/feed_post_card.dart';

class ForumsScreen extends StatefulWidget {
  const ForumsScreen({
    super.key,
    required this.profile,
    this.forumRepository,
  });

  final UserProfile profile;
  final ForumRepository? forumRepository;

  @override
  State<ForumsScreen> createState() => _ForumsScreenState();
}

class _ForumsScreenState extends State<ForumsScreen> {
  late final ForumRepository _repository =
      widget.forumRepository ?? ForumRepository();
  String? _selectedTag;

  bool get _canPost => canParticipateInForums(
        role: widget.profile.role,
        isAnonymous: widget.profile.isAnonymous,
      );

  void _openCreate() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CreateThreadScreen(
          profile: widget.profile,
          forumRepository: _repository,
          initialTags: _selectedTag == null ? const [] : [_selectedTag!],
        ),
      ),
    );
  }

  void _openThread(ForumThread thread) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MeshBackground(
          child: ThreadDetailScreen(
            threadId: thread.id,
            profile: widget.profile,
            forumRepository: _repository,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Comunidad')),
      floatingActionButton: _canPost
          ? FloatingActionButton(
              onPressed: _openCreate,
              backgroundColor: AppColors.brand,
              foregroundColor: Colors.white,
              tooltip: 'Nueva publicación',
              child: const Icon(Icons.edit_outlined),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_selectedTag != null)
            _ActiveTagFilter(
              tag: _selectedTag!,
              onClear: () => setState(() => _selectedTag = null),
            ),
          if (_canPost)
            FeedComposerBar(
              profile: widget.profile,
              onTap: _openCreate,
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              child: Text(
                'Modo lectura — regístrate para publicar.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.muted,
                  fontSize: 13,
                ),
              ),
            ),
          Expanded(
            child: StreamBuilder<List<ForumThread>>(
              stream: _repository.watchThreads(tag: _selectedTag),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return EmptyState(
                    mark: '!',
                    title: 'No se pudo cargar',
                    subtitle: '${snapshot.error}',
                  );
                }
                final threads = snapshot.data ?? const [];
                if (threads.isEmpty) {
                  return const EmptyState(
                    mark: '01',
                    title: 'Tu feed está vacío',
                    subtitle:
                        'Sé el primero en compartir algo con la comunidad.',
                  );
                }
                return ListView.builder(
                  padding: EdgeInsets.only(
                    top: AppSpacing.xs,
                    bottom: _canPost ? 88 : AppSpacing.xl,
                  ),
                  itemCount: threads.length,
                  itemBuilder: (context, index) {
                    final thread = threads[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: FeedPostCard(
                        thread: thread,
                        onTap: () => _openThread(thread),
                        onTagTap: (tag) =>
                            setState(() => _selectedTag = tag),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveTagFilter extends StatelessWidget {
  const _ActiveTagFilter({
    required this.tag,
    required this.onClear,
  });

  final String tag;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        0,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Filtrado por #$tag',
              style: theme.textTheme.labelLarge?.copyWith(
                color: AppColors.accent,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          TextButton(
            onPressed: onClear,
            child: const Text('Ver todos'),
          ),
        ],
      ),
    );
  }
}
