import 'package:cloud_functions/cloud_functions.dart';

import '../firebase/https_callable.dart';

/// Account deactivate / scheduled deletion via Cloud Functions.
class AccountLifecycleCallable {
  AccountLifecycleCallable({
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions);

  final HttpsCallableClient _callables;

  Future<void> deactivateAccount() async {
    await _callables.call('deactivateAccount', <String, dynamic>{});
  }

  Future<Map<String, dynamic>> requestAccountDeletion() async {
    final result = await _callables.call(
      'requestAccountDeletion',
      <String, dynamic>{},
    );
    if (result is Map) {
      return Map<String, dynamic>.from(result);
    }
    return const {};
  }
}
