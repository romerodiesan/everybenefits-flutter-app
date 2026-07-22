import 'package:cloud_firestore/cloud_firestore.dart';

import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import 'forum_models.dart';
import 'forum_tags.dart';

/// Persistence port for forums (testable without Firestore).
abstract class ForumStore {
  Stream<List<ForumThread>> watchThreads({String? tag});

  Stream<ForumThread?> watchThread(String threadId);

  Stream<List<ForumReply>> watchReplies(String threadId);

  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  });

  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  });

  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  });

  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  });

  Future<void> deleteThread(String threadId);

  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  });

  /// Sets the actor's relevance vote. Passing [RelevanceVote.none] clears it.
  Future<void> setThreadRelevance({
    required String threadId,
    required String uid,
    required RelevanceVote vote,
  });

  Future<void> setReplyRelevance({
    required String threadId,
    required String replyId,
    required String uid,
    required RelevanceVote vote,
  });
}

class FirestoreForumStore implements ForumStore {
  FirestoreForumStore({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _threads =>
      _firestore.collection('threads');

  CollectionReference<Map<String, dynamic>> _replies(String threadId) =>
      _threads.doc(threadId).collection('replies');

  DocumentReference<Map<String, dynamic>> _threadVote(
    String threadId,
    String uid,
  ) =>
      _threads.doc(threadId).collection('votes').doc(uid);

  DocumentReference<Map<String, dynamic>> _replyVote(
    String threadId,
    String replyId,
    String uid,
  ) =>
      _replies(threadId).doc(replyId).collection('votes').doc(uid);

  @override
  Stream<List<ForumThread>> watchThreads({String? tag}) {
    Query<Map<String, dynamic>> query = _threads.orderBy(
      'lastReplyAt',
      descending: true,
    );
    if (tag != null && tag.isNotEmpty) {
      query = _threads
          .where('tags', arrayContains: tag)
          .orderBy('lastReplyAt', descending: true);
    }
    return query.snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => ForumThread.fromMap(doc.id, doc.data()))
          .toList();
    });
  }

  @override
  Stream<ForumThread?> watchThread(String threadId) {
    return _threads.doc(threadId).snapshots().map((snapshot) {
      if (!snapshot.exists || snapshot.data() == null) return null;
      return ForumThread.fromMap(snapshot.id, snapshot.data()!);
    });
  }

  @override
  Stream<List<ForumReply>> watchReplies(String threadId) {
    return _replies(threadId).snapshots().map((snapshot) {
      final replies = snapshot.docs
          .map((doc) => ForumReply.fromMap(threadId, doc.id, doc.data()))
          .toList();
      return sortRepliesByRelevance(replies);
    });
  }

  @override
  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  }) {
    return _threadVote(threadId, uid).snapshots().map((snap) {
      final value = (snap.data()?['value'] as num?)?.toInt();
      return RelevanceVote.fromValue(value);
    });
  }

  @override
  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  }) {
    return _replyVote(threadId, replyId, uid).snapshots().map((snap) {
      final value = (snap.data()?['value'] as num?)?.toInt();
      return RelevanceVote.fromValue(value);
    });
  }

  @override
  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  }) async {
    final now = DateTime.now().toUtc();
    final doc = _threads.doc();
    final normalizedTags = normalizeForumTags(tags);
    final thread = ForumThread(
      id: doc.id,
      tags: normalizedTags,
      title: title.trim(),
      body: body.trim(),
      authorId: author.uid,
      authorName: author.headlineName,
      authorPhotoUrl: author.photoUrl,
      authorRole: author.role,
      replyCount: 0,
      score: 0,
      createdAt: now,
      updatedAt: now,
      lastReplyAt: now,
    );
    await doc.set({
      'tags': thread.tags,
      'title': thread.title,
      'body': thread.body,
      'authorId': thread.authorId,
      'authorName': thread.authorName,
      'authorPhotoUrl': thread.authorPhotoUrl,
      'authorRole': thread.authorRole.wireValue,
      'replyCount': 0,
      'score': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastReplyAt': FieldValue.serverTimestamp(),
    });
    return thread;
  }

  @override
  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) async {
    final now = DateTime.now().toUtc();
    final doc = _replies(threadId).doc();
    final reply = ForumReply(
      id: doc.id,
      threadId: threadId,
      body: body.trim(),
      authorId: author.uid,
      authorName: author.headlineName,
      authorPhotoUrl: author.photoUrl,
      authorRole: author.role,
      score: 0,
      createdAt: now,
      updatedAt: now,
    );

    final batch = _firestore.batch();
    batch.set(doc, {
      'body': reply.body,
      'authorId': reply.authorId,
      'authorName': reply.authorName,
      'authorPhotoUrl': reply.authorPhotoUrl,
      'authorRole': reply.authorRole.wireValue,
      'score': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    batch.update(_threads.doc(threadId), {
      'replyCount': FieldValue.increment(1),
      'lastReplyAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return reply;
  }

  @override
  Future<void> deleteThread(String threadId) async {
    final replies = await _replies(threadId).get();
    final batch = _firestore.batch();
    for (final doc in replies.docs) {
      final votes = await doc.reference.collection('votes').get();
      for (final vote in votes.docs) {
        batch.delete(vote.reference);
      }
      batch.delete(doc.reference);
    }
    final threadVotes = await _threads.doc(threadId).collection('votes').get();
    for (final vote in threadVotes.docs) {
      batch.delete(vote.reference);
    }
    batch.delete(_threads.doc(threadId));
    await batch.commit();
  }

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {
    final voteDocs =
        await _replies(threadId).doc(replyId).collection('votes').get();
    final batch = _firestore.batch();
    for (final vote in voteDocs.docs) {
      batch.delete(vote.reference);
    }
    batch.delete(_replies(threadId).doc(replyId));
    batch.update(_threads.doc(threadId), {
      'replyCount': FieldValue.increment(-1),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  Future<void> _applyVote({
    required DocumentReference<Map<String, dynamic>> target,
    required DocumentReference<Map<String, dynamic>> voteRef,
    required RelevanceVote next,
  }) async {
    await _firestore.runTransaction((tx) async {
      final voteSnap = await tx.get(voteRef);
      final previous = RelevanceVote.fromValue(
        (voteSnap.data()?['value'] as num?)?.toInt(),
      );
      final delta = next.value - previous.value;
      if (delta == 0) return;

      if (next == RelevanceVote.none) {
        tx.delete(voteRef);
      } else {
        tx.set(voteRef, {
          'value': next.value,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      tx.update(target, {
        'score': FieldValue.increment(delta),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  @override
  Future<void> setThreadRelevance({
    required String threadId,
    required String uid,
    required RelevanceVote vote,
  }) {
    return _applyVote(
      target: _threads.doc(threadId),
      voteRef: _threadVote(threadId, uid),
      next: vote,
    );
  }

  @override
  Future<void> setReplyRelevance({
    required String threadId,
    required String replyId,
    required String uid,
    required RelevanceVote vote,
  }) {
    return _applyVote(
      target: _replies(threadId).doc(replyId),
      voteRef: _replyVote(threadId, replyId, uid),
      next: vote,
    );
  }
}

class ForumRepository {
  ForumRepository({ForumStore? store}) : _storeOverride = store;

  final ForumStore? _storeOverride;

  ForumStore get _store => _storeOverride ?? FirestoreForumStore();

  Stream<List<ForumThread>> watchThreads({String? tag}) =>
      _store.watchThreads(tag: tag);

  Stream<ForumThread?> watchThread(String threadId) =>
      _store.watchThread(threadId);

  Stream<List<ForumReply>> watchReplies(String threadId) =>
      _store.watchReplies(threadId);

  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  }) =>
      _store.watchThreadVote(threadId: threadId, uid: uid);

  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  }) =>
      _store.watchReplyVote(
        threadId: threadId,
        replyId: replyId,
        uid: uid,
      );

  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  }) {
    if (!canParticipateInForums(
      role: author.role,
      isAnonymous: author.isAnonymous,
    )) {
      throw StateError('No tienes permiso para publicar en la comunidad.');
    }
    final trimmedTitle = title.trim();
    final trimmedBody = body.trim();
    final normalizedTags = normalizeForumTags(tags);
    if (trimmedTitle.isEmpty || trimmedBody.isEmpty) {
      throw ArgumentError('Título y contenido son obligatorios.');
    }
    if (normalizedTags.isEmpty) {
      throw ArgumentError('Agrega al menos un tag.');
    }
    return _store.createThread(
      tags: normalizedTags,
      title: trimmedTitle,
      body: trimmedBody,
      author: author,
    );
  }

  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) {
    if (!canParticipateInForums(
      role: author.role,
      isAnonymous: author.isAnonymous,
    )) {
      throw StateError('No tienes permiso para responder.');
    }
    final trimmed = body.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('La respuesta no puede estar vacía.');
    }
    return _store.addReply(
      threadId: threadId,
      body: trimmed,
      author: author,
    );
  }

  Future<void> deleteThread({
    required ForumThread thread,
    required UserProfile actor,
  }) {
    final allowed =
        actor.role == UserRole.admin || thread.authorId == actor.uid;
    if (!allowed) {
      throw StateError('No puedes eliminar este hilo.');
    }
    return _store.deleteThread(thread.id);
  }

  Future<void> deleteReply({
    required ForumReply reply,
    required UserProfile actor,
  }) {
    final allowed = actor.role == UserRole.admin || reply.authorId == actor.uid;
    if (!allowed) {
      throw StateError('No puedes eliminar esta respuesta.');
    }
    return _store.deleteReply(threadId: reply.threadId, replyId: reply.id);
  }

  Future<void> setThreadRelevance({
    required ForumThread thread,
    required UserProfile actor,
    required RelevanceVote vote,
  }) {
    if (!canParticipateInForums(
      role: actor.role,
      isAnonymous: actor.isAnonymous,
    )) {
      throw StateError('Regístrate para marcar relevancia.');
    }
    if (thread.authorId == actor.uid) {
      throw StateError('No puedes votar tu propia pregunta.');
    }
    return _store.setThreadRelevance(
      threadId: thread.id,
      uid: actor.uid,
      vote: vote,
    );
  }

  Future<void> setReplyRelevance({
    required ForumReply reply,
    required UserProfile actor,
    required RelevanceVote vote,
  }) {
    if (!canParticipateInForums(
      role: actor.role,
      isAnonymous: actor.isAnonymous,
    )) {
      throw StateError('Regístrate para marcar relevancia.');
    }
    if (reply.authorId == actor.uid) {
      throw StateError('No puedes votar tu propia respuesta.');
    }
    return _store.setReplyRelevance(
      threadId: reply.threadId,
      replyId: reply.id,
      uid: actor.uid,
      vote: vote,
    );
  }
}
