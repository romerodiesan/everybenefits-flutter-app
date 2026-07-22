import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/users.dart';
import 'create_thread_screen.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'thread_detail_screen.dart';
import 'widgets/feed_composer_bar.dart';
import 'widgets/feed_post_card.dart';
import 'widgets/share_to_chat_sheet.dart';

/// Community home — searchable Q&A feed with relevance sorting.
class ForumsScreen extends StatefulWidget {
  const ForumsScreen({
    super.key,
    required this.profile,
    this.forumRepository,
    this.embeddedInShell = false,
  });

  final UserProfile profile;
  final ForumRepository? forumRepository;
  final bool embeddedInShell;

  @override
  State<ForumsScreen> createState() => _ForumsScreenState();
}

class _ForumsScreenState extends State<ForumsScreen> {
  late final ForumRepository _repository =
      widget.forumRepository ?? ForumRepository();
  final _searchController = TextEditingController();
  String? _selectedTag;
  String _query = '';
  ForumSort _sort = ForumSort.recent;
  bool _searchOpen = false;

  bool get _canPost => canParticipateInForums(
        role: widget.profile.role,
        isAnonymous: widget.profile.isAnonymous,
      );

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

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
        builder: (_) => ThreadDetailScreen(
          threadId: thread.id,
          profile: widget.profile,
          forumRepository: _repository,
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
        title: _searchOpen
            ? TextField(
                controller: _searchController,
                autofocus: true,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Buscar preguntas…',
                  border: InputBorder.none,
                  hintStyle: theme.textTheme.titleMedium?.copyWith(
                    color: colors.muted,
                  ),
                ),
                style: theme.textTheme.titleMedium,
                onChanged: (value) => setState(() => _query = value),
              )
            : Text(
                'Inicio',
                style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
              ),
        actions: [
          IconButton(
            tooltip: _searchOpen ? 'Cerrar búsqueda' : 'Buscar preguntas',
            onPressed: () {
              setState(() {
                _searchOpen = !_searchOpen;
                if (!_searchOpen) {
                  _searchController.clear();
                  _query = '';
                }
              });
            },
            icon: Icon(
              _searchOpen ? Icons.close_rounded : Icons.search_rounded,
            ),
          ),
          PopupMenuButton<ForumSort>(
            tooltip: 'Ordenar',
            initialValue: _sort,
            onSelected: (value) => setState(() => _sort = value),
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: ForumSort.recent,
                child: Text('Más recientes'),
              ),
              PopupMenuItem(
                value: ForumSort.relevant,
                child: Text('Más relevantes'),
              ),
            ],
            icon: const Icon(Icons.sort_rounded),
          ),
        ],
      ),
      floatingActionButton: _canPost
          ? FloatingActionButton(
              heroTag: 'fab-inicio-compose',
              onPressed: _openCreate,
              tooltip: 'Nueva pregunta',
              child: const Icon(Icons.add_rounded),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_selectedTag != null)
            Padding(
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
                      'Filtrado por #$_selectedTag',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: AppColors.brandOf(context),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _selectedTag = null),
                    child: const Text('Ver todos'),
                  ),
                ],
              ),
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
                final threads = filterAndSortThreads(
                  snapshot.data ?? const [],
                  query: _query,
                  sort: _sort,
                );
                if ((snapshot.data ?? const []).isEmpty) {
                  return const EmptyState(
                    mark: 'P',
                    title: 'El feed está en calma',
                    subtitle: 'Sé el primero en publicar una pregunta.',
                  );
                }
                if (threads.isEmpty) {
                  return EmptyState(
                    mark: '?',
                    title: 'Sin coincidencias',
                    subtitle: _query.trim().isEmpty
                        ? 'Prueba otro filtro o tag.'
                        : 'No hay preguntas para “${_query.trim()}”.',
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
                        onComment: () => _openThread(thread),
                        onRelevance: () => _openThread(thread),
                        onShare: () => showShareToChatSheet(
                          context: context,
                          thread: thread,
                          profile: widget.profile,
                          forumRepository: _repository,
                        ),
                        onTagTap: (tag) => setState(() => _selectedTag = tag),
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
