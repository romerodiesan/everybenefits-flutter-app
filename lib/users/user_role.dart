enum UserRole {
  guest,
  student,
  agent,
  instructor,
  admin;

  String get wireValue => name;

  String get label => switch (this) {
        UserRole.guest => 'Invitado',
        UserRole.student => 'Estudiante',
        UserRole.agent => 'Agente',
        UserRole.instructor => 'Instructor',
        UserRole.admin => 'Admin',
      };

  static UserRole parse(String? value) {
    return UserRole.values.firstWhere(
      (role) => role.wireValue == value,
      orElse: () => UserRole.agent,
    );
  }
}
