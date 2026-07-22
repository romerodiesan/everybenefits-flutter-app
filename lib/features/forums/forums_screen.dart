import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/users.dart';
import 'create_thread_screen.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'forum_tags.dart';
import '../chats/chat_repository.dart';
import 'thread_detail_screen.dart';
import 'widgets/feed_composer_bar.dart';
import 'widgets/feed_post_card.dart';
import 'widgets/forum_filter_chip.dart';
import 'widgets/share_to_chat_sheet.dart';

/// Community home — searchable Q&A feed with relevance sorting.
class ForumsScreen extends StatefulWidget {
  const ForumsScreen({
    super.key,
    required this.profile,
    this.forumRepository,
    this.chatRepository,
    this.embeddedInShell = false,
  });

  final UserProfile profile;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final bool embeddedInShell;

  @override
  State<ForumsScreen> createState() => _ForumsScreenState();
}

class _ForumsScreenState extends State<ForumsScreen> {
  late final ForumRepository _repository =
      widget.forumRepository ?? ForumRepository();
  final _searchController = TextEditingController();

  List<ForumThread> _threads = const [];
  Object? _cursor;
  bool _hasMore = false;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  String? _selectedTag;
  bool _mineOnly = false;
  ForumSort _sort = ForumSort.recent;
  String _query = '';
  bool _searchOpen = false;

  bool get _canPost => canParticipateInForums(
        role: widget.profile.role,
        isAnonymous: widget.profile.isAnonymous,
      );

  bool get _isSearching => _query.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _loadingMore = false;
      _error = null;
      _threads = const [];
      _cursor = null;
      _hasMore = false;
    });
    try {
      final page = await _repository.queryThreads(
        tag: _selectedTag,
        authorId: _mineOnly ? widget.profile.uid : null,
        sort: _sort,
      );
      if (!mounted) return;
      setState(() {
        _threads = page.threads;
        _cursor = page.nextCursor;
        _hasMore = page.hasMore;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = friendlyForumError(error);
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore || _loading) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _repository.queryThreads(
        tag: _selectedTag,
        authorId: _mineOnly ? widget.profile.uid : null,
        sort: _sort,
        cursor: _cursor,
      );
      if (!mounted) return;
      setState(() {
        _threads = [..._threads, ...page.threads];
        _cursor = page.nextCursor;
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyForumError(error))),
      );
    }
  }

  void _setSelectedTag(String? tag) {
    if (_selectedTag == tag) return;
    setState(() => _selectedTag = tag);
    _reload();
  }

  void _setMineOnly(bool value) {
    if (_mineOnly == value) return;
    setState(() => _mineOnly = value);
    _reload();
  }

  void _setSort(ForumSort value) {
    if (_sort == value) return;
    setState(() => _sort = value);
    _reload();
  }

  Future<void> _openCreate() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CreateThreadScreen(
          profile: widget.profile,
          forumRepository: _repository,
          initialTags: _selectedTag == null ? const [] : [_selectedTag!],
        ),
      ),
    );
    if (mounted) await _reload();
  }

  Future<void> _openThread(ForumThread thread) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: thread.id,
          profile: widget.profile,
          forumRepository: _repository,
          chatRepository: widget.chatRepository,
        ),
      ),
    );
    if (mounted) await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final visible = filterAndSortThreads(
      _threads,
      query: _query,
      sort: _sort,
    );

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
            onSelected: _setSort,
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
          if (_selectedTag != null || _mineOnly || _isSearching)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                4,
                AppSpacing.md,
                0,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _activeFilterLabel,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  if (_selectedTag != null || _mineOnly)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _selectedTag = null;
                          _mineOnly = false;
                        });
                        _reload();
                      },
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: const Text('Limpiar'),
                    ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 6, bottom: 2),
            child: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                children: [
                  ForumFilterChip(
                    label: 'Mías',
                    leading: Icons.person_outline_rounded,
                    selected: _mineOnly,
                    onTap: () => _setMineOnly(!_mineOnly),
                  ),
                  const SizedBox(width: 8),
                  ForumFilterChip(
                    label: _sort == ForumSort.relevant
                        ? 'Relevantes'
                        : 'Recientes',
                    leading: Icons.swap_vert_rounded,
                    selected: false,
                    onTap: () {
                      _setSort(
                        _sort == ForumSort.recent
                            ? ForumSort.relevant
                            : ForumSort.recent,
                      );
                    },
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: VerticalDivider(
                      width: 1,
                      thickness: 1,
                      indent: 8,
                      endIndent: 8,
                      color: colors.border,
                    ),
                  ),
                  for (final tag in kSuggestedForumTags) ...[
                    ForumFilterChip(
                      label: tag,
                      showHash: true,
                      selected: _selectedTag == tag,
                      onTap: () {
                        _setSelectedTag(
                          _selectedTag == tag ? null : tag,
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
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
          Expanded(child: _buildFeed(context, visible)),
        ],
      ),
    );
  }

  String get _activeFilterLabel {
    final parts = <String>[];
    if (_mineOnly) parts.add('Tus preguntas');
    if (_selectedTag != null) parts.add('#$_selectedTag');
    if (_isSearching) parts.add('búsqueda en resultados cargados');
    if (parts.isEmpty) return '';
    return parts.join(' · ');
  }

  Widget _buildFeed(BuildContext context, List<ForumThread> visible) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return EmptyState(
        mark: '!',
        title: 'No se pudo cargar',
        subtitle: _error!,
        actionLabel: 'Reintentar',
        onAction: _reload,
      );
    }
    if (_threads.isEmpty) {
      return EmptyState(
        mark: 'P',
        title: _mineOnly ? 'Aún no has preguntado' : 'El feed está en calma',
        subtitle: _mineOnly
            ? 'Publica tu primera pregunta para verla aquí.'
            : 'Sé el primero en publicar una pregunta.',
        actionLabel: _canPost ? 'Nueva pregunta' : null,
        onAction: _canPost ? _openCreate : null,
      );
    }
    if (visible.isEmpty) {
      return EmptyState(
        mark: '?',
        title: 'Sin coincidencias',
        subtitle: _isSearching
            ? 'No hay preguntas para “${_query.trim()}”.'
            : 'Prueba otro filtro o tag.',
      );
    }

    final showLoadMore = _hasMore && !_isSearching;
    final double bottomPad = widget.embeddedInShell
        ? (_canPost ? 108.0 : 88.0)
        : (_canPost ? 88.0 : AppSpacing.xl.toDouble());
    return ListView.builder(
      padding: EdgeInsets.only(
        top: AppSpacing.xs,
        bottom: bottomPad,
      ),
      itemCount: visible.length + (showLoadMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= visible.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            child: Center(
              child: _loadingMore
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : TextButton(
                      onPressed: _loadMore,
                      child: const Text('Cargar más'),
                    ),
            ),
          );
        }
        final thread = visible[index];
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
              chatRepository: widget.chatRepository,
            ),
            onTagTap: _setSelectedTag,
          ),
        );
      },
    );
  }
}
