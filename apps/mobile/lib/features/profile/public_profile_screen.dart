import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/layout/pulse_constrained.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/social_repository.dart';
import '../../users/user_profile.dart';
import '../chats/chat_conversation_screen.dart';
import '../chats/chat_repository.dart';
import '../forums/forum_models.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import 'widgets/profile_social_header.dart';

class PublicProfileScreen extends StatefulWidget {
  const PublicProfileScreen({
    super.key,
    required this.uid,
    required this.viewer,
    this.socialRepository,
    this.chatRepository,
    this.forumRepository,
  });

  final String uid;
  final UserProfile viewer;
  final SocialRepository? socialRepository;
  final ChatRepository? chatRepository;
  final ForumRepository? forumRepository;

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
  late final SocialRepository _social =
      widget.socialRepository ?? SocialRepository();
  late final ChatRepository _chats =
      widget.chatRepository ?? ChatRepository();
  late final ForumRepository _forums =
      widget.forumRepository ?? ForumRepository();

  UserProfile? _person;
  SocialRelationship? _rel;
  List<ForumThread> _threads = const [];
  StreamSubscription<ForumThreadPage>? _postsSub;
  var _loading = true;
  var _postsLoading = true;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _reload();
    _listenPosts();
  }

  @override
  void dispose() {
    _postsSub?.cancel();
    super.dispose();
  }

  void _listenPosts() {
    _listenPostsFor(widget.uid);
  }

  void _listenPostsFor(String authorId) {
    _postsSub?.cancel();
    _postsSub = _forums
        .watchThreads(
          authorId: authorId,
          sort: ForumSort.recent,
          limit: 24,
        )
        .listen(
          (page) {
            if (!mounted) return;
            setState(() {
              _threads = page.threads;
              _postsLoading = false;
            });
          },
          onError: (_) {
            if (!mounted) return;
            setState(() => _postsLoading = false);
          },
        );
  }

  Future<void> _reload() async {
    try {
      final person = await _social.fetchPublicProfile(widget.uid);
      if (!mounted) return;
      SocialRelationship? rel;
      if (person != null) {
        try {
          rel = await _social.getRelationship(person.uid);
        } catch (_) {
          rel = SocialRelationship(
            status: SocialStatus.none,
            muted: false,
            blockedByMe: false,
            isSelf: person.uid == widget.viewer.uid,
          );
        }
      }
      if (!mounted) return;
      setState(() {
        _person = person;
        _rel = rel;
        _loading = false;
      });
      if (person != null && person.uid != widget.uid) {
        _listenPostsFor(person.uid);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      await _reload();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openDm() async {
    final person = _person;
    if (person == null) return;
    setState(() => _busy = true);
    try {
      final chat = await _chats.getOrCreateDm(
        me: widget.viewer,
        other: person,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatConversationScreen(
            chat: chat,
            profile: widget.viewer,
            chatRepository: _chats,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openThread(ForumThread thread) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: thread.id,
          profile: widget.viewer,
          forumRepository: _forums,
          chatRepository: _chats,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final person = _person;
    final rel = _rel;
    final isSelf =
        rel?.isSelf == true ||
        (person != null && widget.viewer.uid == person.uid);
    final posts = _threads.length;
    final replies = _threads.fold<int>(0, (sum, item) => sum + item.replyCount);
    final likes = _threads.fold<int>(
      0,
      (sum, item) => sum + (item.score < 0 ? 0 : item.score),
    );

    return PulseScaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : person == null
              ? Center(child: Text(l10n.memberNotFound))
              : PulseConstrained(
                  maxWidth: PulseContentWidth.feed,
                  padding: EdgeInsets.zero,
                  child: RefreshIndicator(
                    onRefresh: _reload,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(
                        parent: BouncingScrollPhysics(),
                      ),
                      padding: EdgeInsets.zero,
                      children: [
                        ProfileSocialHeader(
                          person: person,
                          posts: posts,
                          replies: replies,
                          likes: likes,
                          topBar: Align(
                            alignment: Alignment.centerLeft,
                            child: IconButton(
                              tooltip: MaterialLocalizations.of(context)
                                  .backButtonTooltip,
                              style: IconButton.styleFrom(
                                backgroundColor:
                                    colors.glassFill.withValues(alpha: 0.7),
                                foregroundColor: colors.ink,
                              ),
                              onPressed: () => Navigator.of(context).maybePop(),
                              icon: const Icon(Icons.arrow_back_rounded),
                            ),
                          ),
                          actions: isSelf
                              ? null
                              : _ActionChips(
                                  busy: _busy,
                                  rel: rel,
                                  l10n: l10n,
                                  onAdd: () =>
                                      _run(() => _social.sendRequest(widget.uid)),
                                  onCancel: () => _run(
                                    () => _social.cancelRequest(widget.uid),
                                  ),
                                  onAccept: () => _run(
                                    () => _social.acceptRequest(widget.uid),
                                  ),
                                  onDecline: () => _run(
                                    () => _social.declineRequest(widget.uid),
                                  ),
                                  onMessage: _openDm,
                                  onRemove: () => _run(
                                    () => _social.removeContact(widget.uid),
                                  ),
                                  onMute: () => _run(
                                    () => _social.setMuted(
                                      widget.uid,
                                      muted: !(rel?.muted ?? false),
                                    ),
                                  ),
                                  onBlock: () => _run(
                                    () => _social.setBlocked(
                                      widget.uid,
                                      blocked: !(rel?.blockedByMe ?? false),
                                    ),
                                  ),
                                ),
                        ),
                        ProfilePostsSection(
                          threads: _threads,
                          loading: _postsLoading,
                          onOpenThread: _openThread,
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}

class _ActionChips extends StatelessWidget {
  const _ActionChips({
    required this.busy,
    required this.rel,
    required this.l10n,
    required this.onAdd,
    required this.onCancel,
    required this.onAccept,
    required this.onDecline,
    required this.onMessage,
    required this.onRemove,
    required this.onMute,
    required this.onBlock,
  });

  final bool busy;
  final SocialRelationship? rel;
  final AppLocalizations l10n;
  final VoidCallback onAdd;
  final VoidCallback onCancel;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onMessage;
  final VoidCallback onRemove;
  final VoidCallback onMute;
  final VoidCallback onBlock;

  ButtonStyle get _compact => OutlinedButton.styleFrom(
        visualDensity: VisualDensity.compact,
        minimumSize: const Size(0, 36),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      );

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.end,
      children: [
        if (rel?.status == SocialStatus.none && rel?.blockedByMe != true)
          FilledButton(
            onPressed: busy ? null : onAdd,
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(l10n.memberAddContact),
          ),
        if (rel?.status == SocialStatus.outgoing)
          OutlinedButton(
            onPressed: busy ? null : onCancel,
            style: _compact,
            child: Text(l10n.memberCancelRequest),
          ),
        if (rel?.status == SocialStatus.incoming) ...[
          FilledButton(
            onPressed: busy ? null : onAccept,
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(l10n.memberAcceptRequest),
          ),
          OutlinedButton(
            onPressed: busy ? null : onDecline,
            style: _compact,
            child: Text(l10n.memberDeclineRequest),
          ),
        ],
        if (rel?.status == SocialStatus.contact)
          FilledButton(
            onPressed: busy ? null : onMessage,
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(l10n.memberMessage),
          ),
        PopupMenuButton<String>(
          enabled: !busy,
          tooltip: l10n.memberProfileTitle,
          onSelected: (value) {
            switch (value) {
              case 'remove':
                onRemove();
              case 'mute':
                onMute();
              case 'block':
                onBlock();
            }
          },
          itemBuilder: (context) => [
            if (rel?.status == SocialStatus.contact)
              PopupMenuItem(
                value: 'remove',
                child: Text(l10n.memberRemoveContact),
              ),
            if (rel?.blockedByMe != true)
              PopupMenuItem(
                value: 'mute',
                child: Text(
                  rel?.muted == true ? l10n.memberUnmute : l10n.memberMute,
                ),
              ),
            PopupMenuItem(
              value: 'block',
              child: Text(
                rel?.blockedByMe == true
                    ? l10n.memberUnblock
                    : l10n.memberBlock,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
