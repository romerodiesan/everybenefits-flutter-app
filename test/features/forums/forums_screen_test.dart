import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/forums/forums_screen.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

import '../../helpers/fake_chat_store.dart';

class _MemoryForumStore implements ForumStore {
  _MemoryForumStore(this.seed);

  final List<ForumThread> seed;

  @override
  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  }) async {
    var list = List<ForumThread>.from(seed);
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
    yield seed.cast<ForumThread?>().firstWhere(
          (t) => t?.id == threadId,
          orElse: () => null,
        );
  }

  @override
  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  }) async* {
    yield const [];
  }

  @override
  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  }) =>
      Stream.value(RelevanceVote.none);

  @override
  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  }) =>
      Stream.value(RelevanceVote.none);

  @override
  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  }) async =>
      {for (final id in replyIds) id: RelevanceVote.none};

  @override
  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateThread({
    required String threadId,
    required String title,
    required String body,
    required List<String> tags,
  }) async {}

  @override
  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  }) async {}

  @override
  Future<void> deleteThread(String threadId) async {}

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {}

  @override
  Future<void> setAcceptedReply({
    required String threadId,
    required String? replyId,
  }) async {}

  @override
  Future<void> setThreadRelevance({
    required String threadId,
    required String uid,
    required RelevanceVote vote,
  }) async {}

  @override
  Future<void> setReplyRelevance({
    required String threadId,
    required String replyId,
    required String uid,
    required RelevanceVote vote,
  }) async {}
}

ForumThread _thread({
  String id = 't1',
  String title = 'Bienvenidos a la comunidad',
  String body = 'Este es el primer hilo de prueba para agentes.',
  int score = 0,
  String authorId = 'a1',
}) {
  final now = DateTime.utc(2024, 1, 1);
  return ForumThread(
    id: id,
    tags: const ['general', 'ventas'],
    title: title,
    body: body,
    authorId: authorId,
    authorName: 'Ada',
    authorRole: UserRole.agent,
    replyCount: 3,
    score: score,
    createdAt: now,
    updatedAt: now,
    lastReplyAt: now,
  );
}

UserProfile _profile({required UserRole role, bool anonymous = false}) {
  return UserProfile(
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Ada',
    role: role,
    isAnonymous: anonymous,
    profileCompleted: true,
    createdAt: DateTime.utc(2024, 1, 1),
    updatedAt: DateTime.utc(2024, 1, 1),
  );
}

void main() {
  testWidgets('shows feed cards, composer and FAB for agents', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ForumsScreen(
          profile: _profile(role: UserRole.agent),
          forumRepository: repo,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Bienvenidos a la comunidad'), findsOneWidget);
    expect(find.textContaining('Haz una pregunta'), findsOneWidget);
    expect(find.text('Relevancia'), findsWidgets);
    expect(find.text('Chats'), findsWidgets);
    expect(find.byType(FloatingActionButton), findsOneWidget);
    expect(find.byTooltip('Buscar preguntas'), findsOneWidget);
    expect(find.text('Mías'), findsOneWidget);
  });

  testWidgets('guest is read-only without composer or FAB', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ForumsScreen(
          profile: _profile(role: UserRole.guest, anonymous: true),
          forumRepository: repo,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.textContaining('Haz una pregunta'), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
    expect(find.textContaining('Modo lectura'), findsOneWidget);
  });

  testWidgets('search filters previously asked questions', (tester) async {
    final repo = ForumRepository(
      store: _MemoryForumStore([
        _thread(id: 't1', title: 'Cómo renovar NPN', body: 'Pasos oficiales'),
        _thread(
          id: 't2',
          title: 'Cierre de ventas',
          body: 'Tips de pipeline',
        ),
      ]),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ForumsScreen(
          profile: _profile(role: UserRole.agent),
          forumRepository: repo,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    await tester.tap(find.byTooltip('Buscar preguntas'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'NPN');
    await tester.pumpAndSettle();

    expect(find.text('Cómo renovar NPN'), findsOneWidget);
    expect(find.text('Cierre de ventas'), findsNothing);
    expect(find.textContaining('búsqueda en resultados cargados'), findsOneWidget);
  });

  testWidgets('tapping post opens conversation detail', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ForumsScreen(
          profile: _profile(role: UserRole.agent),
          forumRepository: repo,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Bienvenidos a la comunidad'));
    await tester.pumpAndSettle();

    expect(
      find.text('Este es el primer hilo de prueba para agentes.'),
      findsOneWidget,
    );
    expect(find.text('3 respuestas'), findsOneWidget);
    expect(find.textContaining('Escribe una respuesta'), findsOneWidget);
    expect(find.text('Chats'), findsWidgets);
  });

  testWidgets('share opens chat picker sheet', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));
    final chatStore = FakeChatStore();
    final now = DateTime.utc(2024, 6, 1);
    await chatStore.createChat(
      ChatConversation(
        id: 'c1',
        memberIds: const ['u1', 'other'],
        memberNames: const {
          'u1': 'Ada',
          'other': 'Equipo Ventas CR',
        },
        isGroup: false,
        dmKey: 'other_u1',
        lastMessage: 'Hola',
        lastMessageAt: now,
        createdAt: now,
        createdBy: 'u1',
      ),
    );
    final chats = ChatRepository(store: chatStore);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: ForumsScreen(
          profile: _profile(role: UserRole.agent),
          forumRepository: repo,
          chatRepository: chats,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Chats').first);
    await tester.pumpAndSettle();

    expect(find.text('Compartir en chat'), findsOneWidget);
    expect(find.text('Equipo Ventas CR'), findsOneWidget);
    expect(find.textContaining('Chat privado'), findsWidgets);
    expect(find.text('Bienvenidos a la comunidad'), findsWidgets);

    chatStore.dispose();
  });
}
