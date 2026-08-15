import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/role_badge.dart';
import '../../../l10n/l10n.dart';
import '../../../users/avatar_storage.dart';
import '../../../users/user_profile.dart';
import '../../forums/forum_models.dart';
import '../../forums/widgets/relative_time.dart';

(String, String?) splitDisplayName(String name) {
  final trimmed = name.trim();
  final space = trimmed.indexOf(' ');
  if (space == -1) return (trimmed.isEmpty ? '—' : trimmed, null);
  final rest = trimmed.substring(space + 1).trim();
  return (trimmed.substring(0, space), rest.isEmpty ? null : rest);
}

class ProfileSocialHeader extends StatelessWidget {
  const ProfileSocialHeader({
    super.key,
    required this.person,
    required this.posts,
    this.topBar,
    this.actions,
    this.portraitMenu,
    this.onShare,
    this.onAvatarTap,
    this.onChooseUsername,
    this.avatarBusy = false,
    this.showEditBadge = false,
    this.roleLabel,
    this.showLocation = true,
    this.followerCount = 0,
    this.followingCount = 0,
    this.onFollowersTap,
    this.onFollowingTap,
  });

  final UserProfile person;
  final int posts;
  final Widget? topBar;
  final Widget? actions;
  final Widget? portraitMenu;
  final VoidCallback? onShare;
  final VoidCallback? onAvatarTap;
  final VoidCallback? onChooseUsername;
  final bool avatarBusy;
  final bool showEditBadge;
  final String? roleLabel;
  final bool showLocation;
  final int followerCount;
  final int followingCount;
  final VoidCallback? onFollowersTap;
  final VoidCallback? onFollowingTap;

  String get _handle => person.handle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final cover = person.profileBadge?.backgroundColor ?? brand;
    final location = showLocation ? person.publicLocation : null;
    final top = MediaQuery.paddingOf(context).top;
    final given = person.headlineName;
    final split = splitDisplayName(given);
    final source = split.$1.trim().isNotEmpty ? split.$1.trim() : given.trim();
    final mark = source.isEmpty ? 'P' : source[0].toUpperCase();
    final role = roleLabel?.trim();
    final agency = person.agency?.trim();
    final meta = [
      if (role != null && role.isNotEmpty) role,
      ?location,
      if (agency != null && agency.isNotEmpty) agency,
    ].join(' · ');
    final quote = person.bio?.trim();
    final portraitW = math.min(
      280.0,
      MediaQuery.sizeOf(context).width - AppSpacing.lg * 2,
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: const Alignment(-0.7, -1.05),
          radius: 1.15,
          colors: [
            cover.withValues(alpha: 0.28),
            colors.meshBase.withValues(alpha: 0),
          ],
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: top + 8),
          if (topBar != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: topBar!,
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Portrait(
                  person: person,
                  cover: cover,
                  mark: mark,
                  width: portraitW,
                  busy: avatarBusy,
                  showEditBadge: showEditBadge,
                  onTap: onAvatarTap,
                  menu: portraitMenu,
                ),
                const SizedBox(height: 22),
                Text(
                  '@$_handle',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2.2,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  split.$1,
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.8,
                    height: 0.88,
                    fontSize: 44,
                    color: colors.ink,
                  ),
                ),
                if (split.$2 != null)
                  Text(
                    split.$2!,
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.8,
                      height: 0.88,
                      fontSize: 44,
                      color: colors.ink,
                    ),
                  ),
                if (onChooseUsername != null && !person.hasUsername)
                  TextButton(
                    onPressed: onChooseUsername,
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 28),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(l10n.usernameChoose),
                  ),
                if (meta.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    meta,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: colors.ink,
                      height: 1.35,
                    ),
                  ),
                ],
                if (quote != null && quote.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(
                    '“',
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontSize: 42,
                      height: 0.55,
                      color: cover.withValues(alpha: 0.7),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    quote,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                      height: 1.4,
                      fontSize: 18,
                      color: colors.ink,
                    ),
                  ),
                ],
                const SizedBox(height: 22),
                Row(
                  children: [
                    _Stat(
                      value: followerCount,
                      label: l10n.profileStatFollowers,
                      onTap: onFollowersTap,
                    ),
                    _Stat(
                      value: followingCount,
                      label: l10n.profileStatFollowing,
                      onTap: onFollowingTap,
                    ),
                    _Stat(value: posts, label: l10n.profileStatPosts),
                  ],
                ),
                if (actions != null || onShare != null) ...[
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      if (actions != null)
                        Expanded(child: actions!),
                      if (onShare != null) ...[
                        if (actions != null) const SizedBox(width: 8),
                        IconButton.filledTonal(
                          tooltip: l10n.profileShare,
                          onPressed: onShare,
                          style: IconButton.styleFrom(
                            backgroundColor: colors.sheet,
                            foregroundColor: colors.ink,
                            side: BorderSide(color: colors.border),
                            minimumSize: const Size(44, 44),
                          ),
                          icon: const Icon(Icons.ios_share_rounded),
                        ),
                      ],
                    ],
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

class _Portrait extends StatelessWidget {
  const _Portrait({
    required this.person,
    required this.cover,
    required this.mark,
    required this.width,
    required this.busy,
    required this.showEditBadge,
    this.onTap,
    this.menu,
  });

  final UserProfile person;
  final Color cover;
  final String mark;
  final double width;
  final bool busy;
  final bool showEditBadge;
  final VoidCallback? onTap;
  final Widget? menu;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final photoUrl = sanitizeOptionalAvatarDownloadUrl(person.photoUrl);
    final height = width * 4 / 3;

    final plate = ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        width: width,
        height: height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    cover.withValues(alpha: 0.92),
                    cover.withValues(alpha: 0.42),
                    colors.meshDeep,
                  ],
                ),
              ),
            ),
            Positioned(
              right: -18,
              bottom: -36,
              child: IgnorePointer(
                child: Text(
                  mark,
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 168,
                        height: 0.8,
                        color: Colors.white.withValues(alpha: 0.16),
                      ),
                ),
              ),
            ),
            if (photoUrl != null)
              CachedNetworkImage(
                imageUrl: photoUrl,
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 120),
                errorWidget: (context, url, error) => const SizedBox.shrink(),
                placeholder: (context, url) => const SizedBox.shrink(),
              ),
            if (person.profileBadge != null)
              Positioned(
                left: 12,
                bottom: 12,
                child: RoleBadge(badge: person.profileBadge, dense: true),
              ),
            if (busy)
              const ColoredBox(
                color: Color(0x73000000),
                child: Center(
                  child: SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
            if (showEditBadge && !busy)
              Positioned(
                right: 12,
                bottom: 12,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.brandOf(context),
                    shape: BoxShape.circle,
                    border: Border.all(color: colors.meshBase, width: 2),
                  ),
                  child: Icon(
                    Icons.camera_alt_rounded,
                    size: 18,
                    color: onBrandFor(AppColors.brandOf(context)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );

    final framed = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: cover.withValues(alpha: 0.35),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: plate,
    );

    return SizedBox(
      width: width,
      height: height,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          if (onTap == null)
            framed
          else
            GestureDetector(onTap: busy ? null : onTap, child: framed),
          if (menu != null)
            Positioned(
              top: 8,
              right: 8,
              child: menu!,
            ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.value,
    required this.label,
    this.onTap,
  });

  final int value;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final child = Padding(
      padding: const EdgeInsets.only(right: 12, top: 4, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$value',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -1.1,
              fontSize: 28,
              color: colors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.muted,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
    return Expanded(
      child: onTap == null
          ? child
          : InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(12),
              child: child,
            ),
    );
  }
}

class ProfilePostsSection extends StatelessWidget {
  const ProfilePostsSection({
    super.key,
    required this.threads,
    required this.loading,
    required this.onOpenThread,
    this.bottomPad = 24,
  });

  final List<ForumThread> threads;
  final bool loading;
  final ValueChanged<ForumThread> onOpenThread;
  final double bottomPad;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (threads.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.profilePosts,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.8,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  l10n.profilePostsEmpty,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.muted,
                  ),
                ),
              ],
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              0,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < threads.length; i++) ...[
                  if (i > 0) const SizedBox(height: 10),
                  ProfilePostTile(
                    thread: threads[i],
                    onTap: () => onOpenThread(threads[i]),
                  ),
                ],
              ],
            ),
          ),
        SizedBox(height: bottomPad),
      ],
    );
  }
}

class ProfilePostTile extends StatelessWidget {
  const ProfilePostTile({
    super.key,
    required this.thread,
    required this.onTap,
  });

  final ForumThread thread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return Material(
      color: colors.sheet,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: colors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  thread.title,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontFamily: 'Outfit',
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                    letterSpacing: -0.35,
                    fontSize: 18,
                    color: colors.ink,
                  ),
                ),
                if (thread.body.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    thread.body.replaceAll(RegExp(r'\s+'), ' ').trim(),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    Text(
                      formatRelativeTime(thread.createdAt, l10n),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Icon(Icons.favorite_rounded, size: 13, color: colors.muted),
                    const SizedBox(width: 4),
                    Text(
                      '${thread.score < 0 ? 0 : thread.score}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      Icons.mode_comment_outlined,
                      size: 13,
                      color: colors.muted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${thread.replyCount}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w700,
                      ),
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
