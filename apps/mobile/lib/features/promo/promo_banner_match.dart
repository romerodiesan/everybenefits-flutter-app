import 'promo_banner_models.dart';

String localizeBannerText(PromoBannerLocalizedString value, String locale) {
  final key = locale.startsWith('es') ? 'es' : 'en';
  final primary = (key == 'es' ? value.es : value.en).trim();
  if (primary.isNotEmpty) return primary;
  final en = value.en.trim();
  if (en.isNotEmpty) return en;
  return value.es.trim();
}

bool bannerAudienceMatches(
  List<String> audiences, {
  required String? role,
  required bool isAnonymous,
}) {
  if (audiences.isEmpty) return false;
  if (audiences.contains('all')) return true;
  if (isAnonymous) return false;
  final normalized = (role ?? '').trim();
  if (normalized.isEmpty || normalized == 'guest') return false;
  return audiences.contains(normalized);
}

bool isBannerInSchedule(
  PromoBanner banner, {
  int? nowMs,
}) {
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  if (banner.startsAt != null && now < banner.startsAt!) return false;
  if (banner.endsAt != null && now > banner.endsAt!) return false;
  return true;
}

bool isBannerVisibleToViewer(
  PromoBanner banner, {
  required String? role,
  required bool isAnonymous,
  int? nowMs,
}) {
  if (!banner.active) return false;
  if (!isBannerInSchedule(banner, nowMs: nowMs)) return false;
  return bannerAudienceMatches(
    banner.audiences,
    role: role,
    isAnonymous: isAnonymous,
  );
}

/// Visible banners for a surface, newest `updatedAt` first.
List<PromoBanner> pickBannersForSurface(
  List<PromoBanner> banners,
  PromoBannerSurface surface, {
  required String? role,
  required bool isAnonymous,
  int? nowMs,
}) {
  final matched = banners
      .where((b) => b.surface == surface)
      .where(
        (b) => isBannerVisibleToViewer(
          b,
          role: role,
          isAnonymous: isAnonymous,
          nowMs: nowMs,
        ),
      )
      .toList();
  matched.sort((a, b) => (b.updatedAt ?? 0).compareTo(a.updatedAt ?? 0));
  return matched;
}

bool bannerShouldShowImage(PromoBanner banner) {
  if (resolveBannerFormat(banner) == PromoBannerFormat.text) return false;
  return banner.showImage;
}

/// Tools / cotizador links are web-only — never surface as mobile CTAs.
bool isToolsHref(String href) {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return false;
  final uri = Uri.tryParse(trimmed);
  if (uri == null) return false;
  if (uri.scheme == 'pulse' && uri.host.toLowerCase() == 'tools') return true;
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty) return false;
  return segments.first.toLowerCase() == 'tools';
}

bool bannerShowsCta(PromoBanner banner) {
  if (!banner.showCta) return false;
  final href = banner.href.trim();
  if (href.isEmpty) return false;
  if (isToolsHref(href)) return false;
  return true;
}
