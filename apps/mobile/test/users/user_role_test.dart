import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/l10n/app_localizations_en.dart';
import 'package:every_benefits/users/user_role.dart';

void main() {
  final l10n = AppLocalizationsEn();

  group('UserRole', () {
    test('parses known values', () {
      expect(UserRole.parse('guest'), UserRole.guest);
      expect(UserRole.parse('student'), UserRole.student);
      expect(UserRole.parse('agent'), UserRole.agent);
      expect(UserRole.parse('instructor'), UserRole.instructor);
      expect(UserRole.parse('manager'), UserRole.manager);
      expect(UserRole.parse('admin'), UserRole.admin);
      expect(UserRole.parse('system'), UserRole.system);
    });

    test('falls back to guest for unknown values', () {
      expect(UserRole.parse('unknown'), UserRole.guest);
      expect(UserRole.parse(null), UserRole.guest);
    });

    test('serializes to wire values', () {
      expect(UserRole.guest.wireValue, 'guest');
      expect(UserRole.student.wireValue, 'student');
      expect(UserRole.agent.wireValue, 'agent');
      expect(UserRole.instructor.wireValue, 'instructor');
      expect(UserRole.manager.wireValue, 'manager');
      expect(UserRole.admin.wireValue, 'admin');
      expect(UserRole.system.wireValue, 'system');
    });

    test('label is human readable', () {
      expect(UserRole.guest.label(l10n), 'Guest');
      expect(UserRole.student.label(l10n), 'Student');
      expect(UserRole.agent.label(l10n), 'Agent');
      expect(UserRole.instructor.label(l10n), 'Instructor');
      expect(UserRole.manager.label(l10n), 'Manager');
      expect(UserRole.admin.label(l10n), 'Admin');
      expect(UserRole.system.label(l10n), 'Admin');
    });
  });

  group('capability helpers', () {
    test('canAccessAdmin matches staff defaults', () {
      expect(canAccessAdmin(UserRole.admin), isTrue);
      expect(canAccessAdmin(UserRole.manager), isTrue);
      expect(canAccessAdmin(UserRole.system), isTrue);
      expect(canAccessAdmin(UserRole.agent), isFalse);
    });
  });
}
