import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/profile_validation.dart';

void main() {
  group('composeDisplayName / splitDisplayName', () {
    test('composes given + family', () {
      expect(composeDisplayName('Ada', 'Lovelace'), 'Ada Lovelace');
    });

    test('splits display name', () {
      final parts = splitDisplayName('Ada Lovelace');
      expect(parts.givenName, 'Ada');
      expect(parts.familyName, 'Lovelace');
    });
  });

  group('validateGivenName / validateFamilyName', () {
    test('rejects email-as-name', () {
      final result = validateGivenName('ada@example.com');
      expect(result.ok, isFalse);
      expect(result.issue, DisplayNameIssue.emailAsName);
    });

    test('requires family name', () {
      final result = validateFamilyName('');
      expect(result.ok, isFalse);
      expect(result.issue, DisplayNameIssue.needLastName);
    });
  });

  group('isUserApproved', () {
    test('null/empty treated as approved (legacy)', () {
      expect(isUserApproved(null), isTrue);
      expect(isUserApproved(''), isTrue);
    });

    test('pending is not approved', () {
      expect(isUserApproved('pending'), isFalse);
      expect(isUserApproved('approved'), isTrue);
    });
  });

  group('userSearchIndexFields', () {
    test('includes lower fields and tokens', () {
      final fields = userSearchIndexFields('Gabriela', 'gaby@example.com');
      expect(fields['displayName'], 'Gabriela');
      expect(fields['displayNameLower'], 'gabriela');
      expect(fields['emailLower'], 'gaby@example.com');
      final tokens = fields['nameTokens'] as List<String>;
      expect(tokens, contains('ga'));
      expect(tokens, contains('gaby'));
    });
  });

  group('requiresLicenseProfile', () {
    test('includes agency_owner via permission defaults', () {
      expect(requiresLicenseProfile('agency_owner'), isTrue);
      expect(requiresLicenseProfile('agent'), isTrue);
      expect(requiresLicenseProfile('student'), isFalse);
    });
  });
}
