import '../l10n/app_localizations.dart';

enum UserRole {
  guest,
  student,
  agent,
  instructor,
  manager,
  admin,
  system;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        UserRole.guest => l10n.roleGuest,
        UserRole.student => l10n.roleStudent,
        UserRole.agent => l10n.roleAgent,
        UserRole.instructor => l10n.roleInstructor,
        UserRole.manager => l10n.roleManager,
        UserRole.admin => l10n.roleAdmin,
        // Reuse admin label until dedicated system copy exists.
        UserRole.system => l10n.roleAdmin,
      };

  /// Unknown / missing values fail closed as [guest] (no elevated privileges).
  /// Legacy wire value `teacher` maps to [instructor].
  /// Custom role slugs also fail closed on mobile until permission hydration ships.
  static UserRole parse(String? value) {
    if (value == 'teacher') return UserRole.instructor;
    return UserRole.values.firstWhere(
      (role) => role.wireValue == value,
      orElse: () => UserRole.guest,
    );
  }
}

/// Mirrors `@pulse/shared` default permission gates for built-in roles.
bool canCreateChatGroups(UserRole role) {
  return role == UserRole.admin ||
      role == UserRole.system ||
      role == UserRole.instructor ||
      role == UserRole.manager;
}

/// `chats.groups.default.join`
bool belongsInDefaultAgentGroup(UserRole role) {
  return role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.manager ||
      role == UserRole.admin ||
      role == UserRole.system;
}

/// `tools.access`
bool canAccessTools(UserRole role) {
  return role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.manager ||
      role == UserRole.admin ||
      role == UserRole.system;
}

/// `forums.participate`
bool canParticipateInForums({
  required UserRole role,
  required bool isAnonymous,
}) {
  if (isAnonymous || role == UserRole.guest) return false;
  return role == UserRole.student ||
      role == UserRole.agent ||
      role == UserRole.instructor ||
      role == UserRole.manager ||
      role == UserRole.admin ||
      role == UserRole.system;
}

/// `admin.access` / `apps.admin.access`
bool canAccessAdmin(UserRole role) {
  return role == UserRole.admin ||
      role == UserRole.manager ||
      role == UserRole.system;
}
