import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import '../../firebase/https_callable.dart';
import 'forum_models.dart';

/// Calls [castForumVote]. Votes are server-only (Firestore rules deny client
/// writes to `votes` / `score`), so this never soft-fails into a client path.
class ForumVoteCallable {
  ForumVoteCallable({
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions);

  final HttpsCallableClient _callables;

  /// Returns `true` on success.
  ///
  /// Returns `false` only when the Functions emulator is missing the deploy
  /// (`not-found` / `unimplemented` / `unavailable`) so callers can surface a
  /// clear "service unavailable" error. All other failures rethrow.
  Future<bool> cast({
    required String threadId,
    String? replyId,
    required RelevanceVote vote,
  }) async {
    try {
      await _callables.call('castForumVote', <String, dynamic>{
        'threadId': threadId,
        'replyId': ?replyId,
        'vote': vote.value,
      });
      return true;
    } on FirebaseFunctionsException catch (error) {
      if (useFirebaseEmulators &&
          (error.code == 'unavailable' ||
              error.code == 'not-found' ||
              error.code == 'unimplemented')) {
        debugPrint(
          'castForumVote missing in emulator (${error.code})',
        );
        return false;
      }
      rethrow;
    }
  }
}
