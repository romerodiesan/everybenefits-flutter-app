import 'package:cloud_functions/cloud_functions.dart';

/// Admin-only role changes via callable (instructor/admin assignments).
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
}
