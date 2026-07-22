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
}

class FirestoreForumStore implements ForumStore {
  FirestoreForumStore({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _threads =>
      _firestore.collection('threads');

  CollectionReference<Map<String, dynamic>> _replies(String threadId) =>
      _threads.doc(threadId).collection('replies');

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
    return _replies(threadId)
        .orderBy('createdAt')
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ForumReply.fromMap(threadId, doc.id, doc.data()))
          .toList();
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
      batch.delete(doc.reference);
    }
    batch.delete(_threads.doc(threadId));
    await batch.commit();
  }

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {
    final batch = _firestore.batch();
    batch.delete(_replies(threadId).doc(replyId));
    batch.update(_threads.doc(threadId), {
      'replyCount': FieldValue.increment(-1),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
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
    final allowed = actor.role == UserRole.admin || thread.authorId == actor.uid;
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
}
