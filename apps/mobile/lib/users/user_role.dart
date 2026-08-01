import '../l10n/app_localizations.dart';

enum UserRole {
  guest,
  student,
  agent,
  instructor,
  manager,
  admin;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        UserRole.guest => l10n.roleGuest,
        UserRole.student => l10n.roleStudent,
        UserRole.agent => l10n.roleAgent,
        UserRole.instructor => l10n.roleInstructor,
        UserRole.manager => l10n.roleManager,
        UserRole.admin => l10n.roleAdmin,
      };

  /// Unknown / missing values fail closed as [guest] (no elevated privileges).
  /// Legacy wire value `teacher` maps to [instructor].
  static UserRole parse(String? value) {
    if (value == 'teacher') return UserRole.instructor;
    return UserRole.values.firstWhere(
      (role) => role.wireValue == value,
      orElse: () => UserRole.guest,
    );
  }
}

/// Roles that may create group chats (teacher = instructor).
bool canCreateChatGroups(UserRole role) {
  return role == UserRole.admin ||
      role == UserRole.instructor ||
      role == UserRole.manager;
}

/// Roles auto-joined into the default staff/agents community chat.
bool belongsInDefaultAgentGroup(UserRole role) {
  return role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.manager ||
      role == UserRole.admin;
}

/// Support chat is for members who need help — not staff (admin/manager).
bool canAccessSupport(UserRole role, {required bool isAnonymous}) {
  if (isAnonymous || role == UserRole.guest) return false;
  if (role == UserRole.admin || role == UserRole.manager) return false;
  return role == UserRole.student ||
      role == UserRole.agent ||
      role == UserRole.instructor;
}
