import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import '../../firebase/https_callable.dart';
import 'poll_models.dart';

abstract class PollStore {
  Stream<List<Poll>> watchActivePolls();
  Stream<String?> watchMyVote({required String pollId, required String uid});
  Future<void> vote({required String pollId, required String optionId});
}

class FirestorePollStore implements PollStore {
  FirestorePollStore({
    this._firestore,
    FirebaseFunctions? functions,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions);

  final FirebaseFirestore? _firestore;
  final HttpsCallableClient _callables;

  @override
  Stream<List<Poll>> watchActivePolls() {
    try {
      final db = _firestore ?? FirebaseFirestore.instance;
      return db
          .collection('polls')
          .where('active', isEqualTo: true)
          .snapshots()
          .map((snap) {
            final polls = <Poll>[];
            for (final doc in snap.docs) {
              try {
                polls.add(pollFromMap(doc.id, doc.data()));
              } catch (error, stack) {
                debugPrint('poll parse ${doc.id}: $error\n$stack');
              }
            }
            return polls;
          });
    } catch (_) {
      return Stream.value(const []);
    }
  }

  @override
  Stream<String?> watchMyVote({required String pollId, required String uid}) {
    if (pollId.isEmpty || uid.isEmpty) return Stream.value(null);
    try {
      final db = _firestore ?? FirebaseFirestore.instance;
      return db
          .collection('polls')
          .doc(pollId)
          .collection('votes')
          .doc(uid)
          .snapshots()
          .map((snap) {
            final optionId = snap.data()?['optionId'];
            return optionId is String && optionId.isNotEmpty ? optionId : null;
          });
    } catch (_) {
      return Stream.value(null);
    }
  }

  @override
  Future<void> vote({required String pollId, required String optionId}) async {
    try {
      await _callables.call('votePoll', <String, dynamic>{
        'pollId': pollId,
        'optionId': optionId,
      });
    } on FirebaseFunctionsException catch (error) {
      if (useFirebaseEmulators &&
          (error.code == 'unavailable' ||
              error.code == 'not-found' ||
              error.code == 'unimplemented')) {
        debugPrint('votePoll missing in emulator (${error.code})');
        return;
      }
      rethrow;
    }
  }
}

class PollRepository {
  PollRepository({PollStore? store}) : _store = store ?? FirestorePollStore();

  final PollStore _store;

  Stream<List<Poll>> watchActivePolls() => _store.watchActivePolls();

  Stream<String?> watchMyVote({required String pollId, required String uid}) =>
      _store.watchMyVote(pollId: pollId, uid: uid);

  Future<void> vote({required String pollId, required String optionId}) =>
      _store.vote(pollId: pollId, optionId: optionId);
}
