import 'package:cloud_firestore/cloud_firestore.dart';

import '../../users/avatar_storage.dart';
import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import 'forum_models.dart';
import 'forum_tags.dart';
import 'forum_vote_callable.dart';

const kForumPageSize = 20;
const kForumReplyPageSize = 50;

/// Persistence port for forums (testable without Firestore).
abstract class ForumStore {
  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  });

  Stream<ForumThread?> watchThread(String threadId);

  /// Live replies for a thread (newest page). Caller sorts with accepted id.
  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  });

  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  });

  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  });

  /// One-shot batch of the viewer's votes for the given reply ids.
  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  });

  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  });

  Future<void> updateThread({
    required String threadId,
    required String title,
    required String body,
    required List<String> tags,
  });

  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  });

  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  });

  Future<void> deleteThread(String threadId);

  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  });

  Future<void> setAcceptedReply({
    required String threadId,
    required String? replyId,
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

  /// Propagates a new avatar URL onto denormalized author fields.
  Future<void> syncAuthorPhotoUrl({
    required String authorId,
    required String? photoUrl,
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
  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  }) async {
    final orderField =
        sort == ForumSort.relevant ? 'score' : 'lastReplyAt';
    Query<Map<String, dynamic>> query = _threads;

    if (authorId != null && authorId.isNotEmpty) {
      query = query.where('authorId', isEqualTo: authorId);
    }
    if (tag != null && tag.isNotEmpty) {
      query = query.where('tags', arrayContains: tag);
    }
    query = query.orderBy(orderField, descending: true).limit(limit + 1);

    if (cursor is DocumentSnapshot<Map<String, dynamic>>) {
      query = query.startAfterDocument(cursor);
    }

    final snapshot = await query.get();
    final docs = snapshot.docs;
    final hasMore = docs.length > limit;
    final pageDocs = hasMore ? docs.sublist(0, limit) : docs;
    return ForumThreadPage(
      threads: pageDocs
          .map((doc) => ForumThread.fromMap(doc.id, doc.data()))
          .toList(),
      nextCursor: hasMore ? pageDocs.last : null,
    );
  }

  @override
  Stream<ForumThread?> watchThread(String threadId) {
    return _threads.doc(threadId).snapshots().map((snapshot) {
      if (!snapshot.exists || snapshot.data() == null) return null;
      return ForumThread.fromMap(snapshot.id, snapshot.data()!);
    });
  }

  @override
  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  }) {
    return _replies(threadId)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => ForumReply.fromMap(threadId, doc.id, doc.data()))
              .toList(),
        );
  }

  @override
  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  }) async {
    if (replyIds.isEmpty) return {};
    final snaps = await Future.wait(
      replyIds.map((id) => _replyVote(threadId, id, uid).get()),
    );
    final out = <String, RelevanceVote>{};
    for (var i = 0; i < replyIds.length; i++) {
      final value = (snaps[i].data()?['value'] as num?)?.toInt();
      out[replyIds[i]] = RelevanceVote.fromValue(value);
    }
    return out;
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
      'acceptedReplyId': null,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastReplyAt': FieldValue.serverTimestamp(),
    });
    return thread;
  }

  @override
  Future<void> updateThread({
    required String threadId,
    required String title,
    required String body,
    required List<String> tags,
  }) async {
    await _threads.doc(threadId).update({
      'title': title.trim(),
      'body': body.trim(),
      'tags': normalizeForumTags(tags),
      'updatedAt': FieldValue.serverTimestamp(),
    });
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
  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  }) async {
    await _replies(threadId).doc(replyId).update({
      'body': body.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
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
    final threadRef = _threads.doc(threadId);
    final replyRef = _replies(threadId).doc(replyId);
    final voteDocs = await replyRef.collection('votes').get();

    final remaining = await _replies(threadId)
        .orderBy('createdAt', descending: true)
        .limit(5)
        .get();
    DateTime? lastReplyAt;
    for (final doc in remaining.docs) {
      if (doc.id == replyId) continue;
      lastReplyAt = _readDate(doc.data()['createdAt']);
      break;
    }

    final threadSnap = await threadRef.get();
    final threadCreated = _readDate(threadSnap.data()?['createdAt']);
    final acceptedId = threadSnap.data()?['acceptedReplyId'] as String?;

    final batch = _firestore.batch();
    for (final vote in voteDocs.docs) {
      batch.delete(vote.reference);
    }
    batch.delete(replyRef);

    final updates = <String, Object?>{
      'replyCount': FieldValue.increment(-1),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastReplyAt': lastReplyAt != null
          ? Timestamp.fromDate(lastReplyAt.toLocal())
          : (threadCreated != null
              ? Timestamp.fromDate(threadCreated.toLocal())
              : FieldValue.serverTimestamp()),
    };
    if (acceptedId == replyId) {
      updates['acceptedReplyId'] = null;
    }
    batch.update(threadRef, updates);
    await batch.commit();
  }

  DateTime? _readDate(Object? value) {
    if (value is Timestamp) return value.toDate().toUtc();
    if (value is DateTime) return value.toUtc();
    if (value is String) return DateTime.tryParse(value)?.toUtc();
    return null;
  }

  @override
  Future<void> setAcceptedReply({
    required String threadId,
    required String? replyId,
  }) async {
    await _threads.doc(threadId).update({
      'acceptedReplyId': replyId,
      'updatedAt': FieldValue.serverTimestamp(),
    });
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

  @override
  Future<void> syncAuthorPhotoUrl({
    required String authorId,
    required String? photoUrl,
  }) async {
    final threadsSnap =
        await _threads.where('authorId', isEqualTo: authorId).get();
    final repliesSnap = await _firestore
        .collectionGroup('replies')
        .where('authorId', isEqualTo: authorId)
        .get();

    const chunk = 450;
    var batch = _firestore.batch();
    var ops = 0;

    Future<void> flush() async {
      if (ops == 0) return;
      await batch.commit();
      batch = _firestore.batch();
      ops = 0;
    }

    for (final doc in threadsSnap.docs) {
      batch.update(doc.reference, {
        'authorPhotoUrl': sanitizeOptionalAvatarDownloadUrl(photoUrl),
      });
      ops++;
      if (ops >= chunk) await flush();
    }
    for (final doc in repliesSnap.docs) {
      batch.update(doc.reference, {
        'authorPhotoUrl': sanitizeOptionalAvatarDownloadUrl(photoUrl),
      });
      ops++;
      if (ops >= chunk) await flush();
    }
    await flush();
  }
}

class ForumRepository {
  ForumRepository({
    ForumStore? store,
    ForumVoteCallable? voteCallable,
  })  : _storeOverride = store,
        _voteCallableOverride = voteCallable;

  final ForumStore? _storeOverride;
  final ForumVoteCallable? _voteCallableOverride;
  ForumVoteCallable? _voteCallableLazy;

  ForumStore get _store => _storeOverride ?? FirestoreForumStore();

  ForumVoteCallable get _voteCallable =>
      _voteCallableOverride ??
      (_voteCallableLazy ??= ForumVoteCallable());

  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  }) =>
      _store.queryThreads(
        tag: tag,
        authorId: authorId,
        sort: sort,
        limit: limit,
        cursor: cursor,
      );

  Stream<ForumThread?> watchThread(String threadId) =>
      _store.watchThread(threadId);

  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  }) =>
      _store.watchReplies(threadId, limit: limit);

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

  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  }) =>
      _store.fetchReplyVotes(
        threadId: threadId,
        uid: uid,
        replyIds: replyIds,
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

  Future<void> updateThread({
    required ForumThread thread,
    required UserProfile actor,
    required String title,
    required String body,
    required List<String> tags,
  }) {
    final allowed =
        actor.role == UserRole.admin || thread.authorId == actor.uid;
    if (!allowed) {
      throw StateError('No puedes editar esta pregunta.');
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
    return _store.updateThread(
      threadId: thread.id,
      title: trimmedTitle,
      body: trimmedBody,
      tags: normalizedTags,
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

  Future<void> updateReply({
    required ForumReply reply,
    required UserProfile actor,
    required String body,
  }) {
    final allowed =
        actor.role == UserRole.admin || reply.authorId == actor.uid;
    if (!allowed) {
      throw StateError('No puedes editar esta respuesta.');
    }
    final trimmed = body.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('La respuesta no puede estar vacía.');
    }
    return _store.updateReply(
      threadId: reply.threadId,
      replyId: reply.id,
      body: trimmed,
    );
  }

  Future<void> deleteThread({
    required ForumThread thread,
    required UserProfile actor,
  }) {
    final allowed =
        actor.role == UserRole.admin || thread.authorId == actor.uid;
    if (!allowed) {
      throw StateError('No puedes eliminar esta pregunta.');
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

  Future<void> acceptReply({
    required ForumThread thread,
    required ForumReply reply,
    required UserProfile actor,
  }) {
    final allowed =
        actor.role == UserRole.admin || thread.authorId == actor.uid;
    if (!allowed) {
      throw StateError('Solo el autor de la pregunta puede aceptar respuestas.');
    }
    if (reply.threadId != thread.id) {
      throw ArgumentError('La respuesta no pertenece a esta pregunta.');
    }
    final nextId =
        thread.acceptedReplyId == reply.id ? null : reply.id;
    return _store.setAcceptedReply(threadId: thread.id, replyId: nextId);
  }

  Future<void> setThreadRelevance({
    required ForumThread thread,
    required UserProfile actor,
    required RelevanceVote vote,
  }) async {
    if (!canParticipateInForums(
      role: actor.role,
      isAnonymous: actor.isAnonymous,
    )) {
      throw StateError('Regístrate para marcar relevancia.');
    }
    if (thread.authorId == actor.uid) {
      throw StateError('No puedes votar tu propia pregunta.');
    }
    if (_storeOverride == null) {
      final viaCallable = await _voteCallable.cast(
        threadId: thread.id,
        vote: vote,
      );
      if (viaCallable) return;
    }
    await _store.setThreadRelevance(
      threadId: thread.id,
      uid: actor.uid,
      vote: vote,
    );
  }

  Future<void> syncAuthorPhotoUrl({
    required String authorId,
    required String? photoUrl,
  }) =>
      _store.syncAuthorPhotoUrl(authorId: authorId, photoUrl: photoUrl);

  Future<void> setReplyRelevance({
    required ForumReply reply,
    required UserProfile actor,
    required RelevanceVote vote,
  }) async {
    if (!canParticipateInForums(
      role: actor.role,
      isAnonymous: actor.isAnonymous,
    )) {
      throw StateError('Regístrate para marcar relevancia.');
    }
    if (reply.authorId == actor.uid) {
      throw StateError('No puedes votar tu propia respuesta.');
    }
    if (_storeOverride == null) {
      final viaCallable = await _voteCallable.cast(
        threadId: reply.threadId,
        replyId: reply.id,
        vote: vote,
      );
      if (viaCallable) return;
    }
    await _store.setReplyRelevance(
      threadId: reply.threadId,
      replyId: reply.id,
      uid: actor.uid,
      vote: vote,
    );
  }
}
