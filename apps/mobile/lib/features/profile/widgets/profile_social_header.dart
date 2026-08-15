import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/role_badge.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_profile.dart';
import '../../forums/forum_models.dart';
import '../../forums/widgets/relative_time.dart';
import 'profile_avatar.dart';

class ProfileSocialHeader extends StatelessWidget {
  const ProfileSocialHeader({
    super.key,
    required this.person,
    required this.posts,
    required this.replies,
    required this.likes,
    this.topBar,
    this.actions,
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
  final int replies;
  final int likes;
  final Widget? topBar;
  final Widget? actions;
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

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 128 + top * 0.25,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        cover.withValues(alpha: 0.62),
                        cover.withValues(alpha: 0.22),
                        colors.meshDeep,
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                right: -28,
                top: top + 8,
                child: IgnorePointer(
                  child: Container(
                    width: 150,
                    height: 150,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                ),
              ),
              if (topBar != null)
                Positioned(
                  top: top + 4,
                  left: 8,
                  right: 8,
                  child: topBar!,
                ),
              Positioned(
                left: AppSpacing.lg,
                bottom: -36,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colors.meshDeep,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.22),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(3),
                    child: ProfileAvatar(
                      profile: person,
                      size: 86,
                      busy: avatarBusy,
                      showEditBadge: showEditBadge,
                      onTap: onAvatarTap,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            44,
            AppSpacing.lg,
            0,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (actions != null) ...[
                Align(alignment: Alignment.centerRight, child: actions!),
                const SizedBox(height: 8),
              ],
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    person.headlineName,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.6,
                      height: 1.1,
                    ),
                  ),
                  RoleBadge(
                    badge: person.profileBadge,
                    dense: true,
                  ),
                  if (roleLabel != null && roleLabel!.trim().isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: brand.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        roleLabel!.toUpperCase(),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: brand,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.7,
                          fontSize: 10,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '@$_handle',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.muted,
                  fontWeight: FontWeight.w600,
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
              if (person.agency?.trim().isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    person.agency!.trim(),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              if (location != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    location,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.muted,
                    ),
                  ),
                ),
              if (person.bio?.trim().isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    person.bio!.trim(),
                    style: theme.textTheme.bodyLarge?.copyWith(height: 1.4),
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _Stat(value: posts, label: l10n.profileStatPosts),
                  _Stat(value: replies, label: l10n.profileStatReplies),
                  _Stat(value: likes, label: l10n.profileStatLikes),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  _FollowCount(
                    value: followerCount,
                    label: l10n.profileStatFollowers,
                    onTap: onFollowersTap,
                  ),
                  _FollowCount(
                    value: followingCount,
                    label: l10n.profileStatFollowing,
                    onTap: onFollowingTap,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FollowCount extends StatelessWidget {
  const _FollowCount({
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
    final child = Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$value ',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          TextSpan(
            text: label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
    if (onTap == null) return child;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: child,
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    return Expanded(
      child: Column(
        children: [
          Text(
            '$value',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.muted,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.9,
              fontSize: 10,
            ),
          ),
        ],
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
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.sm,
          ),
          child: Text(
            l10n.profilePosts.toUpperCase(),
            style: theme.textTheme.labelLarge?.copyWith(
              color: colors.muted,
              letterSpacing: 1.6,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (threads.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              4,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            child: Text(
              l10n.profilePostsEmpty,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < threads.length; i++) ...[
                  if (i > 0)
                    Divider(
                      height: 1,
                      color: colors.border.withValues(alpha: 0.8),
                    ),
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

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              thread.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1.3,
                letterSpacing: -0.15,
                fontSize: 14.5,
              ),
            ),
            if (thread.body.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                thread.body.replaceAll(RegExp(r'\s+'), ' ').trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colors.muted,
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: 3),
            Row(
              children: [
                Text(
                  formatRelativeTime(thread.createdAt, l10n),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(width: 10),
                Icon(Icons.favorite_rounded, size: 12, color: colors.muted),
                const SizedBox(width: 3),
                Text(
                  '${thread.score < 0 ? 0 : thread.score}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(width: 10),
                Icon(Icons.mode_comment_outlined, size: 12, color: colors.muted),
                const SizedBox(width: 3),
                Text(
                  '${thread.replyCount}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
