import 'package:cloud_firestore/cloud_firestore.dart';

/// Promo banner types aligned with `@pulse/shared` banners module.

const promoBannerSurfaces = ['home', 'rail', 'academy'];
const promoBannerTypes = ['promo', 'product_update', 'education'];
const promoBannerFormats = ['card', 'tile', 'strip', 'text'];
const promoBannerAudiences = [
  'all',
  'guest',
  'student',
  'agent',
  'agency_owner',
  'instructor',
  'manager',
  'admin',
];

typedef PromoBannerLocalizedString = ({String en, String es});

enum PromoBannerSurface { home, rail, academy }

enum PromoBannerFormat { card, tile, strip, text }

enum PromoBannerType { promo, productUpdate, education }

PromoBannerSurface parsePromoBannerSurface(String? raw) {
  switch (raw) {
    case 'rail':
      return PromoBannerSurface.rail;
    case 'academy':
      return PromoBannerSurface.academy;
    default:
      return PromoBannerSurface.home;
  }
}

PromoBannerFormat parsePromoBannerFormat(String? raw) {
  switch (raw) {
    case 'tile':
      return PromoBannerFormat.tile;
    case 'strip':
      return PromoBannerFormat.strip;
    case 'text':
      return PromoBannerFormat.text;
    default:
      return PromoBannerFormat.card;
  }
}

PromoBannerType parsePromoBannerType(String? raw) {
  switch (raw) {
    case 'product_update':
      return PromoBannerType.productUpdate;
    case 'education':
      return PromoBannerType.education;
    default:
      return PromoBannerType.promo;
  }
}

PromoBannerFormat defaultFormatForSurface(PromoBannerSurface surface) {
  switch (surface) {
    case PromoBannerSurface.rail:
      return PromoBannerFormat.tile;
    case PromoBannerSurface.academy:
      return PromoBannerFormat.strip;
    case PromoBannerSurface.home:
      return PromoBannerFormat.card;
  }
}

bool isFormatAllowedForSurface(
  PromoBannerSurface surface,
  PromoBannerFormat format,
) {
  switch (surface) {
    case PromoBannerSurface.home:
      return format == PromoBannerFormat.card || format == PromoBannerFormat.text;
    case PromoBannerSurface.rail:
      return format == PromoBannerFormat.tile || format == PromoBannerFormat.text;
    case PromoBannerSurface.academy:
      return format == PromoBannerFormat.strip ||
          format == PromoBannerFormat.text;
  }
}

PromoBannerFormat resolveBannerFormat(PromoBanner banner) {
  if (isFormatAllowedForSurface(banner.surface, banner.format)) {
    return banner.format;
  }
  return defaultFormatForSurface(banner.surface);
}

class PromoBanner {
  const PromoBanner({
    required this.id,
    required this.version,
    required this.active,
    required this.type,
    required this.format,
    required this.surface,
    required this.audiences,
    required this.dismissible,
    required this.showCta,
    required this.showImage,
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.ctaLabel,
    required this.href,
    this.imageUrl,
    this.imagePath,
    this.startsAt,
    this.endsAt,
    this.createdAt,
    this.updatedAt,
    this.updatedBy,
  });

  final String id;
  final int version;
  final bool active;
  final PromoBannerType type;
  final PromoBannerFormat format;
  final PromoBannerSurface surface;
  final List<String> audiences;
  final bool dismissible;
  final bool showCta;
  final bool showImage;
  final PromoBannerLocalizedString eyebrow;
  final PromoBannerLocalizedString title;
  final PromoBannerLocalizedString body;
  final PromoBannerLocalizedString ctaLabel;
  final String href;
  final String? imageUrl;
  final String? imagePath;
  final int? startsAt;
  final int? endsAt;
  final int? createdAt;
  final int? updatedAt;
  final String? updatedBy;
}

PromoBannerLocalizedString localizedBannerString(Object? value) {
  if (value is! Map) return (en: '', es: '');
  final map = Map<String, dynamic>.from(value);
  return (
    en: (map['en'] as String?) ?? '',
    es: (map['es'] as String?) ?? '',
  );
}

int? millisOrNull(Object? value) {
  if (value == null) return null;
  if (value is Timestamp) return value.millisecondsSinceEpoch;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return null;
}

/// Apply defaults for documents written before type/format/toggles existed.
PromoBanner withBannerCompatDefaults({
  required String id,
  required PromoBannerSurface surface,
  required PromoBannerLocalizedString eyebrow,
  required PromoBannerLocalizedString title,
  required PromoBannerLocalizedString body,
  int? version,
  bool? active,
  PromoBannerType? type,
  PromoBannerFormat? format,
  List<String>? audiences,
  bool? dismissible,
  bool? showCta,
  bool? showImage,
  PromoBannerLocalizedString? ctaLabel,
  String? href,
  String? imageUrl,
  String? imagePath,
  int? startsAt,
  int? endsAt,
  int? createdAt,
  int? updatedAt,
  String? updatedBy,
}) {
  final hasMedia =
      (imageUrl?.isNotEmpty ?? false) || (imagePath?.isNotEmpty ?? false);
  final resolvedFormat =
      format != null && isFormatAllowedForSurface(surface, format)
          ? format
          : defaultFormatForSurface(surface);

  return PromoBanner(
    id: id,
    version: version ?? 1,
    active: active == true,
    type: type ?? PromoBannerType.promo,
    format: resolvedFormat,
    surface: surface,
    audiences: (audiences != null && audiences.isNotEmpty)
        ? audiences
        : const ['all'],
    dismissible: dismissible != false,
    showCta: showCta != false,
    showImage: showImage ?? hasMedia,
    eyebrow: eyebrow,
    title: title,
    body: body,
    ctaLabel: ctaLabel ?? (en: '', es: ''),
    href: href ?? '',
    imageUrl: imageUrl,
    imagePath: imagePath,
    startsAt: startsAt,
    endsAt: endsAt,
    createdAt: createdAt,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
  );
}

PromoBanner promoBannerFromMap(String id, Map<String, dynamic> data) {
  final surface = parsePromoBannerSurface(data['surface'] as String?);
  final rawFormat = data['format'] as String?;
  final format = rawFormat == null ? null : parsePromoBannerFormat(rawFormat);
  final imageUrl = data['imageUrl'] as String?;
  final imagePath = data['imagePath'] as String?;

  return withBannerCompatDefaults(
    id: id,
    version: (data['version'] as num?)?.toInt(),
    active: data['active'] == true,
    type: data['type'] is String
        ? parsePromoBannerType(data['type'] as String)
        : null,
    format: format,
    surface: surface,
    audiences: data['audiences'] is List
        ? (data['audiences'] as List).map((e) => e.toString()).toList()
        : const ['all'],
    dismissible: data['dismissible'] as bool?,
    showCta: data['showCta'] as bool?,
    showImage: data['showImage'] as bool?,
    eyebrow: localizedBannerString(data['eyebrow']),
    title: localizedBannerString(data['title']),
    body: localizedBannerString(data['body']),
    ctaLabel: localizedBannerString(data['ctaLabel']),
    href: data['href'] as String? ?? '',
    imageUrl: imageUrl,
    imagePath: imagePath,
    startsAt: millisOrNull(data['startsAt']),
    endsAt: millisOrNull(data['endsAt']),
    createdAt: millisOrNull(data['createdAt']),
    updatedAt: millisOrNull(data['updatedAt']),
    updatedBy: data['updatedBy'] as String?,
  );
}
