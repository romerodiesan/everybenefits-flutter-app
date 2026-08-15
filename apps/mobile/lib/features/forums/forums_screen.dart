import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_constrained.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/empty_state.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import '../chats/chat_repository.dart';
import '../notifications/notification_bell_button.dart';
import '../promo/promo_banner_models.dart';
import '../promo/promo_banner_repository.dart';
import '../promo/widgets/promo_banner_slot.dart';
import '../polls/widgets/poll_slot.dart';
import '../profile/public_profile_screen.dart';
import 'create_thread_screen.dart';
import 'forum_audience.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'forum_spotlight.dart';
import 'saved_threads.dart';
import 'thread_detail_screen.dart';
import 'widgets/feed_composer_bar.dart';
import 'widgets/feed_post_card.dart';
import 'widgets/forum_feed_mode_bar.dart';
import 'widgets/forum_filter_chip.dart';
import 'widgets/forum_spotlight_card.dart';
import 'widgets/share_to_chat_sheet.dart';

/// Community home — searchable Q&A feed with Fresh / Pulse / Saved modes.
class ForumsScreen extends StatefulWidget {
  const ForumsScreen({
    super.key,
    required this.profile,
    this.forumRepository,
    this.chatRepository,
    this.savedThreads,
    this.promoBannerRepository,
    this.audienceSizeFetcher,
    this.embeddedInShell = false,
    this.notificationUnread = 0,
    this.onOpenNotifications,
  });

  final UserProfile profile;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final SavedThreadsStore? savedThreads;
  final PromoBannerRepository? promoBannerRepository;
  /// Injected in tests; production hits `platformStats/overview`.
  final Future<int> Function()? audienceSizeFetcher;
  final bool embeddedInShell;
  final int notificationUnread;
  final VoidCallback? onOpenNotifications;

  @override
  State<ForumsScreen> createState() => ForumsScreenState();
}

class ForumsScreenState extends State<ForumsScreen> {
  late final ForumRepository _repository =
      widget.forumRepository ?? ForumRepository();
  late final SavedThreadsStore _saved =
      widget.savedThreads ?? SavedThreadsStore();
  final _searchController = TextEditingController();

  List<ForumThread> _threads = const [];
  Object? _cursor;
  bool _hasMore = false;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  String? _selectedTag;
  bool _mineOnly = false;
  ForumFeedMode _mode = ForumFeedMode.fresh;
  String _query = '';
  bool _searchOpen = false;
  int _audienceSize = 0;
  String? _selectedThreadId;

  /// Threads used to rank discovery tags (kept when filtering by tag / mine).
  List<ForumThread> _tagCatalog = const [];

  /// Viewer's like state per thread (thread vote up == like).
  Map<String, RelevanceVote> _threadVotes = {};
  String? _threadVoteKey;
  StreamSubscription<ForumThreadPage>? _liveSub;

  ForumSort get _sort =>
      _mode == ForumFeedMode.pulse ? ForumSort.relevant : ForumSort.recent;

  bool get _canPost {
    final access = AccessScope.accessOf(
      context,
      fallbackRoleId: widget.profile.roleId,
    );
    return canParticipateInForums(
      roleOrPermissions: access,
      isAnonymous: widget.profile.isAnonymous,
    );
  }

  bool get _isSearching => _query.trim().isNotEmpty;

  bool get _isSavedMode => _mode == ForumFeedMode.saved;

  @override
  void initState() {
    super.initState();
    _saved.addListener(_onSavedChanged);
    _boot();
  }

  Future<void> _boot() async {
    await _saved.warm();
    final fetch = widget.audienceSizeFetcher ?? fetchForumAudienceSize;
    try {
      _audienceSize = await fetch();
    } catch (_) {
      _audienceSize = 0;
    }
    if (!mounted) return;
    await _reload();
  }

  void _onSavedChanged() {
    if (!mounted) return;
    if (_isSavedMode) {
      _reload();
    } else {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _liveSub?.cancel();
    _saved.removeListener(_onSavedChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    await _liveSub?.cancel();
    _liveSub = null;
    setState(() {
      _loading = true;
      _loadingMore = false;
      _error = null;
      _threads = const [];
      _cursor = null;
      _hasMore = false;
    });
    try {
      if (_isSavedMode) {
        final ids = (await _saved.readIds()).toList();
        final threads = await _repository.fetchThreadsByIds(ids);
        final found = threads.map((t) => t.id).toSet();
        for (final id in ids) {
          if (!found.contains(id)) {
            await _saved.remove(id);
          }
        }
        if (!mounted) return;
        setState(() {
          _threads = threads;
          _cursor = null;
          _hasMore = false;
          _loading = false;
          _refreshTagCatalog();
        });
        _ensureThreadVotes();
        return;
      }

      _liveSub = _repository
          .watchThreads(
            tag: _selectedTag,
            authorId: _mineOnly ? widget.profile.uid : null,
            sort: _sort,
          )
          .listen(
            (page) {
              if (!mounted) return;
              final liveIds = page.threads.map((t) => t.id).toSet();
              final extras = _threads
                  .where((t) => !liveIds.contains(t.id))
                  .toList();
              setState(() {
                _threads = [...page.threads, ...extras];
                _cursor = page.nextCursor;
                _hasMore = page.hasMore;
                _loading = false;
                _error = null;
                _refreshTagCatalog();
              });
              _ensureThreadVotes();
            },
            onError: (Object error) {
              if (!mounted) return;
              setState(() {
                _error = friendlyForumError(error, context.l10n);
                _loading = false;
              });
            },
          );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = friendlyForumError(error, context.l10n);
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isSavedMode || _loadingMore || !_hasMore || _loading) return;
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
        _refreshTagCatalog();
      });
      _ensureThreadVotes();
    } catch (error) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyForumError(error, context.l10n))),
      );
    }
  }

  void _refreshTagCatalog() {
    if (_selectedTag == null && !_mineOnly) {
      _tagCatalog = _threads;
      return;
    }
    if (_tagCatalog.isEmpty) {
      _tagCatalog = _threads;
    }
  }

  List<ForumTagStat> get _rankedTags {
    final source = _tagCatalog.isNotEmpty ? _tagCatalog : _threads;
    return rankForumTags(source, sort: _sort);
  }

  void _setSelectedTag(String? tag) {
    if (_selectedTag == tag) return;
    setState(() => _selectedTag = tag);
    if (!_isSavedMode) _reload();
  }

  void _setMineOnly(bool value) {
    if (_mineOnly == value) return;
    setState(() => _mineOnly = value);
    if (!_isSavedMode) _reload();
  }

  void _setMode(ForumFeedMode value) {
    if (_mode == value) return;
    setState(() => _mode = value);
    _reload();
  }

  Future<void> _softRefresh() async {
    try {
      if (_isSavedMode) {
        final ids = (await _saved.readIds()).toList();
        final threads = await _repository.fetchThreadsByIds(ids);
        if (!mounted) return;
        setState(() {
          _threads = threads;
          _cursor = null;
          _hasMore = false;
          _refreshTagCatalog();
        });
      } else {
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
          _refreshTagCatalog();
        });
      }
      _threadVoteKey = null;
      _ensureThreadVotes();
    } catch (_) {
      // Keep current list on background refresh failure.
    }
  }

  Future<void> _ensureThreadVotes() async {
    if (!_canPost) return;
    final ids = _threads.map((t) => t.id).toList()..sort();
    final key = ids.join('|');
    if (key == _threadVoteKey) return;
    _threadVoteKey = key;
    if (ids.isEmpty) {
      if (mounted) setState(() => _threadVotes = {});
      return;
    }
    try {
      final votes = await _repository.fetchThreadVotes(
        uid: widget.profile.uid,
        threadIds: ids,
      );
      if (!mounted || _threadVoteKey != key) return;
      setState(() => _threadVotes = votes);
    } catch (_) {
      // Likes are non-critical; buttons stay at "not liked".
    }
  }

  Future<void> _toggleLike(ForumThread thread) async {
    final l10n = context.l10n;
    if (!_canPost) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errForumRegisterToVote)),
      );
      return;
    }
    if (thread.authorId == widget.profile.uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errForumCantVoteOwnQuestion)),
      );
      return;
    }
    final prev = _threadVotes[thread.id] ?? RelevanceVote.none;
    final next =
        prev == RelevanceVote.up ? RelevanceVote.none : RelevanceVote.up;
    final delta = next.value - prev.value;
    PulseHaptics.light();
    setState(() {
      _threadVotes = {..._threadVotes, thread.id: next};
      _threads = [
        for (final t in _threads)
          t.id == thread.id ? t.copyWith(score: t.score + delta) : t,
      ];
    });
    try {
      await _repository.setThreadRelevance(
        thread: thread,
        actor: widget.profile,
        vote: next,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _threadVotes = {..._threadVotes, thread.id: prev};
        _threads = [
          for (final t in _threads)
            t.id == thread.id ? t.copyWith(score: t.score - delta) : t,
        ];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyForumError(error, context.l10n))),
      );
    }
  }

  Future<void> _toggleSave(ForumThread thread) async {
    PulseHaptics.selection();
    await _saved.toggle(thread.id);
  }

  Future<void> openCreate() async {
    if (PulseWindowClass.of(context).useRail) {
      await showDialog<void>(
        context: context,
        builder: (ctx) {
          return Dialog(
            insetPadding: const EdgeInsets.all(24),
            child: SizedBox(
              width: PulseContentWidth.form,
              height: 640,
              child: CreateThreadScreen(
                profile: widget.profile,
                forumRepository: _repository,
                initialTags: _selectedTag == null ? const [] : [_selectedTag!],
              ),
            ),
          );
        },
      );
    } else {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CreateThreadScreen(
            profile: widget.profile,
            forumRepository: _repository,
            initialTags: _selectedTag == null ? const [] : [_selectedTag!],
          ),
        ),
      );
    }
    if (mounted) await _softRefresh();
  }

  void openThreadById(String threadId) {
    if (pulseUseMasterDetail(context)) {
      setState(() => _selectedThreadId = threadId);
      return;
    }
    _pushThread(threadId);
  }

  Future<void> _openThread(ForumThread thread) async {
    if (pulseUseMasterDetail(context)) {
      setState(() => _selectedThreadId = thread.id);
      return;
    }
    await _pushThread(thread.id);
  }

  Future<void> _pushThread(String threadId) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: threadId,
          profile: widget.profile,
          forumRepository: _repository,
          chatRepository: widget.chatRepository,
        ),
      ),
    );
    if (mounted) await _softRefresh();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final visible = filterAndSortThreads(
      _threads,
      query: _query,
      sort: _sort,
    );
    final spotlight = (!_isSavedMode && !_loading)
        ? pickForumSpotlight(visible, _audienceSize)
        : null;
    final feedThreads = spotlight == null
        ? visible
        : visible.where((t) => t.id != spotlight.id).toList();

    return PulseScaffold(
      appBar: AppBar(
        title: _searchOpen
            ? TextField(
                controller: _searchController,
                autofocus: true,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l10n.forumsSearchHint,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  errorBorder: InputBorder.none,
                  focusedErrorBorder: InputBorder.none,
                  filled: false,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                  hintStyle: theme.textTheme.titleMedium?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                onChanged: (value) => setState(() => _query = value),
              )
            : Text(
                l10n.forumsTitle,
                style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
              ),
        actions: [
          IconButton(
            tooltip: _searchOpen
                ? l10n.forumsSearchClose
                : l10n.forumsSearchOpen,
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
          if (widget.onOpenNotifications != null)
            NotificationBellButton(
              unreadCount: widget.notificationUnread,
              onPressed: widget.onOpenNotifications!,
            ),
        ],
      ),
      floatingActionButton: _canPost && !widget.embeddedInShell
          ? FloatingActionButton(
              heroTag: 'fab-inicio-compose',
              onPressed: () {
                PulseHaptics.light();
                openCreate();
              },
              tooltip: l10n.fabNewQuestion,
              child: const Icon(Icons.question_mark_rounded),
            )
          : null,
      body: _wrapFeed(
        context,
        feed: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ForumFeedModeBar(mode: _mode, onChanged: _setMode),
          if (!_isSavedMode) ...[
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
                        _activeFilterLabel(l10n),
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
                        child: Text(l10n.forumsClearFilters),
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  children: [
                    ForumFilterChip(
                      label: l10n.forumsFilterMine,
                      leading: Icons.person_outline_rounded,
                      selected: _mineOnly,
                      onTap: () => _setMineOnly(!_mineOnly),
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
                    for (final tag in _rankedTags) ...[
                      ForumFilterChip(
                        label: tag.tag,
                        showHash: true,
                        selected: _selectedTag == tag.tag,
                        onTap: () {
                          _setSelectedTag(
                            _selectedTag == tag.tag ? null : tag.tag,
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
                onTap: openCreate,
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
                  l10n.forumsReadOnlyBanner,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.muted,
                    fontSize: 13,
                  ),
                ),
              ),
          ],
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: KeyedSubtree(
                key: ValueKey<String>(
                  _loading
                      ? 'loading'
                      : (_error != null
                          ? 'error'
                          : (_threads.isEmpty ? 'empty' : 'feed')),
                ),
                child: _buildFeed(
                  context,
                  l10n,
                  feedThreads,
                  spotlight: spotlight,
                ),
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _wrapFeed(BuildContext context, {required Widget feed}) {
    if (!pulseUseMasterDetail(context)) return feed;
    final l10n = context.l10n;
    final id = _selectedThreadId;
    return PulseSplitView(
      masterWidth: 400,
      master: feed,
      detail: id == null
          ? EmptyState(
              mark: 'Q',
              title: l10n.forumsSelectTitle,
              subtitle: l10n.forumsSelectSubtitle,
            )
          : ThreadDetailScreen(
              key: ValueKey(id),
              threadId: id,
              profile: widget.profile,
              forumRepository: _repository,
              chatRepository: widget.chatRepository,
              embedded: true,
            ),
    );
  }

  String _activeFilterLabel(AppLocalizations l10n) {
    final parts = <String>[];
    if (_mineOnly) parts.add(l10n.forumsFilterYourQuestions);
    if (_selectedTag != null) parts.add('#$_selectedTag');
    if (_isSearching) parts.add(l10n.forumsFilterSearchLoaded);
    if (parts.isEmpty) return '';
    return parts.join(' · ');
  }

  Widget _buildFeed(
    BuildContext context,
    AppLocalizations l10n,
    List<ForumThread> visible, {
    ForumThread? spotlight,
  }) {
    if (_loading) {
      return const PulseFeedSkeleton();
    }
    if (_error != null) {
      return EmptyState(
        mark: '!',
        title: l10n.forumsLoadErrorTitle,
        subtitle: _error!,
        actionLabel: l10n.actionRetry,
        onAction: _reload,
      );
    }

    final headers = <Widget>[];
    if (!_isSavedMode) {
      headers.add(
        PromoBannerSlot(
          surface: PromoBannerSurface.home,
          profile: widget.profile,
          repository: widget.promoBannerRepository,
          forumRepository: _repository,
          chatRepository: widget.chatRepository,
        ),
      );
      headers.add(
        PollSlot(
          surface: PromoBannerSurface.home,
          profile: widget.profile,
        ),
      );
      if (PulseWindowClass.of(context).useRail) {
        headers.add(
          PromoBannerSlot(
            surface: PromoBannerSurface.rail,
            profile: widget.profile,
            repository: widget.promoBannerRepository,
            forumRepository: _repository,
            chatRepository: widget.chatRepository,
          ),
        );
        headers.add(
          PollSlot(
            surface: PromoBannerSurface.rail,
            profile: widget.profile,
          ),
        );
      }
      if (spotlight != null) {
        headers.add(
          ForumSpotlightCard(
            thread: spotlight,
            onTap: () => _openThread(spotlight),
          ),
        );
      }
    }

    if (_threads.isEmpty) {
      return RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(
          top: AppSpacing.xs,
          bottom: widget.embeddedInShell
              ? pulseShellListBottomPad(context, hasFab: _canPost)
              : (_canPost ? 88.0 : AppSpacing.xl),
        ),
        children: [
          ...headers,
          EmptyState(
            mark: 'P',
            title: _isSavedMode
                ? l10n.forumsSavedEmptyTitle
                : (_mineOnly
                    ? l10n.forumsEmptyMineTitle
                    : l10n.forumsEmptyFeedTitle),
            subtitle: _isSavedMode
                ? l10n.forumsSavedEmptySubtitle
                : (_mineOnly
                    ? l10n.forumsEmptyMineSubtitle
                    : l10n.forumsEmptyFeedSubtitle),
            actionLabel: !_isSavedMode && _canPost ? l10n.fabNewQuestion : null,
            onAction: !_isSavedMode && _canPost ? openCreate : null,
          ),
        ],
      ),
      );
    }
    if (visible.isEmpty) {
      return RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(
          top: AppSpacing.xs,
          bottom: widget.embeddedInShell
              ? pulseShellListBottomPad(context, hasFab: _canPost)
              : (_canPost ? 88.0 : AppSpacing.xl),
        ),
        children: [
          ...headers,
          EmptyState(
            mark: '?',
            title: l10n.forumsNoMatchesTitle,
            subtitle: _isSearching
                ? l10n.forumsNoMatchesQuery(_query.trim())
                : l10n.forumsNoMatchesFilter,
          ),
        ],
      ),
      );
    }

    final showLoadMore = !_isSavedMode && _hasMore && !_isSearching;
    final double bottomPad = widget.embeddedInShell
        ? pulseShellListBottomPad(context, hasFab: _canPost)
        : (_canPost ? 88.0 : AppSpacing.xl);
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.only(
        top: AppSpacing.xs,
        bottom: bottomPad,
      ),
      itemCount: headers.length + visible.length + (showLoadMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index < headers.length) {
          return headers[index];
        }
        final feedIndex = index - headers.length;
        if (feedIndex >= visible.length) {
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
                      child: Text(l10n.forumsLoadMore),
                    ),
            ),
          );
        }
        final thread = visible[feedIndex];
        return Padding(
          key: ValueKey(thread.id),
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: FeedPostCard(
            thread: thread,
            selected: _selectedThreadId == thread.id,
            onTap: () => _openThread(thread),
            liked: (_threadVotes[thread.id] ?? RelevanceVote.none) ==
                RelevanceVote.up,
            saved: _saved.isSavedSync(thread.id),
            onLike: () => _toggleLike(thread),
            onComment: () => _openThread(thread),
            onToggleSave: () => _toggleSave(thread),
            onShare: () {
              PulseHaptics.light();
              showShareToChatSheet(
                context: context,
                thread: thread,
                profile: widget.profile,
                forumRepository: _repository,
                chatRepository: widget.chatRepository,
              );
            },
            onTagTap: _setSelectedTag,
            onAuthorTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => PublicProfileScreen(
                    uid: thread.authorId,
                    viewer: widget.profile,
                    forumRepository: _repository,
                    chatRepository: widget.chatRepository,
                  ),
                ),
              );
            },
          ),
        );
      },
      ),
    );
  }
}
