import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import 'poll_models.dart';

abstract class PollStore {
  Stream<List<Poll>> watchActivePolls();
  Stream<String?> watchMyVote({required String pollId, required String uid});
  Future<void> vote({required String pollId, required String optionId});
}

class FirestorePollStore implements PollStore {
  FirestorePollStore({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
  })  : _firestore = firestore,
        _functionsOverride = functions;

  final FirebaseFirestore? _firestore;
  final FirebaseFunctions? _functionsOverride;

  FirebaseFunctions get _functions =>
      _functionsOverride ??
      FirebaseFunctions.instanceFor(region: 'us-central1');

  @override
  Stream<List<Poll>> watchActivePolls() {
    try {
      final db = _firestore ?? FirebaseFirestore.instance;
      return db
          .collection('polls')
          .where('active', isEqualTo: true)
          .snapshots()
          .map(
            (snap) => snap.docs
                .map((doc) => pollFromMap(doc.id, doc.data()))
                .toList(),
          );
    } catch (_) {
      return Stream.value(const []);
    }
  }

  @override
  Stream<String?> watchMyVote({
    required String pollId,
    required String uid,
  }) {
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
  Future<void> vote({
    required String pollId,
    required String optionId,
  }) async {
    try {
      await _functions.httpsCallable('votePoll').call(<String, dynamic>{
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
