import 'package:cloud_functions/cloud_functions.dart';

import '../../firebase/https_callable.dart';

/// Ensures the signed-in member is in the default Team community group.
class DefaultAgentGroupCallable {
  DefaultAgentGroupCallable({
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions);

  final HttpsCallableClient _callables;

  Future<void> ensureMembership({String? uid}) async {
    final data = <String, dynamic>{};
    if (uid != null) data['uid'] = uid;
    await _callables.call('ensureDefaultAgentGroup', data);
  }
}
