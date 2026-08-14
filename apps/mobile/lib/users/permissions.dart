/// Permission keys + defaults mirroring `@pulse/shared` permissions.ts
/// (subset used by mobile clients + full built-in default sets).
library;

const kBuiltinRoleIds = {
  'system',
  'admin',
  'manager',
  'agency_owner',
  'agent',
  'student',
  'instructor',
  'guest',
};

/// Permission keys referenced by mobile gates / shared defaults.
abstract final class Perm {
  static const forumsParticipate = 'forums.participate';
  static const forumsModerate = 'forums.moderate';
  static const chatsParticipate = 'chats.participate';
  static const chatsGroupsCreate = 'chats.groups.create';
  static const chatsGroupsDefaultJoin = 'chats.groups.default.join';
  static const coursesAuthor = 'courses.author';
  static const coursesManage = 'courses.manage';
  static const coursesPublish = 'courses.publish';
  static const coursesEditAny = 'courses.edit.any';
  static const pathsAuthor = 'paths.author';
  static const pathsManage = 'paths.manage';
  static const pathsPublish = 'paths.publish';
  static const pathsEditAny = 'paths.edit.any';
  static const adminAccess = 'admin.access';
  static const appsAdminAccess = 'apps.admin.access';
  static const licenseProfileRequired = 'license.profile.required';
  static const toolsAccess = 'tools.access';
  static const appsStudioAccess = 'apps.studio.access';
}

String normalizeRoleId(String? roleId) {
  final trimmed = roleId?.trim() ?? '';
  if (trimmed.isEmpty) return 'guest';
  if (trimmed == 'teacher') return 'instructor';
  return trimmed;
}

bool isBuiltinRoleId(String roleId) =>
    kBuiltinRoleIds.contains(normalizeRoleId(roleId));

bool hasPermission(
  Iterable<String>? rolePermissions,
  String key,
) {
  if (rolePermissions == null) return false;
  for (final p in rolePermissions) {
    if (p == key) return true;
  }
  return false;
}

/// Prefer live permission keys; fall back to the role slug for [can] helpers.
Object resolveAccess(
  List<String>? permissions,
  String? roleId,
) {
  if (permissions != null && permissions.isNotEmpty) return permissions;
  final trimmed = roleId?.trim();
  return (trimmed == null || trimmed.isEmpty) ? 'guest' : trimmed;
}

/// Sync fallback permissions for a role slug (built-ins only; custom → []).
List<String> getDefaultPermissionsForRole(String? roleId) {
  final normalized = normalizeRoleId(roleId);
  if (normalized == 'system') {
    // Mega-role: treat as all mobile-relevant keys (+ admin platform).
    return List<String>.from(_systemPermissions);
  }
  final defaults = defaultRolePermissions[normalized];
  if (defaults != null) return List<String>.from(defaults);
  return const [];
}

List<String> resolvePermissionSet(Object? roleOrPermissions) {
  if (roleOrPermissions is List<String>) {
    return List<String>.from(roleOrPermissions);
  }
  if (roleOrPermissions is Iterable<String>) {
    return roleOrPermissions.toList();
  }
  if (roleOrPermissions is String) {
    return getDefaultPermissionsForRole(roleOrPermissions);
  }
  return const [];
}

/// Resolve permissions from a Firestore `roles/{id}` document.
List<String> resolvePermissionsFromRoleDoc(
  String roleId,
  Map<String, dynamic>? data,
) {
  final normalized = normalizeRoleId(roleId);
  if (normalized == 'system') {
    return getDefaultPermissionsForRole(normalized);
  }
  if (data != null && data['active'] != false) {
    final raw = data['permissions'];
    if (raw is List) {
      return raw.map((e) => '$e').where((k) => k.isNotEmpty).toList();
    }
  }
  return getDefaultPermissionsForRole(normalized);
}

bool can(Object? roleOrPermissions, String key) {
  return hasPermission(resolvePermissionSet(roleOrPermissions), key);
}

/// Built-in defaults aligned with `@pulse/shared` DEFAULT_ROLE_PERMISSIONS.
const Map<String, List<String>> defaultRolePermissions = {
  'admin': [
    'platform.manage',
    'platform.stats.read',
    'platform.settings.write',
    'admin.access',
    'admin.users.read',
    'admin.users.create',
    'admin.users.update',
    'admin.users.deactivate',
    'admin.roles.read',
    'admin.roles.create',
    'admin.roles.update',
    'admin.roles.delete',
    'admin.orgs.read',
    'admin.orgs.write',
    'admin.approvals.read',
    'admin.approvals.decide',
    'org.tree.read',
    'org.agency.create',
    'org.agency.update',
    'org.agency.deactivate',
    'org.node.create',
    'org.node.update',
    'courses.author',
    'courses.manage',
    'courses.publish',
    'courses.edit.any',
    'paths.author',
    'paths.manage',
    'paths.publish',
    'paths.edit.any',
    'academy.enroll',
    'academy.progress.read',
    'academy.progress.read.any',
    'academy.analytics.read',
    'tools.access',
    'tools.quotes.run',
    'license.profile.required',
    'license.profile.manage',
    'forums.participate',
    'forums.moderate',
    'chats.participate',
    'chats.groups.create',
    'chats.groups.default.join',
    'chats.groups.autojoin.configure',
    'notifications.manage',
    'apps.web.access',
    'apps.studio.access',
    'apps.admin.access',
    'apps.payments.access',
  ],
  'manager': [
    'platform.stats.read',
    'admin.access',
    'admin.users.read',
    'admin.users.update',
    'admin.roles.read',
    'admin.orgs.read',
    'admin.orgs.write',
    'admin.approvals.read',
    'admin.approvals.decide',
    'org.tree.read',
    'org.agency.create',
    'org.agency.update',
    'org.node.create',
    'org.node.update',
    'courses.author',
    'paths.author',
    'academy.progress.read',
    'academy.analytics.read',
    'tools.access',
    'tools.quotes.run',
    'license.profile.required',
    'license.profile.manage',
    'forums.participate',
    'chats.participate',
    'chats.groups.create',
    'chats.groups.default.join',
    'chats.groups.autojoin.configure',
    'apps.web.access',
    'apps.studio.access',
    'apps.admin.access',
  ],
  'agency_owner': [
    'org.tree.read',
    'org.agency.update',
    'academy.enroll',
    'academy.progress.read',
    'tools.access',
    'commission.statements.self',
    'tools.quotes.run',
    'license.profile.required',
    'license.profile.manage',
    'forums.participate',
    'chats.participate',
    'chats.groups.default.join',
    'apps.web.access',
  ],
  'agent': [
    'academy.enroll',
    'academy.progress.read',
    'tools.access',
    'tools.quotes.run',
    'license.profile.required',
    'license.profile.manage',
    'forums.participate',
    'chats.participate',
    'chats.groups.default.join',
    'apps.web.access',
    'commission.statements.self',
  ],
  'student': [
    'academy.enroll',
    'academy.progress.read',
    'forums.participate',
    'chats.participate',
    'apps.web.access',
  ],
  'instructor': [
    'courses.author',
    'paths.author',
    'academy.enroll',
    'academy.progress.read',
    'tools.access',
    'tools.quotes.run',
    'license.profile.required',
    'license.profile.manage',
    'forums.participate',
    'chats.participate',
    'chats.groups.create',
    'chats.groups.default.join',
    'apps.web.access',
    'apps.studio.access',
  ],
  'guest': [
    'apps.web.access',
  ],
};

/// Mobile-relevant union used for the system mega-role fallback.
const _systemPermissions = [
  'platform.manage',
  'admin.access',
  'apps.admin.access',
  'courses.author',
  'courses.manage',
  'courses.publish',
  'courses.edit.any',
  'paths.author',
  'paths.manage',
  'paths.publish',
  'paths.edit.any',
  'license.profile.required',
  'forums.participate',
  'forums.moderate',
  'chats.participate',
  'chats.groups.create',
  'chats.groups.default.join',
  'tools.access',
  'apps.studio.access',
  'apps.web.access',
  'academy.enroll',
];
