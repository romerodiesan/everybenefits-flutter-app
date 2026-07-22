import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/forums/forum_tags.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

class FakeForumStore implements ForumStore {
  final Map<String, ForumThread> threads = {};
  final Map<String, List<ForumReply>> replies = {};
  final _threadsController =
      StreamController<List<ForumThread>>.broadcast();
  final Map<String, StreamController<List<ForumReply>>> _replyControllers = {};

  void dispose() {
    _threadsController.close();
    for (final controller in _replyControllers.values) {
      controller.close();
    }
  }

  void _emitThreads() {
    final list = threads.values.toList()
      ..sort((a, b) => b.lastReplyAt.compareTo(a.lastReplyAt));
    _threadsController.add(list);
  }

  StreamController<List<ForumReply>> _repliesFor(String threadId) {
    return _replyControllers.putIfAbsent(
      threadId,
      () => StreamController<List<ForumReply>>.broadcast(),
    );
  }

  @override
  Stream<List<ForumThread>> watchThreads({String? tag}) async* {
    var list = threads.values.toList()
      ..sort((a, b) => b.lastReplyAt.compareTo(a.lastReplyAt));
    if (tag != null) {
      list = list.where((t) => t.tags.contains(tag)).toList();
    }
    yield list;
    yield* _threadsController.stream.map((all) {
      if (tag == null) return all;
      return all.where((t) => t.tags.contains(tag)).toList();
    });
  }

  @override
  Stream<ForumThread?> watchThread(String threadId) async* {
    yield threads[threadId];
    yield* _threadsController.stream.map((_) => threads[threadId]);
  }

  @override
  Stream<List<ForumReply>> watchReplies(String threadId) async* {
    yield replies[threadId] ?? const [];
    yield* _repliesFor(threadId).stream;
  }

  @override
  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  }) async {
    final now = DateTime.utc(2024, 1, 2);
    final thread = ForumThread(
      id: 't-${threads.length + 1}',
      tags: normalizeForumTags(tags),
      title: title,
      body: body,
      authorId: author.uid,
      authorName: author.headlineName,
      authorPhotoUrl: author.photoUrl,
      authorRole: author.role,
      replyCount: 0,
      createdAt: now,
      updatedAt: now,
      lastReplyAt: now,
    );
    threads[thread.id] = thread;
    replies[thread.id] = [];
    _emitThreads();
    return thread;
  }

  @override
  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) async {
    final now = DateTime.utc(2024, 1, 3);
    final reply = ForumReply(
      id: 'r-${(replies[threadId]?.length ?? 0) + 1}',
      threadId: threadId,
      body: body,
      authorId: author.uid,
      authorName: author.headlineName,
      authorPhotoUrl: author.photoUrl,
      authorRole: author.role,
      createdAt: now,
      updatedAt: now,
    );
    replies.putIfAbsent(threadId, () => []).add(reply);
    final thread = threads[threadId]!;
    threads[threadId] = ForumThread(
      id: thread.id,
      tags: thread.tags,
      title: thread.title,
      body: thread.body,
      authorId: thread.authorId,
      authorName: thread.authorName,
      authorPhotoUrl: thread.authorPhotoUrl,
      authorRole: thread.authorRole,
      replyCount: thread.replyCount + 1,
      createdAt: thread.createdAt,
      updatedAt: now,
      lastReplyAt: now,
    );
    _emitThreads();
    _repliesFor(threadId).add(replies[threadId]!);
    return reply;
  }

  @override
  Future<void> deleteThread(String threadId) async {
    threads.remove(threadId);
    replies.remove(threadId);
    _emitThreads();
  }

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {
    replies[threadId]?.removeWhere((r) => r.id == replyId);
    _repliesFor(threadId).add(replies[threadId] ?? const []);
  }
}

UserProfile _agent() {
  return UserProfile(
    uid: 'agent-1',
    email: 'a@b.com',
    displayName: 'Ada',
    role: UserRole.agent,
    isAnonymous: false,
    profileCompleted: true,
    createdAt: DateTime.utc(2024, 1, 1),
    updatedAt: DateTime.utc(2024, 1, 1),
  );
}

UserProfile _guest() {
  return UserProfile(
    uid: 'guest-1',
    role: UserRole.guest,
    isAnonymous: true,
    profileCompleted: true,
    createdAt: DateTime.utc(2024, 1, 1),
    updatedAt: DateTime.utc(2024, 1, 1),
  );
}

void main() {
  late FakeForumStore store;
  late ForumRepository repository;

  setUp(() {
    store = FakeForumStore();
    repository = ForumRepository(store: store);
  });

  tearDown(() => store.dispose());

  test('ForumThread.fromMap parses tags and legacy categoryId', () {
    final withTags = ForumThread.fromMap('t1', {
      'tags': ['Ventas', 'NPN'],
      'title': 'Hello',
      'body': 'World',
      'authorId': 'u1',
      'authorName': 'Ada',
      'authorRole': 'agent',
      'replyCount': 2,
      'createdAt': '2024-01-01T00:00:00Z',
      'updatedAt': '2024-01-01T00:00:00Z',
      'lastReplyAt': '2024-01-02T00:00:00Z',
    });
    expect(withTags.tags, ['ventas', 'npn']);
    expect(withTags.replyCount, 2);
    expect(withTags.authorRole, UserRole.agent);

    final legacy = ForumThread.fromMap('t2', {
      'categoryId': 'productos',
      'title': 'Legacy',
      'body': 'Old thread',
      'authorId': 'u1',
      'authorName': 'Ada',
      'authorRole': 'agent',
      'replyCount': 0,
      'createdAt': '2024-01-01T00:00:00Z',
      'updatedAt': '2024-01-01T00:00:00Z',
      'lastReplyAt': '2024-01-01T00:00:00Z',
    });
    expect(legacy.tags, ['productos']);
  });

  test('normalizeForumTags caps at five unique values', () {
    expect(
      normalizeForumTags([
        'Ventas',
        ' ventas ',
        'NPN',
        'A',
        'B',
        'C',
        'D',
      ]),
      ['ventas', 'npn', 'a', 'b', 'c'],
    );
  });

  test('createThread persists for agents', () async {
    final thread = await repository.createThread(
      tags: ['general', 'ventas'],
      title: 'Primer hilo',
      body: 'Contenido de prueba largo',
      author: _agent(),
    );
    expect(thread.id, isNotEmpty);
    expect(thread.tags, ['general', 'ventas']);
    expect(store.threads[thread.id]?.title, 'Primer hilo');
  });

  test('createThread rejects empty tags', () async {
    expect(
      () => repository.createThread(
        tags: const [],
        title: 'Sin tags',
        body: 'Debería fallar por tags',
        author: _agent(),
      ),
      throwsArgumentError,
    );
  });

  test('createThread rejects guests', () async {
    expect(
      () => repository.createThread(
        tags: ['general'],
        title: 'Nope',
        body: 'Should fail',
        author: _guest(),
      ),
      throwsStateError,
    );
  });

  test('addReply increments replyCount', () async {
    final thread = await repository.createThread(
      tags: ['general'],
      title: 'Hilo',
      body: 'Cuerpo del hilo',
      author: _agent(),
    );
    await repository.addReply(
      threadId: thread.id,
      body: 'Primera respuesta',
      author: _agent(),
    );
    expect(store.threads[thread.id]?.replyCount, 1);
    expect(store.replies[thread.id], hasLength(1));
  });

  test('canParticipateInForums matches roles', () {
    expect(
      canParticipateInForums(role: UserRole.guest, isAnonymous: true),
      isFalse,
    );
    expect(
      canParticipateInForums(role: UserRole.student, isAnonymous: false),
      isTrue,
    );
    expect(
      canParticipateInForums(role: UserRole.agent, isAnonymous: false),
      isTrue,
    );
  });
}
