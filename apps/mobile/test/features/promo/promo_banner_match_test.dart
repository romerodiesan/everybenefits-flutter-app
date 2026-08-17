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

    test('anonymous audience never matches role targeting', () {
      expect(
        bannerAudienceMatches(
          const ['student'],
          role: 'student',
          isAnonymous: true,
        ),
        isFalse,
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

  group('promoBannerFromMap', () {
    test('parses production-shaped docs without throwing', () {
      final banner = promoBannerFromMap('welcome-everybenefits', {
        'active': true,
        'surface': 'home',
        'audiences': ['all'],
        'version': 4,
        'type': 'product_update',
        'format': 'card',
        'dismissible': true,
        'showCta': true,
        'showImage': false,
        'eyebrow': {'en': 'New', 'es': 'Nuevo'},
        'title': {'en': 'Welcome to Pulse', 'es': 'Bienvenidos a Pulse'},
        'body': {'en': 'Body', 'es': 'Cuerpo'},
        'ctaLabel': {'en': 'Privacy', 'es': 'Privacidad'},
        'href': 'https://legal.everybenefits.us',
        'imageUrl': null,
        'imagePath': null,
        'startsAt': null,
        'endsAt': null,
        'updatedBy': 'uid',
      });
      expect(banner.active, isTrue);
      expect(banner.surface, PromoBannerSurface.home);
      expect(banner.audiences, ['all']);
      expect(banner.title.en, 'Welcome to Pulse');
    });

    test('tolerates non-string fields that used to throw', () {
      final banner = promoBannerFromMap('b1', {
        'active': true,
        'surface': 'home',
        'href': 123,
        'dismissible': 1,
        'version': '2',
        'title': {'en': 'Hi', 'es': 'Hola'},
        'body': 'not-a-map',
        'updatedAt': DateTime.utc(2026, 8, 15),
      });
      expect(banner.href, isEmpty);
      expect(banner.dismissible, isTrue);
      expect(banner.version, 1);
      expect(banner.body.en, isEmpty);
      expect(banner.updatedAt, DateTime.utc(2026, 8, 15).millisecondsSinceEpoch);
    });
  });
}
