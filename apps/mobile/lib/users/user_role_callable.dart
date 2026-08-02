import 'package:cloud_functions/cloud_functions.dart';

import 'user_profile.dart';
import 'user_role.dart';

/// Admin-only role changes / student directory via callables.
class UserRoleCallable {
  UserRoleCallable({FirebaseFunctions? functions})
      : _functions = functions ??
            FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<void> setRole({required String uid, required String role}) async {
    final callable = _functions.httpsCallable('setUserRole');
    await callable.call(<String, dynamic>{
      'uid': uid,
      'role': role,
    });
  }

  /// Students awaiting promotion (Admin SDK; bypasses client list rules).
  Future<List<UserProfile>> listStudentsForPromotion() async {
    final callable = _functions.httpsCallable('listStudentsForPromotion');
    final result = await callable.call();
    final data = result.data;
    if (data is! Map) return const [];
    final raw = data['students'];
    if (raw is! List) return const [];

    final now = DateTime.now().toUtc();
    return [
      for (final entry in raw)
        if (entry is Map)
          UserProfile(
            uid: '${entry['uid'] ?? ''}',
            email: entry['email'] as String?,
            displayName: entry['displayName'] as String?,
            photoUrl: entry['photoUrl'] as String?,
            role: UserRole.parse(entry['role'] as String?),
            isAnonymous: entry['isAnonymous'] as bool? ?? false,
            profileCompleted: entry['profileCompleted'] as bool? ?? true,
            createdAt: now,
            updatedAt: now,
          ),
    ].where((p) => p.uid.isNotEmpty && p.role == UserRole.student).toList();
  }
}
