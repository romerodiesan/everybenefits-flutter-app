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
  final Map<String, RelevanceVote> threadVotes = {};
  final Map<String, RelevanceVote> replyVotes = {};
  final _threadsController =
      StreamController<List<ForumThread>>.broadcast();
  final Map<String, StreamController<List<ForumReply>>> _replyControllers = {};
  final Map<String, StreamController<RelevanceVote>> _voteControllers = {};

  void dispose() {
    _threadsController.close();
    for (final controller in _replyControllers.values) {
      controller.close();
    }
    for (final controller in _voteControllers.values) {
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

  String _threadVoteKey(String threadId, String uid) => '$threadId|$uid';
  String _replyVoteKey(String threadId, String replyId, String uid) =>
      '$threadId|$replyId|$uid';

  StreamController<RelevanceVote> _voteController(String key) {
    return _voteControllers.putIfAbsent(
      key,
      () => StreamController<RelevanceVote>.broadcast(),
    );
  }

  @override
  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  }) async {
    var list = threads.values.toList();
    if (tag != null) {
      list = list.where((t) => t.tags.contains(tag)).toList();
    }
    if (authorId != null) {
      list = list.where((t) => t.authorId == authorId).toList();
    }
    list = filterAndSortThreads(list, sort: sort);
    final start = cursor is int ? cursor : 0;
    final end = (start + limit).clamp(0, list.length);
    final page = list.sublist(start.clamp(0, list.length), end);
    final next = end < list.length ? end : null;
    return ForumThreadPage(threads: page, nextCursor: next);
  }

  @override
  Stream<ForumThread?> watchThread(String threadId) async* {
    yield threads[threadId];
    yield* _threadsController.stream.map((_) => threads[threadId]);
  }

  @override
  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  }) async* {
    yield (replies[threadId] ?? const []).take(limit).toList();
    yield* _repliesFor(threadId).stream.map(
          (list) => list.take(limit).toList(),
        );
  }

  @override
  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  }) async* {
    final key = _threadVoteKey(threadId, uid);
    yield threadVotes[key] ?? RelevanceVote.none;
    yield* _voteController(key).stream;
  }

  @override
  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  }) async* {
    final key = _replyVoteKey(threadId, replyId, uid);
    yield replyVotes[key] ?? RelevanceVote.none;
    yield* _voteController(key).stream;
  }

  @override
  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  }) async {
    final out = <String, RelevanceVote>{};
    for (final id in replyIds) {
      final key = _replyVoteKey(threadId, id, uid);
      out[id] = replyVotes[key] ?? RelevanceVote.none;
    }
    return out;
  }

  @override
  Future<Map<String, RelevanceVote>> fetchThreadVotes({
    required String uid,
    required List<String> threadIds,
  }) async {
    final out = <String, RelevanceVote>{};
    for (final id in threadIds) {
      final key = _threadVoteKey(id, uid);
      out[id] = threadVotes[key] ?? RelevanceVote.none;
    }
    return out;
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
      score: 0,
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
  Future<void> updateThread({
    required String threadId,
    required String title,
    required String body,
    required List<String> tags,
  }) async {
    final thread = threads[threadId]!;
    threads[threadId] = thread.copyWith(
      title: title,
      body: body,
      tags: normalizeForumTags(tags),
      updatedAt: DateTime.utc(2024, 1, 4),
    );
    _emitThreads();
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
      score: 0,
      createdAt: now,
      updatedAt: now,
    );
    replies.putIfAbsent(threadId, () => []).add(reply);
    final thread = threads[threadId]!;
    threads[threadId] = thread.copyWith(
      replyCount: thread.replyCount + 1,
      updatedAt: now,
      lastReplyAt: now,
    );
    _emitThreads();
    _repliesFor(threadId).add(replies[threadId]!);
    return reply;
  }

  @override
  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  }) async {
    final list = replies[threadId]!;
    final index = list.indexWhere((r) => r.id == replyId);
    list[index] = list[index].copyWith(
      body: body,
      updatedAt: DateTime.utc(2024, 1, 4),
    );
    _repliesFor(threadId).add(list);
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
    final list = replies[threadId] ?? [];
    list.removeWhere((r) => r.id == replyId);
    replies[threadId] = list;
    final thread = threads[threadId];
    if (thread != null) {
      DateTime lastReplyAt = thread.createdAt;
      if (list.isNotEmpty) {
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        lastReplyAt = list.first.createdAt;
      }
      threads[threadId] = thread.copyWith(
        replyCount: thread.replyCount - 1,
        lastReplyAt: lastReplyAt,
        updatedAt: DateTime.utc(2024, 1, 5),
        clearAcceptedReplyId: thread.acceptedReplyId == replyId,
      );
      _emitThreads();
    }
    _repliesFor(threadId).add(list);
  }

  @override
  Future<void> setAcceptedReply({
    required String threadId,
    required String? replyId,
  }) async {
    final thread = threads[threadId]!;
    threads[threadId] = replyId == null
        ? thread.copyWith(clearAcceptedReplyId: true)
        : thread.copyWith(acceptedReplyId: replyId);
    _emitThreads();
    _repliesFor(threadId).add(replies[threadId] ?? const []);
  }

  @override
  Future<void> setThreadRelevance({
    required String threadId,
    required String uid,
    required RelevanceVote vote,
  }) async {
    final key = _threadVoteKey(threadId, uid);
    final previous = threadVotes[key] ?? RelevanceVote.none;
    final delta = vote.value - previous.value;
    if (vote == RelevanceVote.none) {
      threadVotes.remove(key);
    } else {
      threadVotes[key] = vote;
    }
    final thread = threads[threadId]!;
    threads[threadId] = thread.copyWith(score: thread.score + delta);
    _emitThreads();
    _voteController(key).add(vote);
  }

  @override
  Future<void> setReplyRelevance({
    required String threadId,
    required String replyId,
    required String uid,
    required RelevanceVote vote,
  }) async {
    final key = _replyVoteKey(threadId, replyId, uid);
    final previous = replyVotes[key] ?? RelevanceVote.none;
    final delta = vote.value - previous.value;
    if (vote == RelevanceVote.none) {
      replyVotes.remove(key);
    } else {
      replyVotes[key] = vote;
    }
    final list = replies[threadId]!;
    final index = list.indexWhere((r) => r.id == replyId);
    list[index] = list[index].copyWith(score: list[index].score + delta);
    _repliesFor(threadId).add(list);
    _voteController(key).add(vote);
  }

  @override
  Future<void> syncAuthorPhotoUrl({
    required String authorId,
    required String? photoUrl,
  }) async {
    for (final entry in threads.entries.toList()) {
      if (entry.value.authorId != authorId) continue;
      threads[entry.key] = entry.value.copyWith(authorPhotoUrl: photoUrl);
    }
    for (final entry in replies.entries.toList()) {
      final list = entry.value;
      var changed = false;
      final next = <ForumReply>[];
      for (final reply in list) {
        if (reply.authorId == authorId) {
          next.add(reply.copyWith(authorPhotoUrl: photoUrl));
          changed = true;
        } else {
          next.add(reply);
        }
      }
      if (changed) {
        replies[entry.key] = next;
        _repliesFor(entry.key).add(next);
      }
    }
    _emitThreads();
  }
}

UserProfile _agent({String uid = 'agent-1'}) {
  return UserProfile(
    uid: uid,
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

  test('ForumThread.fromMap parses tags, score and legacy categoryId', () {
    final withTags = ForumThread.fromMap('t1', {
      'tags': ['Ventas', 'NPN'],
      'title': 'Hello',
      'body': 'World',
      'authorId': 'u1',
      'authorName': 'Ada',
      'authorRole': 'agent',
      'replyCount': 2,
      'score': 4,
      'createdAt': '2024-01-01T00:00:00Z',
      'updatedAt': '2024-01-01T00:00:00Z',
      'lastReplyAt': '2024-01-02T00:00:00Z',
    });
    expect(withTags.tags, ['ventas', 'npn']);
    expect(withTags.replyCount, 2);
    expect(withTags.score, 4);
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
    expect(legacy.score, 0);
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
    expect(thread.score, 0);
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

  test('relevance vote updates score and can be toggled off', () async {
    final author = _agent(uid: 'author');
    final voter = _agent(uid: 'voter');
    final thread = await repository.createThread(
      tags: ['general'],
      title: '¿Cómo renuevo NPN?',
      body: 'Detalle de la pregunta',
      author: author,
    );

    await repository.setThreadRelevance(
      thread: thread,
      actor: voter,
      vote: RelevanceVote.up,
    );
    expect(store.threads[thread.id]?.score, 1);

    await repository.setThreadRelevance(
      thread: store.threads[thread.id]!,
      actor: voter,
      vote: RelevanceVote.down,
    );
    expect(store.threads[thread.id]?.score, -1);

    await repository.setThreadRelevance(
      thread: store.threads[thread.id]!,
      actor: voter,
      vote: RelevanceVote.none,
    );
    expect(store.threads[thread.id]?.score, 0);
  });

  test('author cannot vote own question', () async {
    final author = _agent();
    final thread = await repository.createThread(
      tags: ['general'],
      title: 'Propia',
      body: 'No debería poder votarse a sí misma',
      author: author,
    );
    expect(
      () => repository.setThreadRelevance(
        thread: thread,
        actor: author,
        vote: RelevanceVote.up,
      ),
      throwsStateError,
    );
  });

  test('filterAndSortThreads finds questions and sorts by relevance', () {
    final now = DateTime.utc(2024, 1, 1);
    final threads = [
      ForumThread(
        id: '1',
        tags: const ['npn'],
        title: 'Renovar NPN',
        body: 'Pasos anuales',
        authorId: 'a',
        authorName: 'Ada',
        authorRole: UserRole.agent,
        replyCount: 0,
        score: 2,
        createdAt: now,
        updatedAt: now,
        lastReplyAt: now.add(const Duration(hours: 1)),
      ),
      ForumThread(
        id: '2',
        tags: const ['ventas'],
        title: 'Cierre de mes',
        body: 'Tips de pipeline',
        authorId: 'a',
        authorName: 'Ada',
        authorRole: UserRole.agent,
        replyCount: 1,
        score: 9,
        createdAt: now,
        updatedAt: now,
        lastReplyAt: now.add(const Duration(hours: 2)),
      ),
    ];

    final found = filterAndSortThreads(threads, query: 'npn');
    expect(found, hasLength(1));
    expect(found.first.id, '1');

    final relevant = filterAndSortThreads(
      threads,
      sort: ForumSort.relevant,
    );
    expect(relevant.first.id, '2');
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
    expect(
      canParticipateInForums(role: UserRole.manager, isAnonymous: false),
      isTrue,
    );
  });

  test('updateThread allows author and rejects strangers', () async {
    final author = _agent(uid: 'author');
    final other = _agent(uid: 'other');
    final thread = await repository.createThread(
      tags: ['general'],
      title: 'Original',
      body: 'Cuerpo original de la pregunta',
      author: author,
    );

    await repository.updateThread(
      thread: thread,
      actor: author,
      title: 'Editada',
      body: 'Cuerpo editado de la pregunta',
      tags: ['npn'],
    );
    expect(store.threads[thread.id]?.title, 'Editada');
    expect(store.threads[thread.id]?.tags, ['npn']);

    expect(
      () => repository.updateThread(
        thread: store.threads[thread.id]!,
        actor: other,
        title: 'Hack',
        body: 'No debería pasar',
        tags: ['general'],
      ),
      throwsStateError,
    );
  });

  test('acceptReply toggles and only question author can accept', () async {
    final author = _agent(uid: 'author');
    final answerer = _agent(uid: 'answerer');
    final thread = await repository.createThread(
      tags: ['general'],
      title: 'Pregunta',
      body: 'Necesito una buena respuesta',
      author: author,
    );
    final reply = await repository.addReply(
      threadId: thread.id,
      body: 'Esta es la respuesta correcta',
      author: answerer,
    );

    expect(
      () => repository.acceptReply(
        thread: store.threads[thread.id]!,
        reply: reply,
        actor: answerer,
      ),
      throwsStateError,
    );

    await repository.acceptReply(
      thread: store.threads[thread.id]!,
      reply: reply,
      actor: author,
    );
    expect(store.threads[thread.id]?.acceptedReplyId, reply.id);

    await repository.acceptReply(
      thread: store.threads[thread.id]!,
      reply: reply,
      actor: author,
    );
    expect(store.threads[thread.id]?.acceptedReplyId, isNull);
  });

  test('deleteReply updates count lastReplyAt and clears accept', () async {
    final author = _agent(uid: 'author');
    final answerer = _agent(uid: 'answerer');
    final thread = await repository.createThread(
      tags: ['general'],
      title: 'Pregunta',
      body: 'Con varias respuestas',
      author: author,
    );
    final first = await repository.addReply(
      threadId: thread.id,
      body: 'Primera respuesta del hilo',
      author: answerer,
    );
    final second = await repository.addReply(
      threadId: thread.id,
      body: 'Segunda respuesta del hilo',
      author: answerer,
    );

    store.replies[thread.id]![0] = ForumReply(
      id: first.id,
      threadId: first.threadId,
      body: first.body,
      authorId: first.authorId,
      authorName: first.authorName,
      authorRole: first.authorRole,
      score: first.score,
      createdAt: DateTime.utc(2024, 1, 3),
      updatedAt: DateTime.utc(2024, 1, 3),
    );
    store.replies[thread.id]![1] = ForumReply(
      id: second.id,
      threadId: second.threadId,
      body: second.body,
      authorId: second.authorId,
      authorName: second.authorName,
      authorRole: second.authorRole,
      score: second.score,
      createdAt: DateTime.utc(2024, 1, 4),
      updatedAt: DateTime.utc(2024, 1, 4),
    );

    await repository.acceptReply(
      thread: store.threads[thread.id]!,
      reply: store.replies[thread.id]![1],
      actor: author,
    );

    await repository.deleteReply(
      reply: store.replies[thread.id]![1],
      actor: answerer,
    );

    expect(store.threads[thread.id]?.replyCount, 1);
    expect(store.threads[thread.id]?.acceptedReplyId, isNull);
    expect(
      store.threads[thread.id]?.lastReplyAt,
      DateTime.utc(2024, 1, 3),
    );
  });

  test('queryThreads paginates and filters by author', () async {
    final a = _agent(uid: 'a');
    final b = _agent(uid: 'b');
    for (var i = 0; i < 3; i++) {
      await repository.createThread(
        tags: ['general'],
        title: 'Pregunta A $i con texto',
        body: 'Cuerpo de pregunta A número $i',
        author: a,
      );
    }
    await repository.createThread(
      tags: ['npn'],
      title: 'Pregunta B unica',
      body: 'Cuerpo de pregunta B',
      author: b,
    );

    final mine = await repository.queryThreads(authorId: 'a', limit: 2);
    expect(mine.threads, hasLength(2));
    expect(mine.hasMore, isTrue);

    final next = await repository.queryThreads(
      authorId: 'a',
      limit: 2,
      cursor: mine.nextCursor,
    );
    expect(next.threads, hasLength(1));
    expect(next.hasMore, isFalse);
  });

  test('syncAuthorPhotoUrl updates threads and replies for that author only',
      () async {
    final author = _agent().copyWith(photoUrl: 'https://old/photo.jpg');
    final other = UserProfile(
      uid: 'other',
      displayName: 'Other',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: true,
      photoUrl: 'https://other/old.jpg',
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );

    final mine = await repository.createThread(
      tags: ['general'],
      title: 'Mi hilo con foto',
      body: 'Cuerpo suficiente para el hilo',
      author: author,
    );
    await repository.addReply(
      threadId: mine.id,
      body: 'Mi respuesta con foto vieja',
      author: author,
    );
    final theirs = await repository.createThread(
      tags: ['general'],
      title: 'Hilo de otra persona',
      body: 'Cuerpo del hilo de otro autor',
      author: other,
    );

    await repository.syncAuthorPhotoUrl(
      authorId: author.uid,
      photoUrl: 'https://new/photo.jpg?v=1',
    );

    expect(store.threads[mine.id]!.authorPhotoUrl, 'https://new/photo.jpg?v=1');
    expect(
      store.replies[mine.id]!.single.authorPhotoUrl,
      'https://new/photo.jpg?v=1',
    );
    expect(store.threads[theirs.id]!.authorPhotoUrl, 'https://other/old.jpg');
  });

  test('sortRepliesByRelevance puts accepted first', () {
    final now = DateTime.utc(2024, 1, 1);
    final replies = [
      ForumReply(
        id: 'r1',
        threadId: 't',
        body: 'low',
        authorId: 'u',
        authorName: 'Ada',
        authorRole: UserRole.agent,
        score: 10,
        createdAt: now,
        updatedAt: now,
      ),
      ForumReply(
        id: 'r2',
        threadId: 't',
        body: 'accepted',
        authorId: 'u',
        authorName: 'Ada',
        authorRole: UserRole.agent,
        score: 1,
        createdAt: now,
        updatedAt: now,
      ),
    ];
    final sorted = sortRepliesByRelevance(replies, acceptedReplyId: 'r2');
    expect(sorted.first.id, 'r2');
  });
}
