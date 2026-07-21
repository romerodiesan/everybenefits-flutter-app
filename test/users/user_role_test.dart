import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/user_role.dart';

void main() {
  group('UserRole', () {
    test('parses known values', () {
      expect(UserRole.parse('guest'), UserRole.guest);
      expect(UserRole.parse('student'), UserRole.student);
      expect(UserRole.parse('agent'), UserRole.agent);
      expect(UserRole.parse('instructor'), UserRole.instructor);
      expect(UserRole.parse('admin'), UserRole.admin);
    });

    test('falls back to agent for unknown values', () {
      expect(UserRole.parse('unknown'), UserRole.agent);
      expect(UserRole.parse(null), UserRole.agent);
    });

    test('serializes to wire values', () {
      expect(UserRole.guest.wireValue, 'guest');
      expect(UserRole.student.wireValue, 'student');
      expect(UserRole.agent.wireValue, 'agent');
      expect(UserRole.instructor.wireValue, 'instructor');
      expect(UserRole.admin.wireValue, 'admin');
    });

    test('label is human readable', () {
      expect(UserRole.guest.label, 'Invitado');
      expect(UserRole.student.label, 'Estudiante');
      expect(UserRole.agent.label, 'Agente');
      expect(UserRole.instructor.label, 'Instructor');
      expect(UserRole.admin.label, 'Admin');
    });
  });
}
