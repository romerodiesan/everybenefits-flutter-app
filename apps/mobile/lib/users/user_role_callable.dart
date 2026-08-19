import 'package:cloud_functions/cloud_functions.dart';

import '../firebase/https_callable.dart';
import 'user_profile.dart';
import 'user_role.dart';

/// Admin-only role changes / student directory via callables.
class UserRoleCallable {
  UserRoleCallable({
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions);

  final HttpsCallableClient _callables;

  Future<void> setRole({required String uid, required String role}) async {
    await _callables.call('setUserRole', <String, dynamic>{
      'uid': uid,
      'role': role,
    });
  }

  /// Students awaiting promotion (Admin SDK; bypasses client list rules).
  Future<List<UserProfile>> listStudentsForPromotion() async {
    final data = await _callables.call('listStudentsForPromotion');
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
