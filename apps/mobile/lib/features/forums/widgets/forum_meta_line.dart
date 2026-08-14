import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../app/widgets/role_badge.dart';
import '../../../l10n/l10n.dart';
import '../../../users/profile_badge.dart';
import '../../../users/user_role.dart';
import 'relative_time.dart';

/// Author meta line. Use [social] for feed-style `Name · time` (role optional).
class ForumMetaLine extends StatelessWidget {
  const ForumMetaLine({
    super.key,
    required this.authorName,
    required this.role,
    required this.at,
    this.badge,
    this.dense = false,
    this.emphasizeAuthor = false,
    this.social = false,
    this.showRole = true,
  });

  final String authorName;
  final UserRole role;
  final ProfileBadge? badge;
  final DateTime at;
  final bool dense;
  final bool emphasizeAuthor;
  final bool social;
  final bool showRole;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final muted = AppColors.of(context).muted;
    final size = dense ? 12.0 : 13.0;
    final time = formatRelativeTime(at, l10n);
    final nameStyle = theme.textTheme.bodyMedium?.copyWith(
      fontSize: size,
      height: 1.25,
      color: emphasizeAuthor && !social
          ? AppColors.brandOf(context)
          : AppColors.of(context).ink,
      fontWeight: FontWeight.w800,
    );

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      runSpacing: 2,
      children: [
        Text(
          authorName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: nameStyle,
        ),
        if (showRole && badge != null)
          RoleBadge(
            badge: badge,
            dense: true,
          ),
        Text(
          '· $time',
          style: theme.textTheme.bodyMedium?.copyWith(
            fontSize: size,
            height: 1.25,
            color: muted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
