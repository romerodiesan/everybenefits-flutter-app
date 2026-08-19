import 'package:cloud_firestore/cloud_firestore.dart';

import 'permissions.dart';

/// Watches Firestore `roles/{roleId}.permissions` (web `watchRolePermissions`).
abstract class RolePermissionsStore {
  Stream<List<String>> watch(String roleId);
}

class FirestoreRolePermissionsStore implements RolePermissionsStore {
  FirestoreRolePermissionsStore({this._firestore});

  final FirebaseFirestore? _firestore;

  @override
  Stream<List<String>> watch(String roleId) {
    final normalized = normalizeRoleId(roleId);
    final defaults = getDefaultPermissionsForRole(normalized);
    try {
      final db = _firestore ?? FirebaseFirestore.instance;
      return Stream<List<String>>.multi((controller) {
        controller.add(defaults);
        final sub = db
            .collection('roles')
            .doc(normalized)
            .snapshots()
            .listen(
              (snap) {
                controller.add(
                  resolvePermissionsFromRoleDoc(normalized, snap.data()),
                );
              },
              onError: (_) {
                controller.add(defaults);
              },
            );
        controller.onCancel = sub.cancel;
      });
    } catch (_) {
      return Stream<List<String>>.value(defaults);
    }
  }
}

class RolePermissionsRepository {
  RolePermissionsRepository({RolePermissionsStore? store})
    : _store = store ?? FirestoreRolePermissionsStore();

  final RolePermissionsStore _store;

  Stream<List<String>> watch(String roleId) => _store.watch(roleId);
}
