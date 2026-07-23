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

  /// Unknown / missing values fail closed as [guest] (no elevated privileges).
  static UserRole parse(String? value) {
    return UserRole.values.firstWhere(
      (role) => role.wireValue == value,
      orElse: () => UserRole.guest,
    );
  }
}
