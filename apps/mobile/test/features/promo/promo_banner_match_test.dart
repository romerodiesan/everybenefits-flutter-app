import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/promo/promo_banner_match.dart';
import 'package:every_benefits/features/promo/promo_banner_models.dart';

PromoBanner _banner({
  String id = 'b1',
  PromoBannerSurface surface = PromoBannerSurface.home,
  List<String> audiences = const ['all'],
  bool active = true,
  int? startsAt,
  int? endsAt,
  int? updatedAt,
  String href = '/academy/c1',
  bool showCta = true,
  PromoBannerFormat format = PromoBannerFormat.card,
}) {
  return withBannerCompatDefaults(
    id: id,
    surface: surface,
    active: active,
    audiences: audiences,
    startsAt: startsAt,
    endsAt: endsAt,
    updatedAt: updatedAt,
    href: href,
    showCta: showCta,
    format: format,
    eyebrow: (en: 'New', es: 'Nuevo'),
    title: (en: 'Title', es: 'Título'),
    body: (en: 'Body', es: 'Cuerpo'),
    ctaLabel: (en: 'Open', es: 'Abrir'),
  );
}

void main() {
  group('localizeBannerText', () {
    test('prefers locale then falls back', () {
      expect(
        localizeBannerText((en: 'Hello', es: 'Hola'), 'es'),
        'Hola',
      );
      expect(
        localizeBannerText((en: 'Hello', es: ''), 'es'),
        'Hello',
      );
    });
  });

  group('bannerAudienceMatches', () {
    test('all matches everyone', () {
      expect(
        bannerAudienceMatches(
          const ['all'],
          role: 'agent',
          isAnonymous: false,
        ),
        isTrue,
      );
    });

    test('guest matches anonymous', () {
      expect(
        bannerAudienceMatches(
          const ['guest'],
          role: 'guest',
          isAnonymous: true,
        ),
        isTrue,
      );
      expect(
        bannerAudienceMatches(
          const ['agent'],
          role: 'agent',
          isAnonymous: true,
        ),
        isFalse,
      );
    });
  });

  group('pickBannersForSurface', () {
    test('filters surface, schedule, audience and sorts by updatedAt', () {
      final now = DateTime.utc(2024, 6, 15).millisecondsSinceEpoch;
      final banners = [
        _banner(
          id: 'old',
          updatedAt: now - 1000,
          audiences: const ['agent'],
        ),
        _banner(
          id: 'new',
          updatedAt: now,
          audiences: const ['agent'],
        ),
        _banner(
          id: 'academy',
          surface: PromoBannerSurface.academy,
          audiences: const ['agent'],
        ),
        _banner(
          id: 'future',
          startsAt: now + 10_000,
          audiences: const ['agent'],
        ),
        _banner(
          id: 'inactive',
          active: false,
          audiences: const ['agent'],
        ),
      ];

      final picked = pickBannersForSurface(
        banners,
        PromoBannerSurface.home,
        role: 'agent',
        isAnonymous: false,
        nowMs: now,
      );
      expect(picked.map((b) => b.id).toList(), ['new', 'old']);
    });
  });

  group('isToolsHref / bannerShowsCta', () {
    test('hides tools cotizador CTAs', () {
      expect(isToolsHref('/tools/afc'), isTrue);
      expect(isToolsHref('/academy/c1'), isFalse);
      expect(bannerShowsCta(_banner(href: '/tools/afc')), isFalse);
      expect(bannerShowsCta(_banner(href: '/academy/c1')), isTrue);
      expect(bannerShowsCta(_banner(href: '', showCta: true)), isFalse);
    });
  });

  group('bannerShouldShowImage', () {
    test('text format never shows media', () {
      final banner = _banner(format: PromoBannerFormat.text);
      expect(bannerShouldShowImage(banner), isFalse);
    });
  });
}
