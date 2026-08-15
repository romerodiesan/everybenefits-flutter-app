import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/phone_countries.dart';

void main() {
  group('filterPhoneCountries', () {
    test('keeps Costa Rica first and disambiguates +1', () {
      expect(kPhoneCountries.first.iso2, 'CR');
      expect(resolvePhoneCountry(iso2: 'DO', dialCode: '+1').iso2, 'DO');
      expect(resolvePhoneCountry(dialCode: '+1').iso2, 'US');
    });

    test('filters by name or digits', () {
      expect(filterPhoneCountries('espa').map((c) => c.iso2), contains('ES'));
      expect(filterPhoneCountries('506').map((c) => c.iso2), contains('CR'));
      expect(filterPhoneCountries('zzzz'), isEmpty);
    });
  });
}
