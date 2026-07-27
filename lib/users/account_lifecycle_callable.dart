import 'package:cloud_functions/cloud_functions.dart';

/// Account deactivate / scheduled deletion via Cloud Functions.
class AccountLifecycleCallable {
  AccountLifecycleCallable({FirebaseFunctions? functions})
      : _functions =
            functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<void> deactivateAccount() async {
    await _functions.httpsCallable('deactivateAccount').call(<String, dynamic>{});
  }

  Future<Map<String, dynamic>> requestAccountDeletion() async {
    final result = await _functions
        .httpsCallable('requestAccountDeletion')
        .call(<String, dynamic>{});
    final data = result.data;
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return const {};
  }
}
