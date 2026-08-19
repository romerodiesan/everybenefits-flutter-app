import 'package:flutter_test/flutter_test.dart';
import 'package:every_benefits/features/profile/phone_profile_verify.dart';

void main() {
  group('phone profile normalization', () {
    test('ignores formatting and country-code representation', () {
      expect(
        phoneChangedFromProfile(
          previousCode: '1',
          previousNumber: '(305) 555-0199',
          nextCode: '+1',
          nextNumber: '3055550199',
        ),
        isFalse,
      );
    });

    test('does not duplicate a country code already in the number', () {
      expect(e164Phone('+1', '+1 305 555 0199'), '+13055550199');
    });

    test('detects a real phone change', () {
      expect(
        phoneChangedFromProfile(
          previousCode: '+1',
          previousNumber: '3055550199',
          nextCode: '+1',
          nextNumber: '3055550188',
        ),
        isTrue,
      );
    });
  });
}
