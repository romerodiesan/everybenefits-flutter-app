import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme.dart';

/// Minimal Markdown renderer for reading lessons.
///
/// Supports the same subset as the web player: `#`–`###` headings, `-`/`*` and
/// `1.` lists, `>` quotes, `---` rules, plus inline `**bold**`, `*italic*`,
/// `` `code` `` and `[text](url)`. Anything else renders as plain text.
class MarkdownBody extends StatelessWidget {
  const MarkdownBody({super.key, required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    final blocks = parseMarkdownBlocks(source);
    if (blocks.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < blocks.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _MarkdownBlockView(block: blocks[i]),
        ],
      ],
    );
  }
}

enum MarkdownBlockKind { heading, paragraph, quote, rule, bullets, numbers }

class MarkdownBlock {
  const MarkdownBlock({
    required this.kind,
    this.text = '',
    this.level = 1,
    this.items = const [],
  });

  final MarkdownBlockKind kind;
  final String text;
  final int level;
  final List<String> items;
}

/// Splits Markdown into renderable blocks. Exposed for tests.
List<MarkdownBlock> parseMarkdownBlocks(String source) {
  final lines = source.replaceAll('\r\n', '\n').split('\n');
  final blocks = <MarkdownBlock>[];
  final paragraph = <String>[];
  var items = <String>[];
  MarkdownBlockKind? listKind;

  void flushParagraph() {
    if (paragraph.isEmpty) return;
    blocks.add(
      MarkdownBlock(
        kind: MarkdownBlockKind.paragraph,
        text: paragraph.join(' '),
      ),
    );
    paragraph.clear();
  }

  void flushList() {
    if (listKind == null || items.isEmpty) {
      listKind = null;
      items = <String>[];
      return;
    }
    blocks.add(MarkdownBlock(kind: listKind!, items: items));
    listKind = null;
    items = <String>[];
  }

  void flushAll() {
    flushParagraph();
    flushList();
  }

  final heading = RegExp(r'^(#{1,3})\s+(.*)$');
  final quote = RegExp(r'^>\s?(.*)$');
  final bullet = RegExp(r'^[-*+]\s+(.*)$');
  final numbered = RegExp(r'^\d+[.)]\s+(.*)$');
  final rule = RegExp(r'^(-{3,}|\*{3,}|_{3,})$');

  for (final raw in lines) {
    final line = raw.trim();

    if (line.isEmpty) {
      flushAll();
      continue;
    }
    if (rule.hasMatch(line)) {
      flushAll();
      blocks.add(const MarkdownBlock(kind: MarkdownBlockKind.rule));
      continue;
    }

    final headingMatch = heading.firstMatch(line);
    if (headingMatch != null) {
      flushAll();
      blocks.add(
        MarkdownBlock(
          kind: MarkdownBlockKind.heading,
          level: headingMatch.group(1)!.length,
          text: headingMatch.group(2)!,
        ),
      );
      continue;
    }

    final quoteMatch = quote.firstMatch(line);
    if (quoteMatch != null) {
      flushAll();
      blocks.add(
        MarkdownBlock(
          kind: MarkdownBlockKind.quote,
          text: quoteMatch.group(1)!,
        ),
      );
      continue;
    }

    final bulletMatch = bullet.firstMatch(line);
    if (bulletMatch != null) {
      flushParagraph();
      if (listKind != MarkdownBlockKind.bullets) {
        flushList();
        listKind = MarkdownBlockKind.bullets;
      }
      items.add(bulletMatch.group(1)!);
      continue;
    }

    final numberedMatch = numbered.firstMatch(line);
    if (numberedMatch != null) {
      flushParagraph();
      if (listKind != MarkdownBlockKind.numbers) {
        flushList();
        listKind = MarkdownBlockKind.numbers;
      }
      items.add(numberedMatch.group(1)!);
      continue;
    }

    flushList();
    paragraph.add(line);
  }

  flushAll();
  return blocks;
}

class _MarkdownBlockView extends StatelessWidget {
  const _MarkdownBlockView({required this.block});

  final MarkdownBlock block;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final body = theme.textTheme.bodyLarge ?? const TextStyle();

    switch (block.kind) {
      case MarkdownBlockKind.heading:
        final style = switch (block.level) {
          1 => theme.textTheme.headlineSmall,
          2 => theme.textTheme.titleLarge,
          _ => theme.textTheme.titleMedium,
        };
        return _InlineText(
          block.text,
          style: (style ?? body).copyWith(fontWeight: FontWeight.w800),
        );

      case MarkdownBlockKind.quote:
        return Container(
          padding: const EdgeInsets.only(left: 12),
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: AppColors.brandOf(context).withValues(alpha: 0.5),
                width: 2,
              ),
            ),
          ),
          child: _InlineText(
            block.text,
            style: body.copyWith(color: colors.muted),
          ),
        );

      case MarkdownBlockKind.rule:
        return Divider(color: colors.border, height: 1);

      case MarkdownBlockKind.bullets:
      case MarkdownBlockKind.numbers:
        final ordered = block.kind == MarkdownBlockKind.numbers;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < block.items.length; i++)
              Padding(
                padding: EdgeInsets.only(top: i == 0 ? 0 : 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: ordered ? 24 : 18,
                      child: Text(
                        ordered ? '${i + 1}.' : '•',
                        style: body.copyWith(color: colors.muted),
                      ),
                    ),
                    Expanded(child: _InlineText(block.items[i], style: body)),
                  ],
                ),
              ),
          ],
        );

      case MarkdownBlockKind.paragraph:
        return _InlineText(block.text, style: body.copyWith(height: 1.5));
    }
  }
}

/// Renders bold / italic / code / link spans inside a single line.
class _InlineText extends StatefulWidget {
  const _InlineText(this.text, {required this.style});

  final String text;
  final TextStyle style;

  @override
  State<_InlineText> createState() => _InlineTextState();
}

class _InlineTextState extends State<_InlineText> {
  static final _pattern = RegExp(
    r'(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))',
  );
  static final _link = RegExp(r'^\[([^\]]+)\]\(([^)\s]+)\)$');
  static final _safeScheme = RegExp(r'^(https?|mailto):', caseSensitive: false);

  /// Recognizers outlive a single build, so the state owns them.
  final _recognizers = <TapGestureRecognizer>[];

  @override
  void dispose() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = widget.text;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final spans = <InlineSpan>[];
    var index = 0;
    var linkIndex = 0;

    void addPlain(String value) {
      if (value.isNotEmpty) spans.add(TextSpan(text: value));
    }

    for (final match in _pattern.allMatches(text)) {
      addPlain(text.substring(index, match.start));
      index = match.end;
      final token = match.group(0)!;

      if ((token.startsWith('**') && token.endsWith('**')) ||
          (token.startsWith('__') && token.endsWith('__'))) {
        spans.add(
          TextSpan(
            text: token.substring(2, token.length - 2),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        );
        continue;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        spans.add(
          TextSpan(
            text: token.substring(1, token.length - 1),
            style: TextStyle(
              fontFamily: 'monospace',
              backgroundColor: colors.border,
            ),
          ),
        );
        continue;
      }

      final link = _link.firstMatch(token);
      if (link != null) {
        final url = link.group(2)!;
        final safe = _safeScheme.hasMatch(url);
        TapGestureRecognizer? recognizer;
        if (safe) {
          // Reuse across rebuilds; links keep their order within a line.
          if (linkIndex < _recognizers.length) {
            recognizer = _recognizers[linkIndex];
          } else {
            recognizer = TapGestureRecognizer();
            _recognizers.add(recognizer);
          }
          recognizer.onTap = () => launchUrl(
                Uri.parse(url),
                mode: LaunchMode.externalApplication,
              );
          linkIndex++;
        }
        spans.add(
          TextSpan(
            text: link.group(1),
            style: TextStyle(
              color: brand,
              decoration: TextDecoration.underline,
              decorationColor: brand,
            ),
            recognizer: recognizer,
          ),
        );
        continue;
      }

      // Single-delimiter emphasis is the only case left.
      spans.add(
        TextSpan(
          text: token.substring(1, token.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic),
        ),
      );
    }
    addPlain(text.substring(index));

    return Text.rich(TextSpan(style: widget.style, children: spans));
  }
}
