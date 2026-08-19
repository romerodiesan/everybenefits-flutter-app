import '../l10n/app_localizations.dart';
import 'permissions.dart';

enum UserRole {
  student,
  agent,
  agencyOwner,
  instructor,
  manager,
  admin,
  system;

  /// Firestore `users.role` wire value (snake_case for agency_owner).
  String get wireValue => switch (this) {
    UserRole.agencyOwner => 'agency_owner',
    _ => name,
  };

  String label(AppLocalizations l10n) => switch (this) {
    UserRole.student => l10n.roleStudent,
    UserRole.agent => l10n.roleAgent,
    UserRole.agencyOwner => l10n.roleAgencyOwner,
    UserRole.instructor => l10n.roleInstructor,
    UserRole.manager => l10n.roleManager,
    UserRole.admin => l10n.roleAdmin,
    UserRole.system => l10n.roleAdmin,
  };

  /// Built-in only. Returns null for custom / unknown slugs.
  static UserRole? tryParseBuiltin(String? value) {
    final normalized = normalizeRoleId(value);
    if (normalized == 'guest') return UserRole.student;
    for (final role in UserRole.values) {
      if (role.wireValue == normalized) return role;
    }
    return null;
  }

  /// Legacy / UI helper: unknown custom slugs map to [student] for enum-typed
  /// call sites. Prefer [roleId] + permissions for authorization.
  static UserRole parse(String? value) {
    return tryParseBuiltin(value) ?? UserRole.student;
  }
}

/// Display label for a Firestore role wire value (built-in or custom slug).
String roleLabelForId(String? roleId, AppLocalizations l10n) {
  final known = UserRole.tryParseBuiltin(roleId);
  if (known != null) return known.label(l10n);
  final raw = (roleId ?? '').trim();
  if (raw.isEmpty) return l10n.roleStudent;
  return raw
      .split(RegExp(r'[_\s]+'))
      .where((p) => p.isNotEmpty)
      .map((p) => '${p[0].toUpperCase()}${p.substring(1)}')
      .join(' ');
}

Object? _asAccess(Object? roleOrPermissions) {
  if (roleOrPermissions is UserRole) return roleOrPermissions.wireValue;
  return roleOrPermissions;
}

/// `chats.groups.create`
bool canCreateChatGroups(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.chatsGroupsCreate);
}

/// `chats.groups.manage`
bool canManageChatGroups(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.chatsGroupsManage);
}

/// `chats.messages.moderate`
bool canModerateChatMessages(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.chatsMessagesModerate);
}

/// `chats.contacts.all`
bool canAccessAllChatContacts(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.chatsContactsAll);
}

/// `chats.groups.default.join`
bool belongsInDefaultAgentGroup(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.chatsGroupsDefaultJoin);
}

/// `tools.access`
bool canAccessTools(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.toolsAccess);
}

/// `forums.participate`
bool canParticipateInForums({
  required Object? roleOrPermissions,
  required bool isAnonymous,
}) {
  if (isAnonymous) return false;
  final access = _asAccess(roleOrPermissions);
  if (access is String) {
    final id = normalizeRoleId(access);
    if (id.isEmpty) return false;
  }
  return can(access, Perm.forumsParticipate);
}

/// `chats.participate`
bool canParticipateInChats({
  required Object? roleOrPermissions,
  required bool isAnonymous,
}) {
  if (isAnonymous) return false;
  return can(_asAccess(roleOrPermissions), Perm.chatsParticipate);
}

/// `admin.access` / `apps.admin.access`
bool canAccessAdmin(Object? roleOrPermissions) {
  final access = _asAccess(roleOrPermissions);
  return can(access, Perm.adminAccess) || can(access, Perm.appsAdminAccess);
}

/// `forums.moderate`
bool canModerateForums(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.forumsModerate);
}

/// `courses.author`
bool canAuthorCourses(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.coursesAuthor);
}

/// `paths.author` (same gate as courses authoring for mobile)
bool canAuthorPaths(Object? roleOrPermissions) {
  final access = _asAccess(roleOrPermissions);
  return can(access, Perm.pathsAuthor) || can(access, Perm.coursesAuthor);
}

/// `courses.manage` / `courses.publish`
bool canManageCourses(Object? roleOrPermissions) {
  final access = _asAccess(roleOrPermissions);
  return can(access, Perm.coursesManage) || can(access, Perm.coursesPublish);
}

/// `license.profile.required` via permissions (defaults include agency_owner).
bool requiresLicenseProfileAccess(Object? roleOrPermissions) {
  return can(_asAccess(roleOrPermissions), Perm.licenseProfileRequired);
}
