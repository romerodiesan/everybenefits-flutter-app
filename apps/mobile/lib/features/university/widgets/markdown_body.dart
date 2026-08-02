import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart' as md;
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme.dart';

/// GFM Markdown renderer for reading lessons (and AI chat).
///
/// Uses [flutter_markdown_plus] with GitHub Flavored Markdown so tables,
/// fenced code, strikethrough, and nested lists render correctly — matching
/// the web Academy player.
class MarkdownBody extends StatelessWidget {
  const MarkdownBody({super.key, required this.source});

  final String source;

  static final _safeScheme = RegExp(
    r'^(https?|mailto):',
    caseSensitive: false,
  );

  @override
  Widget build(BuildContext context) {
    final trimmed = source.trim();
    if (trimmed.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final body = theme.textTheme.bodyLarge ?? const TextStyle();

    final styleSheet = md.MarkdownStyleSheet.fromTheme(theme).copyWith(
      p: body.copyWith(height: 1.5, color: colors.ink),
      h1: (theme.textTheme.headlineSmall ?? body).copyWith(
        fontWeight: FontWeight.w800,
        color: colors.ink,
      ),
      h2: (theme.textTheme.titleLarge ?? body).copyWith(
        fontWeight: FontWeight.w800,
        color: colors.ink,
      ),
      h3: (theme.textTheme.titleMedium ?? body).copyWith(
        fontWeight: FontWeight.w800,
        color: colors.ink,
      ),
      h4: (theme.textTheme.titleSmall ?? body).copyWith(
        fontWeight: FontWeight.w700,
        color: colors.ink,
      ),
      blockquote: body.copyWith(color: colors.muted, height: 1.45),
      blockquoteDecoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: brand.withValues(alpha: 0.5), width: 2),
        ),
      ),
      blockquotePadding: const EdgeInsets.only(left: 12),
      listBullet: body.copyWith(color: colors.muted),
      a: body.copyWith(
        color: brand,
        decoration: TextDecoration.underline,
        decorationColor: brand,
      ),
      code: body.copyWith(
        fontFamily: 'monospace',
        fontSize: (body.fontSize ?? 15) * 0.9,
        backgroundColor: colors.border,
      ),
      codeblockDecoration: BoxDecoration(
        color: colors.border,
        borderRadius: BorderRadius.circular(8),
      ),
      codeblockPadding: const EdgeInsets.all(12),
      horizontalRuleDecoration: BoxDecoration(
        border: Border(top: BorderSide(color: colors.border, width: 1)),
      ),
      tableHead: body.copyWith(
        fontWeight: FontWeight.w700,
        color: colors.ink,
        fontSize: (body.fontSize ?? 15) * 0.9,
      ),
      tableBody: body.copyWith(
        color: colors.ink,
        fontSize: (body.fontSize ?? 15) * 0.9,
        height: 1.35,
      ),
      tableBorder: TableBorder.all(color: colors.border, width: 1),
      tableHeadCellsPadding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 8,
      ),
      tableCellsPadding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 8,
      ),
      tableColumnWidth: const IntrinsicColumnWidth(),
      tableCellsDecoration: BoxDecoration(color: colors.sheet),
      tableHeadCellsDecoration: BoxDecoration(
        color: colors.ink.withValues(alpha: 0.04),
      ),
    );

    return md.MarkdownBody(
      data: trimmed,
      selectable: false,
      styleSheet: styleSheet,
      softLineBreak: true,
      onTapLink: (text, href, title) {
        if (href == null || !_safeScheme.hasMatch(href)) return;
        launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
      },
    );
  }
}
