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

  group('parseUsername', () {
    test('accepts and lowercases handles', () {
      expect(parseUsername('Gaby_01').ok, isTrue);
      expect(parseUsername('Gaby_01').value, 'gaby_01');
    });

    test('rejects invalid handles', () {
      expect(parseUsername('ab').ok, isFalse);
      expect(parseUsername('has-dash').ok, isFalse);
    });
  });

  group('mentions', () {
    test('extracts claimed handles', () {
      expect(
        parseMentions('hey @Gaby_01 and @ab and @ok_user'),
        ['gaby_01', 'ok_user'],
      );
    });

    test('ignores emails', () {
      expect(parseMentions('mail ada@example.com please'), isEmpty);
    });

    test('reads query at cursor', () {
      final query = mentionQueryAt('hi @ga', 6);
      expect(query?.start, 3);
      expect(query?.prefix, 'ga');
    });

    test('inserts handle over query', () {
      final next = insertMention('hi @ga', 6, 'gaby_01');
      expect(next.text, 'hi @gaby_01 ');
      expect(next.cursor, 12);
    });

    test('splits claimed mentions and urls', () {
      final spans = splitChatBody('see @gaby_01 https://x.test ok');
      expect(spans, [
        isA<ChatBodyText>().having((s) => s.value, 'value', 'see '),
        isA<ChatBodyMention>().having((s) => s.handle, 'handle', 'gaby_01'),
        isA<ChatBodyText>().having((s) => s.value, 'value', ' '),
        isA<ChatBodyUrl>().having((s) => s.value, 'value', 'https://x.test'),
        isA<ChatBodyText>().having((s) => s.value, 'value', ' ok'),
      ]);
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

    test('indexes username tokens', () {
      final fields = userSearchIndexFields('Ada', 'ada@example.com', 'pulse_one');
      final tokens = fields['nameTokens'] as List<String>;
      expect(tokens, contains('pu'));
      expect(tokens.any((t) => t.contains('pulse')), isTrue);
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
