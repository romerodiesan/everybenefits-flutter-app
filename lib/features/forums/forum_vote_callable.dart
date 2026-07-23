import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import 'forum_models.dart';

/// Calls [castForumVote] when Functions are available; returns false on miss.
class ForumVoteCallable {
  ForumVoteCallable({FirebaseFunctions? functions})
      : _functions = functions ??
            FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<bool> cast({
    required String threadId,
    String? replyId,
    required RelevanceVote vote,
  }) async {
    try {
      final callable = _functions.httpsCallable('castForumVote');
      await callable.call(<String, dynamic>{
        'threadId': threadId,
        'replyId': ?replyId,
        'vote': vote.value,
      });
      return true;
    } on FirebaseFunctionsException catch (error) {
      // Emulator / not-deployed → fall back to client transaction.
      if (error.code == 'unavailable' ||
          error.code == 'not-found' ||
          error.code == 'unimplemented') {
        debugPrint(
          'castForumVote unavailable (${error.code}); using client path',
        );
        return false;
      }
      rethrow;
    } catch (error) {
      if (useFirebaseEmulators) {
        debugPrint('castForumVote failed in emulator: $error');
        return false;
      }
      rethrow;
    }
  }
}
