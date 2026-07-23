import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_role.dart';
import 'relative_time.dart';

/// Author meta line. Use [social] for feed-style `Name · time` (role optional).
class ForumMetaLine extends StatelessWidget {
  const ForumMetaLine({
    super.key,
    required this.authorName,
    required this.role,
    required this.at,
    this.dense = false,
    this.emphasizeAuthor = false,
    this.social = false,
    this.showRole = true,
  });

  final String authorName;
  final UserRole role;
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

    if (social) {
      return Text.rich(
        TextSpan(
          style: theme.textTheme.bodyMedium?.copyWith(
            fontSize: size,
            height: 1.25,
            color: muted,
          ),
          children: [
            TextSpan(
              text: authorName,
              style: TextStyle(
                color: AppColors.of(context).ink,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (showRole)
              TextSpan(
                text: ' · ${role.label(l10n)}',
                style: TextStyle(
                  color: muted,
                  fontWeight: FontWeight.w500,
                  fontSize: size - 1,
                ),
              ),
            TextSpan(text: ' · $time'),
          ],
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      );
    }

    final base = theme.textTheme.bodyMedium?.copyWith(
      fontSize: size,
      height: 1.2,
      color: muted,
    );

    return Text.rich(
      TextSpan(
        style: base,
        children: [
          TextSpan(
            text: authorName,
            style: TextStyle(
              color: emphasizeAuthor ? AppColors.brandOf(context) : null,
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(
            text: showRole ? ' · ${role.label(l10n)} · $time' : ' · $time',
          ),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
