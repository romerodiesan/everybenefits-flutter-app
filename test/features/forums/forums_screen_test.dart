import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/app/widgets/glass_card.dart';
import 'package:every_benefits/app/widgets/mesh_background.dart';
import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/forums/forums_screen.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

class _MemoryForumStore implements ForumStore {
  _MemoryForumStore(this.seed);

  final List<ForumThread> seed;

  @override
  Stream<List<ForumThread>> watchThreads({String? tag}) async* {
    var list = seed;
    if (tag != null) {
      list = seed.where((t) => t.tags.contains(tag)).toList();
    }
    yield list;
  }

  @override
  Stream<ForumThread?> watchThread(String threadId) async* {
    yield seed.cast<ForumThread?>().firstWhere(
          (t) => t?.id == threadId,
          orElse: () => null,
        );
  }

  @override
  Stream<List<ForumReply>> watchReplies(String threadId) async* {
    yield const [];
  }

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
  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteThread(String threadId) async {}

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {}
}

ForumThread _thread() {
  final now = DateTime.utc(2024, 1, 1);
  return ForumThread(
    id: 't1',
    tags: const ['general', 'ventas'],
    title: 'Bienvenidos a la comunidad',
    body: 'Este es el primer hilo de prueba para agentes.',
    authorId: 'a1',
    authorName: 'Ada',
    authorRole: UserRole.agent,
    replyCount: 3,
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
        home: MeshBackground(
          child: ForumsScreen(
            profile: _profile(role: UserRole.agent),
            forumRepository: repo,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Bienvenidos a la comunidad'), findsOneWidget);
    expect(find.textContaining('¿Qué estás pensando?'), findsOneWidget);
    expect(find.text('3 respuestas'), findsOneWidget);
    expect(find.byType(GlassCard), findsWidgets);
    expect(find.byType(FloatingActionButton), findsOneWidget);
    expect(find.byTooltip('Nueva publicación'), findsOneWidget);
    expect(find.text('#general'), findsOneWidget);
    expect(find.text('#ventas'), findsOneWidget);
  });

  testWidgets('guest is read-only without composer or FAB', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: MeshBackground(
          child: ForumsScreen(
            profile: _profile(role: UserRole.guest, anonymous: true),
            forumRepository: repo,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Bienvenidos a la comunidad'), findsOneWidget);
    expect(find.textContaining('¿Qué estás pensando?'), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
    expect(find.textContaining('Modo lectura'), findsOneWidget);
  });

  testWidgets('tapping post opens conversation detail', (tester) async {
    final repo = ForumRepository(store: _MemoryForumStore([_thread()]));

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: MeshBackground(
          child: ForumsScreen(
            profile: _profile(role: UserRole.agent),
            forumRepository: repo,
          ),
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
    expect(find.text('3 comentarios'), findsOneWidget);
    expect(find.textContaining('Escribe un comentario'), findsOneWidget);
  });
}
