import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../app/layout/pulse_constrained.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../app/widgets/role_badge.dart';
import '../../l10n/l10n.dart';
import '../../users/social_repository.dart';
import '../../users/access_scope.dart';
import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import '../chats/chat_conversation_screen.dart';
import '../chats/chat_repository.dart';
import '../forums/forum_models.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../forums/widgets/relative_time.dart';
import 'widgets/profile_avatar.dart';
import 'widgets/profile_public_extras.dart';

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
      final chat = await _chats.getOrCreateDm(
        me: widget.viewer,
        other: person,
        access: AccessScope.accessOf(
          context,
          fallbackRoleId: widget.viewer.roleId,
        ),
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

  Widget _profileMenu(
    UserProfile person,
    SocialRelationship? rel,
    AppLocalizations l10n,
  ) {
    return PopupMenuButton<String>(
      enabled: !_busy,
      tooltip: l10n.memberProfileTitle,
      icon: const Icon(Icons.more_horiz_rounded),
      style: IconButton.styleFrom(
        backgroundColor: Colors.white.withValues(alpha: 0.14),
        foregroundColor: Colors.white,
        minimumSize: const Size(46, 46),
      ),
      onSelected: (value) {
        switch (value) {
          case 'copy':
            _copyLink(person);
          case 'remove':
            _run(() => _social.removeContact(person.uid));
          case 'mute':
            _run(
              () => _social.setMuted(person.uid, muted: !(rel?.muted ?? false)),
            );
          case 'block':
            _run(
              () => _social.setBlocked(
                person.uid,
                blocked: !(rel?.blockedByMe ?? false),
              ),
            );
          case 'report':
            final messenger = ScaffoldMessenger.of(context);
            final sent = l10n.profileReportSent;
            showReportMemberSheet(
              context: context,
              onSubmit: (reason, details) => _run(() async {
                await _social.reportMember(
                  person.uid,
                  reason: reason,
                  details: details,
                );
                messenger.showSnackBar(SnackBar(content: Text(sent)));
              }),
            );
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(value: 'copy', child: Text(l10n.profileCopyLink)),
        if (rel?.status == SocialStatus.contact)
          PopupMenuItem(value: 'remove', child: Text(l10n.memberRemoveContact)),
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
            rel?.blockedByMe == true ? l10n.memberUnblock : l10n.memberBlock,
          ),
        ),
        PopupMenuItem(value: 'report', child: Text(l10n.profileReport)),
      ],
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
          ? const _PublicProfileSkeleton()
          : person == null
          ? Center(child: Text(l10n.memberNotFound))
          : PulseConstrained(
              maxWidth: PulseContentWidth.feed,
              padding: EdgeInsets.zero,
              child: RefreshIndicator(
                onRefresh: _reload,
                child: ListView(
                  key: const Key('public-profile-scroll'),
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: EdgeInsets.fromLTRB(
                    0,
                    MediaQuery.paddingOf(context).top + 10,
                    0,
                    MediaQuery.paddingOf(context).bottom + 28,
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: ModernProfileIdentityHero(
                        person: person,
                        roleLabel: roleLabelForId(person.roleId, l10n),
                        onBack: () => Navigator.of(context).maybePop(),
                        menu: isSelf ? null : _profileMenu(person, rel, l10n),
                      ),
                    ),
                    Transform.translate(
                      offset: const Offset(0, -14),
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: ModernProfileActionPanel(
                              shareTooltip: l10n.profileShare,
                              onShare: () =>
                                  sharePublicProfile(context, person),
                              actions: isSelf
                                  ? null
                                  : _ActionChips(
                                      busy: _busy,
                                      rel: rel,
                                      allowMessageWithoutContact:
                                          canAccessAllChatContacts(
                                            AccessScope.accessOf(
                                              context,
                                              fallbackRoleId:
                                                  widget.viewer.roleId,
                                            ),
                                          ),
                                      l10n: l10n,
                                      onFollow: () => _run(
                                        () => rel?.following == true
                                            ? _social.unfollow(person.uid)
                                            : _social.follow(person.uid),
                                      ),
                                      onAdd: () => _run(
                                        () => _social.sendRequest(person.uid),
                                      ),
                                      onCancel: () => _run(
                                        () => _social.cancelRequest(person.uid),
                                      ),
                                      onAccept: () => _run(
                                        () => _social.acceptRequest(person.uid),
                                      ),
                                      onDecline: () => _run(
                                        () =>
                                            _social.declineRequest(person.uid),
                                      ),
                                      onMessage: _openDm,
                                    ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            child: ModernProfileSignals(
                              posts: posts,
                              followers: person.followerCount,
                              following: person.followingCount,
                              onFollowersTap: () => _openFollowList(true),
                              onFollowingTap: () => _openFollowList(false),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            child: ModernProfileSectionSwitch(
                              index: _tab,
                              onChanged: (value) =>
                                  setState(() => _tab = value),
                            ),
                          ),
                          const SizedBox(height: 16),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 260),
                            switchInCurve: Curves.easeOutCubic,
                            switchOutCurve: Curves.easeInCubic,
                            child: _tab == 0
                                ? ModernProfilePostsSection(
                                    key: const ValueKey('profile-posts'),
                                    threads: _threads,
                                    loading: _postsLoading,
                                    onOpenThread: _openThread,
                                  )
                                : ModernProfileAboutSection(
                                    key: const ValueKey('profile-about'),
                                    person: person,
                                    roleLabel: roleLabelForId(
                                      person.roleId,
                                      l10n,
                                    ),
                                  ),
                          ),
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

class ModernProfileIdentityHero extends StatelessWidget {
  const ModernProfileIdentityHero({
    super.key,
    required this.person,
    required this.roleLabel,
    this.onBack,
    this.menu,
    this.onAvatarTap,
    this.avatarBusy = false,
    this.showEditBadge = false,
    this.showLocation = true,
  });

  final UserProfile person;
  final String roleLabel;
  final VoidCallback? onBack;
  final Widget? menu;
  final VoidCallback? onAvatarTap;
  final bool avatarBusy;
  final bool showEditBadge;
  final bool showLocation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = AppColors.brandOf(context);
    final accent = person.profileBadge?.backgroundColor ?? brand;
    final deep = Color.lerp(accent, const Color(0xFF080A10), 0.72)!;
    final agency = person.agency?.trim();
    final location = showLocation ? person.publicLocation : null;
    final bio = person.bio?.trim();

    return Container(
      key: const Key('public-profile-identity-hero'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(accent, Colors.white, 0.08)!,
            deep,
            const Color(0xFF0B0D12),
          ],
          stops: const [0, 0.58, 1],
        ),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.25),
            blurRadius: 38,
            offset: const Offset(0, 18),
            spreadRadius: -12,
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: -92,
            right: -72,
            child: _HeroOrb(
              size: 250,
              color: Colors.white.withValues(alpha: 0.10),
              borderColor: Colors.white.withValues(alpha: 0.15),
            ),
          ),
          Positioned(
            bottom: -78,
            left: -54,
            child: _HeroOrb(
              size: 184,
              color: accent.withValues(alpha: 0.19),
              borderColor: Colors.white.withValues(alpha: 0.08),
            ),
          ),
          Positioned(
            right: 18,
            top: 88,
            child: IgnorePointer(
              child: Text(
                person.initials,
                style: theme.textTheme.displayLarge?.copyWith(
                  color: Colors.white.withValues(alpha: 0.07),
                  fontSize: 146,
                  height: 0.8,
                  letterSpacing: -8,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 34),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (onBack != null)
                      IconButton(
                        tooltip: MaterialLocalizations.of(
                          context,
                        ).backButtonTooltip,
                        onPressed: onBack,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.14),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(46, 46),
                        ),
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                    const Spacer(),
                    ?menu,
                  ],
                ),
                const SizedBox(height: 26),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.56),
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x55000000),
                            blurRadius: 28,
                            offset: Offset(0, 12),
                          ),
                        ],
                      ),
                      child: ProfileAvatar(
                        profile: person,
                        size: 104,
                        onTap: onAvatarTap,
                        busy: avatarBusy,
                        showEditBadge: showEditBadge,
                      ),
                    ),
                    const Spacer(),
                    if (person.profileBadge != null)
                      Flexible(
                        child: RoleBadge(
                          badge: person.profileBadge,
                          dense: true,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  person.headlineName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.displaySmall?.copyWith(
                    color: Colors.white,
                    fontSize: 38,
                    height: 0.96,
                    letterSpacing: -1.6,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _HeroPill(
                      icon: Icons.alternate_email_rounded,
                      label: person.handle,
                      strong: true,
                    ),
                    _HeroPill(
                      icon: Icons.verified_user_outlined,
                      label: roleLabel,
                    ),
                  ],
                ),
                if (agency?.isNotEmpty == true || location != null) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 14,
                    runSpacing: 7,
                    children: [
                      if (agency?.isNotEmpty == true)
                        _HeroMeta(
                          icon: Icons.apartment_rounded,
                          label: agency!,
                        ),
                      if (location != null)
                        _HeroMeta(
                          icon: Icons.location_on_outlined,
                          label: location,
                        ),
                    ],
                  ),
                ],
                if (bio?.isNotEmpty == true) ...[
                  const SizedBox(height: 17),
                  Container(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.09),
                      borderRadius: BorderRadius.circular(17),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.10),
                      ),
                    ),
                    child: Text(
                      bio!,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.86),
                        height: 1.42,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroOrb extends StatelessWidget {
  const _HeroOrb({
    required this.size,
    required this.color,
    required this.borderColor,
  });

  final double size;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          border: Border.all(color: borderColor),
        ),
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    required this.icon,
    required this.label,
    this.strong = false,
  });

  final IconData icon;
  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: strong ? 0.19 : 0.09),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.78)),
          const SizedBox(width: 5),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white,
              fontWeight: strong ? FontWeight.w800 : FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroMeta extends StatelessWidget {
  const _HeroMeta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.white.withValues(alpha: 0.62)),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.78),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class ModernProfileActionPanel extends StatelessWidget {
  const ModernProfileActionPanel({
    super.key,
    required this.shareTooltip,
    required this.onShare,
    this.actions,
  });

  final String shareTooltip;
  final VoidCallback onShare;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final child = actions;
    return Container(
      key: const Key('public-profile-actions'),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: colors.sheet,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 26,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          if (child != null) Expanded(child: child),
          if (child == null)
            Expanded(
              child: TextButton.icon(
                onPressed: onShare,
                icon: const Icon(Icons.ios_share_rounded, size: 18),
                label: Text(shareTooltip),
              ),
            )
          else ...[
            const SizedBox(width: 6),
            IconButton(
              tooltip: shareTooltip,
              onPressed: onShare,
              style: IconButton.styleFrom(
                backgroundColor: colors.canvas,
                foregroundColor: colors.ink,
                side: BorderSide(color: colors.border),
                minimumSize: const Size(44, 44),
              ),
              icon: const Icon(Icons.ios_share_rounded, size: 19),
            ),
          ],
        ],
      ),
    );
  }
}

class ModernProfileSignals extends StatelessWidget {
  const ModernProfileSignals({
    super.key,
    required this.posts,
    required this.followers,
    required this.following,
    required this.onFollowersTap,
    required this.onFollowingTap,
  });

  final int posts;
  final int followers;
  final int following;
  final VoidCallback onFollowersTap;
  final VoidCallback onFollowingTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    return Container(
      key: const Key('public-profile-signals'),
      padding: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        color: colors.sheet.withValues(alpha: 0.76),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _Signal(
              value: followers,
              label: l10n.profileStatFollowers,
              onTap: onFollowersTap,
            ),
          ),
          _SignalDivider(color: colors.border),
          Expanded(
            child: _Signal(
              value: following,
              label: l10n.profileStatFollowing,
              onTap: onFollowingTap,
            ),
          ),
          _SignalDivider(color: colors.border),
          Expanded(
            child: _Signal(value: posts, label: l10n.profileStatPosts),
          ),
        ],
      ),
    );
  }
}

class _SignalDivider extends StatelessWidget {
  const _SignalDivider({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(height: 34, child: VerticalDivider(color: color, width: 1));
  }
}

class _Signal extends StatelessWidget {
  const _Signal({required this.value, required this.label, this.onTap});

  final int value;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final child = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: Column(
        children: [
          Text(
            '$value',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.muted,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: child,
      ),
    );
  }
}

class ModernProfileSectionSwitch extends StatelessWidget {
  const ModernProfileSectionSwitch({
    super.key,
    required this.index,
    required this.onChanged,
  });

  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    return Container(
      key: const Key('public-profile-section-switch'),
      height: 54,
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: colors.glassFill,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SectionChoice(
              key: const Key('public-profile-posts-tab'),
              label: l10n.profilePosts,
              icon: Icons.grid_view_rounded,
              selected: index == 0,
              onTap: () => onChanged(0),
            ),
          ),
          Expanded(
            child: _SectionChoice(
              key: const Key('public-profile-about-tab'),
              label: l10n.profileAbout,
              icon: Icons.person_outline_rounded,
              selected: index == 1,
              onTap: () => onChanged(1),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionChoice extends StatelessWidget {
  const _SectionChoice({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: selected ? brand : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: brand.withValues(alpha: 0.26),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: selected ? onBrandFor(brand) : colors.muted,
              ),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: selected ? onBrandFor(brand) : colors.muted,
                    fontWeight: FontWeight.w800,
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

class ModernProfilePostsSection extends StatelessWidget {
  const ModernProfilePostsSection({
    super.key,
    required this.threads,
    required this.loading,
    required this.onOpenThread,
  });

  final List<ForumThread> threads;
  final bool loading;
  final ValueChanged<ForumThread> onOpenThread;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 18),
        child: PulseFeedSkeleton(itemCount: 3),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 0, 2, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.profilePosts,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontSize: 24,
                      letterSpacing: -0.7,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: colors.glassFill,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: colors.border),
                  ),
                  child: Text(
                    '${threads.length}',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (threads.isEmpty)
            _EmptyPosts(message: l10n.profilePostsEmpty)
          else
            for (var i = 0; i < threads.length; i++) ...[
              if (i > 0) const SizedBox(height: 12),
              _ActivityPostCard(
                thread: threads[i],
                onTap: () => onOpenThread(threads[i]),
              ),
            ],
        ],
      ),
    );
  }
}

class _EmptyPosts extends StatelessWidget {
  const _EmptyPosts({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 34, horizontal: 22),
      decoration: BoxDecoration(
        color: colors.glassFill,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        children: [
          Icon(Icons.auto_awesome_rounded, color: colors.muted, size: 28),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
        ],
      ),
    );
  }
}

class _ActivityPostCard extends StatelessWidget {
  const _ActivityPostCard({required this.thread, required this.onTap});

  final ForumThread thread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    return Material(
      color: colors.sheet,
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: colors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 17, 16, 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: brand,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: brand.withValues(alpha: 0.45),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        formatRelativeTime(thread.createdAt, l10n),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: colors.muted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.arrow_outward_rounded,
                      size: 18,
                      color: colors.muted,
                    ),
                  ],
                ),
                if (thread.tags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    thread.tags.take(3).map((tag) => '#$tag').join('  '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: brand,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  thread.title,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 20,
                    height: 1.12,
                    letterSpacing: -0.45,
                  ),
                ),
                if (thread.body.trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    thread.body.replaceAll(RegExp(r'\s+'), ' ').trim(),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                      height: 1.45,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    _PostMetric(
                      icon: Icons.favorite_border_rounded,
                      value: thread.score < 0 ? 0 : thread.score,
                    ),
                    const SizedBox(width: 14),
                    _PostMetric(
                      icon: Icons.chat_bubble_outline_rounded,
                      value: thread.replyCount,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PostMetric extends StatelessWidget {
  const _PostMetric({required this.icon, required this.value});

  final IconData icon;
  final int value;

  @override
  Widget build(BuildContext context) {
    final muted = AppColors.of(context).muted;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: muted),
        const SizedBox(width: 5),
        Text(
          '$value',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: muted,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class ModernProfileAboutSection extends StatelessWidget {
  const ModernProfileAboutSection({
    super.key,
    required this.person,
    required this.roleLabel,
    this.showLocation = true,
  });

  final UserProfile person;
  final String roleLabel;
  final bool showLocation;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context);
    final joined = DateFormat.yMMMM(
      locale.toString(),
    ).format(person.createdAt.toLocal());
    final bio = person.bio?.trim();
    final agency = person.agency?.trim();
    final location = showLocation ? person.publicLocation : null;

    return Padding(
      key: const Key('public-profile-about-content'),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: LayoutBuilder(
        builder: (context, constraints) {
          const gap = 12.0;
          final half = (constraints.maxWidth - gap) / 2;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(2, 0, 2, 12),
                child: Text(
                  l10n.profileAbout,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontSize: 24,
                    letterSpacing: -0.7,
                  ),
                ),
              ),
              if (bio?.isNotEmpty == true) ...[
                _AboutTile(
                  width: constraints.maxWidth,
                  icon: Icons.format_quote_rounded,
                  label: l10n.fieldBio,
                  value: bio!,
                  feature: true,
                ),
                const SizedBox(height: gap),
              ],
              Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  _AboutTile(
                    width: half,
                    icon: Icons.workspace_premium_outlined,
                    label: l10n.profileCompleteRoleTitle,
                    value: roleLabel,
                  ),
                  _AboutTile(
                    width: half,
                    icon: Icons.calendar_today_rounded,
                    label: l10n.profileAbout,
                    value: l10n.profileJoined(joined),
                  ),
                  if (agency?.isNotEmpty == true)
                    _AboutTile(
                      width: location == null ? constraints.maxWidth : half,
                      icon: Icons.apartment_rounded,
                      label: l10n.fieldAgency,
                      value: agency!,
                    ),
                  if (location != null)
                    _AboutTile(
                      width: agency?.isNotEmpty == true
                          ? half
                          : constraints.maxWidth,
                      icon: Icons.location_on_outlined,
                      label: l10n.fieldAddressCity,
                      value: location,
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _AboutTile extends StatelessWidget {
  const _AboutTile({
    required this.width,
    required this.icon,
    required this.label,
    required this.value,
    this.feature = false,
  });

  final double width;
  final IconData icon;
  final String label;
  final String value;
  final bool feature;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    return Container(
      width: width,
      constraints: BoxConstraints(minHeight: feature ? 142 : 132),
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: feature ? brand.withValues(alpha: 0.11) : colors.glassFill,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: feature ? brand.withValues(alpha: 0.24) : colors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: feature ? brand.withValues(alpha: 0.16) : colors.canvas,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, size: 18, color: feature ? brand : colors.muted),
          ),
          const SizedBox(height: 14),
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.muted,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.15,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            maxLines: feature ? 5 : 3,
            overflow: TextOverflow.ellipsis,
            style: feature
                ? Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: colors.ink,
                    height: 1.45,
                  )
                : Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: colors.ink,
                    height: 1.25,
                    fontWeight: FontWeight.w800,
                  ),
          ),
        ],
      ),
    );
  }
}

class _PublicProfileSkeleton extends StatelessWidget {
  const _PublicProfileSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(
        14,
        MediaQuery.paddingOf(context).top + 10,
        14,
        24,
      ),
      children: [
        const PulseSkeleton(
          width: double.infinity,
          height: 382,
          borderRadius: 34,
        ),
        Transform.translate(
          offset: const Offset(0, -14),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: PulseSkeleton(
              width: double.infinity,
              height: 58,
              borderRadius: 22,
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: PulseSkeleton(
            width: double.infinity,
            height: 86,
            borderRadius: 24,
          ),
        ),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: PulseSkeleton(
            width: double.infinity,
            height: 54,
            borderRadius: 19,
          ),
        ),
        const SizedBox(height: 18),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: Column(
            children: [
              PulseSkeleton(
                width: double.infinity,
                height: 168,
                borderRadius: 24,
              ),
              SizedBox(height: 12),
              PulseSkeleton(
                width: double.infinity,
                height: 168,
                borderRadius: 24,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionChips extends StatelessWidget {
  const _ActionChips({
    required this.busy,
    required this.rel,
    required this.allowMessageWithoutContact,
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
  final bool allowMessageWithoutContact;
  final AppLocalizations l10n;
  final VoidCallback onFollow;
  final VoidCallback onAdd;
  final VoidCallback onCancel;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onMessage;

  ButtonStyle get _filled => FilledButton.styleFrom(
    minimumSize: const Size.fromHeight(44),
    padding: const EdgeInsets.symmetric(horizontal: 11),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
  );

  ButtonStyle get _outline => OutlinedButton.styleFrom(
    minimumSize: const Size.fromHeight(44),
    padding: const EdgeInsets.symmetric(horizontal: 11),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
  );

  @override
  Widget build(BuildContext context) {
    if (rel?.blockedByMe == true) return const SizedBox.shrink();

    Widget follow() {
      if (rel?.following == true) {
        return OutlinedButton.icon(
          onPressed: busy ? null : onFollow,
          style: _outline,
          icon: const Icon(Icons.check_rounded, size: 18),
          label: Text(l10n.profileFollowing),
        );
      }
      return FilledButton.icon(
        onPressed: busy ? null : onFollow,
        style: _filled,
        icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
        label: Text(l10n.profileFollow),
      );
    }

    Widget message() {
      return FilledButton.icon(
        onPressed: busy ? null : onMessage,
        style: _filled,
        icon: const Icon(Icons.chat_bubble_rounded, size: 18),
        label: Text(l10n.memberMessage),
      );
    }

    Widget? secondary;
    if (allowMessageWithoutContact) {
      secondary = message();
    } else if (rel?.status == SocialStatus.none && rel?.blockedByMe != true) {
      secondary = OutlinedButton.icon(
        onPressed: busy ? null : onAdd,
        style: _outline,
        icon: const Icon(Icons.person_add_outlined, size: 18),
        label: Text(l10n.memberAddContact),
      );
    } else if (rel?.status == SocialStatus.outgoing) {
      secondary = OutlinedButton.icon(
        onPressed: busy ? null : onCancel,
        style: _outline,
        icon: const Icon(Icons.schedule_rounded, size: 18),
        label: Text(l10n.memberCancelRequest),
      );
    } else if (rel?.status == SocialStatus.incoming) {
      secondary = null;
    } else if (rel?.status == SocialStatus.contact) {
      secondary = message();
    }

    if (rel?.status == SocialStatus.incoming) {
      return LayoutBuilder(
        builder: (context, constraints) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            follow(),
            if (allowMessageWithoutContact) ...[
              const SizedBox(height: 8),
              message(),
            ],
            const SizedBox(height: 8),
            if (constraints.maxWidth < 300) ...[
              FilledButton.icon(
                onPressed: busy ? null : onAccept,
                style: _filled,
                icon: const Icon(Icons.check_rounded, size: 18),
                label: Text(l10n.memberAcceptRequest),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: busy ? null : onDecline,
                style: _outline,
                icon: const Icon(Icons.close_rounded, size: 18),
                label: Text(l10n.memberDeclineRequest),
              ),
            ] else
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: busy ? null : onAccept,
                      style: _filled,
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: Text(l10n.memberAcceptRequest),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: busy ? null : onDecline,
                      style: _outline,
                      icon: const Icon(Icons.close_rounded, size: 18),
                      label: Text(l10n.memberDeclineRequest),
                    ),
                  ),
                ],
              ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (secondary != null && constraints.maxWidth < 240) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [follow(), const SizedBox(height: 8), secondary],
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
      },
    );
  }
}
