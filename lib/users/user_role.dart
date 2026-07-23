import '../l10n/app_localizations.dart';

enum UserRole {
  guest,
  student,
  agent,
  instructor,
  admin;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        UserRole.guest => l10n.roleGuest,
        UserRole.student => l10n.roleStudent,
        UserRole.agent => l10n.roleAgent,
        UserRole.instructor => l10n.roleInstructor,
        UserRole.admin => l10n.roleAdmin,
      };

  /// Unknown / missing values fail closed as [guest] (no elevated privileges).
  static UserRole parse(String? value) {
    return UserRole.values.firstWhere(
      (role) => role.wireValue == value,
      orElse: () => UserRole.guest,
    );
  }
}
