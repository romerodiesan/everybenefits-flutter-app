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
    this.avatarBusy = false,
    this.showEditBadge = false,
  });

  final UserProfile person;
  final int posts;
  final int replies;
  final int likes;
  final Widget? topBar;
  final Widget? actions;
  final VoidCallback? onAvatarTap;
  final bool avatarBusy;
  final bool showEditBadge;

  String get _handle {
    final local = person.email?.split('@').first.trim();
    if (local != null && local.isNotEmpty) return local;
    return person.uid.length <= 8 ? person.uid : person.uid.substring(0, 8);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
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
                        brand.withValues(alpha: 0.55),
                        brand.withValues(alpha: 0.18),
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
              if (person.agency?.trim().isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    '◎ ${person.agency!.trim()}',
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
            ],
          ),
        ),
      ],
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
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            child: Text(
              l10n.profilePostsEmpty,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
          )
        else
          for (final thread in threads)
            ProfilePostTile(
              thread: thread,
              onTap: () => onOpenThread(thread),
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
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final body = thread.body.trim().replaceAll(RegExp(r'\s+'), ' ');

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: Material(
        color: colors.meshDeep,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: colors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 13, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    thread.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                      letterSpacing: -0.2,
                    ),
                  ),
                  if (body.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                        height: 1.35,
                      ),
                    ),
                  ],
                  if (thread.tags.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        for (final tag in thread.tags.take(3))
                          Text(
                            '#$tag',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: brand,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.favorite_rounded, size: 14, color: colors.muted),
                      const SizedBox(width: 4),
                      Text(
                        '${thread.score < 0 ? 0 : thread.score}',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colors.muted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Icon(Icons.mode_comment_outlined, size: 14, color: colors.muted),
                      const SizedBox(width: 4),
                      Text(
                        '${thread.replyCount}',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colors.muted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        formatRelativeTime(thread.createdAt, l10n),
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colors.muted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
