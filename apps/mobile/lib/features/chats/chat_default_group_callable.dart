import 'package:cloud_functions/cloud_functions.dart';

/// Ensures the signed-in staff member is in the default community group.
class DefaultAgentGroupCallable {
  DefaultAgentGroupCallable({FirebaseFunctions? functions})
      : _functions = functions ??
            FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<void> ensureMembership({String? uid}) async {
    final callable = _functions.httpsCallable('ensureDefaultAgentGroup');
    final data = <String, dynamic>{};
    if (uid != null) data['uid'] = uid;
    await callable.call(data);
  }
}
