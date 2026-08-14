import 'package:flutter/widgets.dart';

import 'permissions.dart';

/// Live role permissions for the signed-in user (web `useAccess` equivalent).
class AccessScope extends InheritedWidget {
  const AccessScope({
    super.key,
    required this.roleId,
    required this.permissions,
    required super.child,
  });

  final String roleId;
  final List<String> permissions;

  /// Prefer live permissions; fall back to [roleId] slug for defaults.
  Object get access => resolveAccess(permissions, roleId);

  static AccessScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AccessScope>();
  }

  static AccessScope of(BuildContext context) {
    final scope = maybeOf(context);
    assert(scope != null, 'AccessScope not found in context');
    return scope!;
  }

  /// Access for authorization: live scope if present, else [fallbackRoleId].
  static Object accessOf(BuildContext context, {String? fallbackRoleId}) {
    final scope = maybeOf(context);
    if (scope != null) return scope.access;
    return fallbackRoleId?.trim().isNotEmpty == true
        ? fallbackRoleId!.trim()
        : 'guest';
  }

  @override
  bool updateShouldNotify(AccessScope oldWidget) {
    if (roleId != oldWidget.roleId) return true;
    if (permissions.length != oldWidget.permissions.length) return true;
    for (var i = 0; i < permissions.length; i++) {
      if (permissions[i] != oldWidget.permissions[i]) return true;
    }
    return false;
  }
}
