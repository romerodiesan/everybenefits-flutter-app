import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/role_badge.dart';
import '../../../app/widgets/pulse_skeleton.dart';
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

const _stageInk = Color(0xFFF4F3F0);
const _stageNight = Color(0xFF0C0D10);
const _stageOverlap = 40.0;

class ProfileSocialHeader extends StatelessWidget {
  const ProfileSocialHeader({
    super.key,
    required this.person,
    required this.posts,
    this.topBar,
    this.portraitMenu,
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
  final Widget? portraitMenu;
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
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final cover = person.profileBadge?.backgroundColor ?? brand;
    final location = showLocation ? person.publicLocation : null;
    final top = MediaQuery.paddingOf(context).top;
    final size = MediaQuery.sizeOf(context);
    final height = math.max(420.0, math.min(size.height * 0.55, 560.0));
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
    final photoUrl = sanitizeOptionalAvatarDownloadUrl(person.photoUrl);
    final light = theme.brightness == Brightness.light;
    final typeStyle = theme.textTheme.displaySmall?.copyWith(
      fontWeight: FontWeight.w800,
      letterSpacing: -1.8,
      height: 0.86,
      fontSize: 48,
      color: _stageInk,
    );

    return SizedBox(
      height: height,
      width: double.infinity,
      child: ClipRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color.lerp(cover, _stageNight, 0.18)!,
                    Color.lerp(cover, _stageNight, 0.62)!,
                  ],
                ),
              ),
            ),
            if (photoUrl == null) ...[
              Positioned(
                right: -24,
                bottom: -48,
                child: IgnorePointer(
                  child: Text(
                    mark,
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontSize: 220,
                      height: 0.75,
                      letterSpacing: -8,
                      color: Colors.white.withValues(alpha: 0.16),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: -80,
                right: -60,
                child: IgnorePointer(
                  child: Container(
                    width: 280,
                    height: 280,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.2),
                        width: 1.5,
                      ),
                      gradient: RadialGradient(
                        center: const Alignment(-0.3, -0.2),
                        colors: [
                          Colors.white.withValues(alpha: 0.18),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: -40,
                bottom: 80,
                child: IgnorePointer(
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                ),
              ),
            ],
            if (photoUrl != null) ...[
              Positioned.fill(
                child: CachedNetworkImage(
                  imageUrl: photoUrl,
                  fit: BoxFit.cover,
                  alignment: Alignment.topCenter,
                  fadeInDuration: const Duration(milliseconds: 120),
                  errorWidget: (context, url, error) => const SizedBox.shrink(),
                  placeholder: (context, url) => const SizedBox.shrink(),
                ),
              ),
              Positioned.fill(
                child: ColoredBox(color: cover.withValues(alpha: 0.58)),
              ),
            ],
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Color(0x2E0C0D10),
                    Color(0xD10C0D10),
                    Color(0xFF0C0D10),
                  ],
                  stops: [0.0, 0.32, 0.64, 1.0],
                ),
              ),
            ),
            if (light)
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Color(0x520C0D10),
                      Color(0xE60C0D10),
                    ],
                    stops: [0.28, 0.58, 1.0],
                  ),
                ),
              ),
            if (onAvatarTap != null)
              Positioned.fill(
                child: GestureDetector(
                  onTap: avatarBusy ? null : onAvatarTap,
                  behavior: HitTestBehavior.opaque,
                  child: const SizedBox.expand(),
                ),
              ),
            Positioned(
              left: 20,
              right: 20,
              bottom: 56,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '@$_handle',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: _stageInk.withValues(alpha: 0.72),
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.2,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    split.$1,
                    maxLines: split.$2 == null ? 3 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: typeStyle,
                  ),
                  if (split.$2 != null)
                    Text(
                      split.$2!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: typeStyle,
                    ),
                  if (onChooseUsername != null && !person.hasUsername)
                    TextButton(
                      onPressed: onChooseUsername,
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 28),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        foregroundColor: Color.lerp(_stageInk, brand, 0.28),
                      ),
                      child: Text(l10n.usernameChoose),
                    ),
                  if (meta.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      meta,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: _stageInk.withValues(alpha: 0.86),
                        height: 1.35,
                      ),
                    ),
                  ],
                  if (quote != null && quote.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      quote,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                        fontSize: 16,
                        color: _stageInk.withValues(alpha: 0.82),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
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
                ],
              ),
            ),
            Positioned(
              top: top + 8,
              left: 8,
              right: 8,
              child: IconTheme(
                data: const IconThemeData(color: _stageInk),
                child: Row(
                  children: [
                    if (topBar != null) Expanded(child: topBar!),
                    ?portraitMenu,
                  ],
                ),
              ),
            ),
            if (person.profileBadge != null)
              Positioned(
                top: top + 56,
                left: 12,
                child: RoleBadge(badge: person.profileBadge, dense: true),
              ),
            if (avatarBusy)
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
            if (showEditBadge && !avatarBusy)
              Positioned(
                right: 16,
                bottom: 108,
                child: IgnorePointer(
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: brand,
                      shape: BoxShape.circle,
                      border: Border.all(color: _stageInk, width: 2),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x66000000),
                          blurRadius: 12,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.camera_alt_rounded,
                      size: 18,
                      color: onBrandFor(brand),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class ProfileOverlapSheet extends StatelessWidget {
  const ProfileOverlapSheet({super.key, required this.child, this.dock});

  final Widget child;
  final Widget? dock;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Transform.translate(
      offset: const Offset(0, -_stageOverlap),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.sheet,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.48),
              blurRadius: 48,
              offset: const Offset(0, -22),
              spreadRadius: -20,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.only(bottom: _stageOverlap),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (dock != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    4,
                  ),
                  child: Transform.translate(
                    offset: const Offset(0, -22),
                    child: dock!,
                  ),
                ),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

class ProfileDock extends StatelessWidget {
  const ProfileDock({super.key, this.actions, this.onShare});

  final Widget? actions;
  final VoidCallback? onShare;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    if (actions == null && onShare == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: colors.canvas.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 22,
            offset: const Offset(0, 9),
          ),
        ],
      ),
      child: Row(
        children: [
          if (actions != null) Expanded(child: actions!),
          if (onShare != null) ...[
            if (actions != null) const SizedBox(width: 6),
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
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, this.onTap});

  final int value;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
              color: _stageInk,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: _stageInk.withValues(alpha: 0.7),
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
          const PulseFeedSkeleton(itemCount: 3)
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
  const ProfilePostTile({super.key, required this.thread, required this.onTap});

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
