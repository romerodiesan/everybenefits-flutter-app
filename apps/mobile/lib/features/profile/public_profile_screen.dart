import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/layout/pulse_constrained.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/social_repository.dart';
import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import '../chats/chat_conversation_screen.dart';
import '../chats/chat_repository.dart';
import '../forums/forum_models.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import 'widgets/profile_public_extras.dart';
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
  late final ChatRepository _chats = widget.chatRepository ?? ChatRepository();
  late final ForumRepository _forums =
      widget.forumRepository ?? ForumRepository();

  UserProfile? _person;
  SocialRelationship? _rel;
  List<ForumThread> _threads = const [];
  StreamSubscription<ForumThreadPage>? _postsSub;
  var _loading = true;
  var _postsLoading = true;
  var _busy = false;
  var _tab = 0;

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
        .watchThreads(authorId: authorId, sort: ForumSort.recent, limit: 24)
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openDm() async {
    final person = _person;
    if (person == null) return;
    setState(() => _busy = true);
    try {
      final chat = await _chats.getOrCreateDm(me: widget.viewer, other: person);
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
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

  void _openMember(UserProfile person) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicProfileScreen(
          uid: person.uid,
          viewer: widget.viewer,
          socialRepository: _social,
          chatRepository: _chats,
          forumRepository: _forums,
        ),
      ),
    );
  }

  Future<void> _copyLink(UserProfile person) async {
    final l10n = context.l10n;
    await Clipboard.setData(
      ClipboardData(text: memberShareUrl(context, person)),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n.profileLinkCopied)));
  }

  Future<void> _openFollowList(bool followers) async {
    final person = _person;
    if (person == null) return;
    final l10n = context.l10n;
    await showFollowListSheet(
      context: context,
      title: followers ? l10n.profileStatFollowers : l10n.profileStatFollowing,
      empty: followers
          ? l10n.profileFollowersEmpty
          : l10n.profileFollowingEmpty,
      load: () => followers
          ? _social.listFollowers(person.uid)
          : _social.listFollowing(person.uid),
      onOpen: _openMember,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final person = _person;
    final rel = _rel;
    final isSelf =
        rel?.isSelf == true ||
        (person != null && widget.viewer.uid == person.uid);
    final posts = _threads.length;

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
                  clipBehavior: Clip.none,
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: EdgeInsets.zero,
                  children: [
                    ProfileSocialHeader(
                      person: person,
                      posts: posts,
                      roleLabel: roleLabelForId(person.roleId, l10n),
                      followerCount: person.followerCount,
                      followingCount: person.followingCount,
                      onFollowersTap: () => _openFollowList(true),
                      onFollowingTap: () => _openFollowList(false),
                      portraitMenu: isSelf
                          ? null
                          : PopupMenuButton<String>(
                              enabled: !_busy,
                              tooltip: l10n.memberProfileTitle,
                              style: IconButton.styleFrom(
                                backgroundColor: const Color(0x6B0C0D10),
                                foregroundColor: const Color(0xFFF4F3F0),
                              ),
                              onSelected: (value) {
                                switch (value) {
                                  case 'copy':
                                    _copyLink(person);
                                  case 'remove':
                                    _run(
                                      () => _social.removeContact(person.uid),
                                    );
                                  case 'mute':
                                    _run(
                                      () => _social.setMuted(
                                        person.uid,
                                        muted: !(rel?.muted ?? false),
                                      ),
                                    );
                                  case 'block':
                                    _run(
                                      () => _social.setBlocked(
                                        person.uid,
                                        blocked: !(rel?.blockedByMe ?? false),
                                      ),
                                    );
                                  case 'report':
                                    final messenger = ScaffoldMessenger.of(
                                      context,
                                    );
                                    final sent = l10n.profileReportSent;
                                    showReportMemberSheet(
                                      context: context,
                                      onSubmit: (reason, details) =>
                                          _run(() async {
                                            await _social.reportMember(
                                              person.uid,
                                              reason: reason,
                                              details: details,
                                            );
                                            messenger.showSnackBar(
                                              SnackBar(content: Text(sent)),
                                            );
                                          }),
                                    );
                                }
                              },
                              itemBuilder: (context) => [
                                PopupMenuItem(
                                  value: 'copy',
                                  child: Text(l10n.profileCopyLink),
                                ),
                                if (rel?.status == SocialStatus.contact)
                                  PopupMenuItem(
                                    value: 'remove',
                                    child: Text(l10n.memberRemoveContact),
                                  ),
                                if (rel?.blockedByMe != true)
                                  PopupMenuItem(
                                    value: 'mute',
                                    child: Text(
                                      rel?.muted == true
                                          ? l10n.memberUnmute
                                          : l10n.memberMute,
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
                                PopupMenuItem(
                                  value: 'report',
                                  child: Text(l10n.profileReport),
                                ),
                              ],
                            ),
                      topBar: Align(
                        alignment: Alignment.centerLeft,
                        child: IconButton(
                          tooltip: MaterialLocalizations.of(
                            context,
                          ).backButtonTooltip,
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0x6B0C0D10),
                            foregroundColor: const Color(0xFFF4F3F0),
                          ),
                          onPressed: () => Navigator.of(context).maybePop(),
                          icon: const Icon(Icons.arrow_back_rounded),
                        ),
                      ),
                    ),
                    ProfileOverlapSheet(
                      dock: isSelf
                          ? ProfileDock(
                              onShare: () =>
                                  sharePublicProfile(context, person),
                            )
                          : ProfileDock(
                              actions: _ActionChips(
                                busy: _busy,
                                rel: rel,
                                l10n: l10n,
                                onFollow: () => _run(
                                  () => rel?.following == true
                                      ? _social.unfollow(person.uid)
                                      : _social.follow(person.uid),
                                ),
                                onAdd: () =>
                                    _run(() => _social.sendRequest(person.uid)),
                                onCancel: () => _run(
                                  () => _social.cancelRequest(person.uid),
                                ),
                                onAccept: () => _run(
                                  () => _social.acceptRequest(person.uid),
                                ),
                                onDecline: () => _run(
                                  () => _social.declineRequest(person.uid),
                                ),
                                onMessage: _openDm,
                              ),
                              onShare: () =>
                                  sharePublicProfile(context, person),
                            ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ProfileTabBar(
                            index: _tab,
                            onChanged: (value) => setState(() => _tab = value),
                          ),
                          if (_tab == 0)
                            ProfilePostsSection(
                              threads: _threads,
                              loading: _postsLoading,
                              onOpenThread: _openThread,
                            )
                          else
                            ProfileAboutSection(person: person),
                        ],
                      ),
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
    required this.onFollow,
    required this.onAdd,
    required this.onCancel,
    required this.onAccept,
    required this.onDecline,
    required this.onMessage,
  });

  final bool busy;
  final SocialRelationship? rel;
  final AppLocalizations l10n;
  final VoidCallback onFollow;
  final VoidCallback onAdd;
  final VoidCallback onCancel;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onMessage;

  ButtonStyle get _filled =>
      FilledButton.styleFrom(minimumSize: const Size.fromHeight(44));

  ButtonStyle get _outline =>
      OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44));

  @override
  Widget build(BuildContext context) {
    if (rel?.blockedByMe == true) return const SizedBox.shrink();

    Widget follow() {
      if (rel?.following == true) {
        return OutlinedButton(
          onPressed: busy ? null : onFollow,
          style: _outline,
          child: Text(l10n.profileFollowing),
        );
      }
      return FilledButton(
        onPressed: busy ? null : onFollow,
        style: _filled,
        child: Text(l10n.profileFollow),
      );
    }

    Widget? secondary;
    if (rel?.status == SocialStatus.none && rel?.blockedByMe != true) {
      secondary = OutlinedButton(
        onPressed: busy ? null : onAdd,
        style: _outline,
        child: Text(l10n.memberAddContact),
      );
    } else if (rel?.status == SocialStatus.outgoing) {
      secondary = OutlinedButton(
        onPressed: busy ? null : onCancel,
        style: _outline,
        child: Text(l10n.memberCancelRequest),
      );
    } else if (rel?.status == SocialStatus.incoming) {
      secondary = null;
    } else if (rel?.status == SocialStatus.contact) {
      secondary = FilledButton(
        onPressed: busy ? null : onMessage,
        style: _filled,
        child: Text(l10n.memberMessage),
      );
    }

    if (rel?.status == SocialStatus.incoming) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          follow(),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : onAccept,
                  style: _filled,
                  child: Text(l10n.memberAcceptRequest),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : onDecline,
                  style: _outline,
                  child: Text(l10n.memberDeclineRequest),
                ),
              ),
            ],
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(child: follow()),
        if (secondary != null) ...[
          const SizedBox(width: 8),
          Expanded(child: secondary),
        ],
      ],
    );
  }
}
