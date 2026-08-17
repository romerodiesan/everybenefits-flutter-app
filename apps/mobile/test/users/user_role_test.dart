import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/l10n/app_localizations_en.dart';
import 'package:every_benefits/users/permissions.dart';
import 'package:every_benefits/users/user_role.dart';

void main() {
  final l10n = AppLocalizationsEn();

  group('UserRole', () {
    test('parses known values including agency_owner', () {
      expect(UserRole.parse('guest'), UserRole.student);
      expect(UserRole.parse('student'), UserRole.student);
      expect(UserRole.parse('agent'), UserRole.agent);
      expect(UserRole.parse('agency_owner'), UserRole.agencyOwner);
      expect(UserRole.parse('instructor'), UserRole.instructor);
      expect(UserRole.parse('manager'), UserRole.manager);
      expect(UserRole.parse('admin'), UserRole.admin);
      expect(UserRole.parse('system'), UserRole.system);
      expect(UserRole.parse('teacher'), UserRole.instructor);
    });

    test('parse maps unknown to student; tryParseBuiltin returns null', () {
      expect(UserRole.parse('custom_ops'), UserRole.student);
      expect(UserRole.tryParseBuiltin('custom_ops'), isNull);
      expect(UserRole.parse(null), UserRole.student);
    });

    test('serializes to wire values', () {
      expect(UserRole.agencyOwner.wireValue, 'agency_owner');
      expect(UserRole.agent.wireValue, 'agent');
    });

    test('label is human readable', () {
      expect(UserRole.agencyOwner.label(l10n), 'Agency owner');
      expect(roleLabelForId('custom_ops', l10n), 'Custom Ops');
    });
  });

  group('capability helpers', () {
    test('canAccessAdmin matches staff defaults', () {
      expect(canAccessAdmin(UserRole.admin), isTrue);
      expect(canAccessAdmin(UserRole.manager), isTrue);
      expect(canAccessAdmin(UserRole.system), isTrue);
      expect(canAccessAdmin(UserRole.agent), isFalse);
      expect(canAccessAdmin('agency_owner'), isFalse);
    });

    test('agency_owner participates in forums and chats', () {
      expect(
        canParticipateInForums(
          roleOrPermissions: 'agency_owner',
          isAnonymous: false,
        ),
        isTrue,
      );
      expect(
        canParticipateInChats(
          roleOrPermissions: 'agency_owner',
          isAnonymous: false,
        ),
        isTrue,
      );
      expect(belongsInDefaultAgentGroup('agency_owner'), isTrue);
      expect(requiresLicenseProfileAccess('agency_owner'), isTrue);
    });

    test('live permission list overrides role slug', () {
      expect(
        canParticipateInForums(
          roleOrPermissions: const [Perm.forumsParticipate],
          isAnonymous: false,
        ),
        isTrue,
      );
      expect(
        canParticipateInForums(
          roleOrPermissions: const <String>[],
          isAnonymous: false,
        ),
        isFalse,
      );
    });
  });

  group('permissions defaults', () {
    test('resolveAccess prefers live permissions', () {
      final access = resolveAccess(['forums.participate'], 'guest');
      expect(access, isA<List<String>>());
      expect(access as List<String>, ['forums.participate']);
    });

    test('resolvePermissionsFromRoleDoc uses doc then defaults', () {
      final fromDoc = resolvePermissionsFromRoleDoc('student', {
        'active': true,
        'permissions': ['forums.participate', 'chats.participate'],
      });
      expect(fromDoc, ['forums.participate', 'chats.participate']);

      final fallback = resolvePermissionsFromRoleDoc('agent', null);
      expect(fallback, contains(Perm.forumsParticipate));
      expect(fallback, contains(Perm.licenseProfileRequired));
    });
  });
}
