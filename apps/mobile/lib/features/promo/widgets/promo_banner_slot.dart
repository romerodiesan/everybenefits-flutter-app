import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_profile.dart';
import '../../chats/chat_repository.dart';
import '../../forums/forum_repository.dart';
import '../../university/course_repository.dart';
import '../promo_banner_dismiss.dart';
import '../promo_banner_match.dart';
import '../promo_banner_models.dart';
import '../promo_banner_nav.dart';
import '../promo_banner_repository.dart';

/// Watches active promos for [surface], filters audience/dismiss, and renders
/// card / strip / text layouts (tile/rail is web-only).
class PromoBannerSlot extends StatefulWidget {
  const PromoBannerSlot({
    super.key,
    required this.surface,
    required this.profile,
    this.repository,
    this.dismissStore,
    this.forumRepository,
    this.chatRepository,
    this.courseRepository,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.md,
      AppSpacing.sm,
      AppSpacing.md,
      AppSpacing.sm,
    ),
  });

  final PromoBannerSurface surface;
  final UserProfile profile;
  final PromoBannerRepository? repository;
  final PromoBannerDismissStore? dismissStore;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final CourseRepository? courseRepository;
  final EdgeInsetsGeometry padding;

  @override
  State<PromoBannerSlot> createState() => _PromoBannerSlotState();
}

class _PromoBannerSlotState extends State<PromoBannerSlot> {
  late final PromoBannerRepository _repository =
      widget.repository ?? PromoBannerRepository();
  late final PromoBannerDismissStore _dismiss =
      widget.dismissStore ?? PromoBannerDismissStore();

  StreamSubscription<List<PromoBanner>>? _sub;
  List<PromoBanner> _all = const [];
  List<PromoBanner> _visible = const [];
  int _index = 0;
  String? _imageUrl;
  bool _ready = false;

  PromoBanner? get _banner =>
      _visible.isEmpty ? null : _visible[_index.clamp(0, _visible.length - 1)];

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    _sub = _repository.watchActiveBanners().listen(
      (banners) {
        _all = banners;
        _recompute();
      },
      onError: (Object error, StackTrace stack) {
        debugPrint('PromoBannerSlot: $error\n$stack');
        if (!mounted) return;
        setState(() {
          _all = const [];
          _visible = const [];
          _ready = true;
        });
      },
    );
    await _dismiss.warm();
    if (mounted) _recompute();
  }

  @override
  void didUpdateWidget(covariant PromoBannerSlot oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid ||
        oldWidget.profile.roleId != widget.profile.roleId ||
        oldWidget.profile.isAnonymous != widget.profile.isAnonymous ||
        oldWidget.surface != widget.surface) {
      _recompute();
    }
  }

  void _recompute() {
    if (!mounted) return;
    final role = widget.profile.roleId;
    final matched = pickBannersForSurface(
      _all,
      widget.surface,
      role: role,
      isAnonymous: widget.profile.isAnonymous,
    ).where((banner) {
      if (!banner.dismissible) return true;
      return !_dismiss.isDismissedSync(banner.id, banner.version);
    }).toList();

    setState(() {
      _visible = matched;
      if (_visible.isEmpty) {
        _index = 0;
      } else if (_index >= _visible.length) {
        _index = _visible.length - 1;
      }
      _ready = true;
    });
    unawaited(_resolveImage());
  }

  Future<void> _resolveImage() async {
    final banner = _banner;
    if (banner == null || !bannerShouldShowImage(banner)) {
      if (mounted) setState(() => _imageUrl = null);
      return;
    }
    final url = await _repository.resolveImageUrl(
      imageUrl: banner.imageUrl,
      imagePath: banner.imagePath,
    );
    if (!mounted || _banner?.id != banner.id) return;
    setState(() => _imageUrl = url);
  }

  Future<void> _onDismiss() async {
    final banner = _banner;
    if (banner == null || !banner.dismissible) return;
    await _dismiss.dismiss(banner.id, banner.version);
    if (!mounted) return;
    _recompute();
  }

  Future<void> _onCta() async {
    final banner = _banner;
    if (banner == null || !bannerShowsCta(banner)) return;
    await openPromoBannerHref(
      context,
      href: banner.href,
      profile: widget.profile,
      forumRepository: widget.forumRepository,
      chatRepository: widget.chatRepository,
      courseRepository: widget.courseRepository,
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _banner == null) return const SizedBox.shrink();
    final banner = _banner!;
    final format = resolveBannerFormat(banner);
    final locale = Localizations.localeOf(context).languageCode;
    final l10n = context.l10n;

    return Padding(
      padding: widget.padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PromoBannerCard(
            banner: banner,
            format: format,
            locale: locale,
            imageUrl: _imageUrl,
            dismissLabel: l10n.promoBannerDismiss,
            onDismiss: banner.dismissible ? _onDismiss : null,
            onCta: bannerShowsCta(banner) ? _onCta : null,
          ),
          if (_visible.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _visible.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _index = i);
                        unawaited(_resolveImage());
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: i == _index ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: i == _index
                              ? AppColors.brandOf(context)
                              : AppColors.of(context).border,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PromoBannerCard extends StatelessWidget {
  const _PromoBannerCard({
    required this.banner,
    required this.format,
    required this.locale,
    required this.imageUrl,
    required this.dismissLabel,
    this.onDismiss,
    this.onCta,
  });

  final PromoBanner banner;
  final PromoBannerFormat format;
  final String locale;
  final String? imageUrl;
  final String dismissLabel;
  final VoidCallback? onDismiss;
  final VoidCallback? onCta;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final eyebrow = localizeBannerText(banner.eyebrow, locale);
    final title = localizeBannerText(banner.title, locale);
    final body = localizeBannerText(banner.body, locale);
    final cta = localizeBannerText(banner.ctaLabel, locale);

    Widget? media({double? width, double aspect = 16 / 9}) {
      if (imageUrl == null || imageUrl!.isEmpty) return null;
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: AspectRatio(
          aspectRatio: aspect,
          child: SizedBox(
            width: width,
            child: Image.network(
              imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
          ),
        ),
      );
    }

    final dismissBtn = onDismiss == null
        ? null
        : Positioned(
            top: 4,
            right: 4,
            child: IconButton(
              tooltip: dismissLabel,
              visualDensity: VisualDensity.compact,
              onPressed: onDismiss,
              icon: Icon(Icons.close_rounded, size: 18, color: colors.muted),
            ),
          );

    final ctaBtn = onCta == null
        ? null
        : TextButton(
            onPressed: onCta,
            style: TextButton.styleFrom(
              foregroundColor: brand,
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              cta.isEmpty ? '→' : '$cta →',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: brand,
              ),
            ),
          );

    final padRight = onDismiss != null ? 28.0 : 0.0;

    if (format == PromoBannerFormat.strip) {
      final m = media(width: 96, aspect: 16 / 9);
      return PulseSheet(
        padding: EdgeInsets.fromLTRB(12, 12, 12 + padRight, 12),
        child: Stack(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (m != null) ...[
                  SizedBox(width: 96, child: m),
                  const SizedBox(width: 12),
                ] else
                  Container(
                    width: 4,
                    height: 48,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: brand,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (eyebrow.isNotEmpty)
                        Text(
                          eyebrow.toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: brand,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            fontSize: 10,
                          ),
                        ),
                      Text(
                        title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
                      ),
                      if (body.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.muted,
                          ),
                        ),
                      ],
                      if (ctaBtn != null) ...[
                        const SizedBox(height: 4),
                        ctaBtn,
                      ],
                    ],
                  ),
                ),
              ],
            ),
            if (dismissBtn != null) dismissBtn,
          ],
        ),
      );
    }

    // card + text
    final m = format == PromoBannerFormat.text ? null : media();
    return PulseSheet(
      padding: EdgeInsets.zero,
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (m != null) m,
              Padding(
                padding: EdgeInsets.fromLTRB(14, 14, 14 + padRight, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (eyebrow.isNotEmpty)
                      Text(
                        eyebrow.toUpperCase(),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: brand,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          fontSize: 10,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                        letterSpacing: -0.3,
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
                          height: 1.4,
                        ),
                      ),
                    ],
                    if (ctaBtn != null) ...[
                      const SizedBox(height: 10),
                      if (format == PromoBannerFormat.card)
                        FilledButton(
                          onPressed: onCta,
                          child: Text(cta.isEmpty ? '→' : cta),
                        )
                      else
                        ctaBtn,
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (dismissBtn != null) dismissBtn,
        ],
      ),
    );
  }
}
