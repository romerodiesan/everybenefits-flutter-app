import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';
import '../course_models.dart';
import '../course_repository.dart';

/// Cover palette: courses without artwork still read as distinct cards.
const _coverPalette = <List<Color>>[
  [Color(0xFF98CA3F), Color(0xFF2F7D32)],
  [Color(0xFF33B1FF), Color(0xFF1E4FA3)],
  [Color(0xFFFF6B6B), Color(0xFF9B2C2C)],
  [Color(0xFFFFB84D), Color(0xFFB45309)],
  [Color(0xFFB388FF), Color(0xFF4A148C)],
  [Color(0xFF4DD0C1), Color(0xFF00695C)],
];

List<Color> coverGradientFor(String seed) {
  if (seed.isEmpty) return _coverPalette.first;
  final hash = seed.codeUnits.fold<int>(7, (acc, unit) => acc * 31 + unit);
  return _coverPalette[hash.abs() % _coverPalette.length];
}

/// Course artwork with a gradient fallback and the level as an overlay label.
class CourseCover extends StatefulWidget {
  const CourseCover({
    super.key,
    required this.course,
    required this.repository,
    this.height = 108,
    this.borderRadius = 14,
    this.showLevel = true,
  });

  final Course course;
  final CourseRepository repository;
  final double height;
  final double borderRadius;
  final bool showLevel;

  @override
  State<CourseCover> createState() => _CourseCoverState();
}

class _CourseCoverState extends State<CourseCover> {
  String? _url;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  @override
  void didUpdateWidget(covariant CourseCover oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.course.coverPath != widget.course.coverPath ||
        oldWidget.course.coverUrl != widget.course.coverUrl) {
      _url = null;
      _resolve();
    }
  }

  Future<void> _resolve() async {
    final direct = widget.course.coverUrl;
    if (direct != null && direct.trim().isNotEmpty) {
      setState(() => _url = direct.trim());
      return;
    }
    if (widget.course.coverPath == null) return;
    try {
      final resolved = await widget.repository.resolveCoverUrl(widget.course);
      if (!mounted || resolved == null) return;
      setState(() => _url = resolved);
    } catch (_) {
      // Fall back to the gradient placeholder.
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final gradient = coverGradientFor(widget.course.id);
    final url = _url;

    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    gradient.first.withValues(alpha: 0.85),
                    gradient.last.withValues(alpha: 0.9),
                  ],
                ),
              ),
            ),
            if (url != null)
              CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 180),
                errorWidget: (_, _, _) => const SizedBox.shrink(),
              ),
            if (widget.showLevel)
              Align(
                alignment: Alignment.bottomLeft,
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.42),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      widget.course.level.label(l10n).toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
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
