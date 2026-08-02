import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/university/course_models.dart';
import 'package:every_benefits/features/university/course_repository.dart';
import 'package:every_benefits/features/university/course_search_screen.dart';
import 'package:every_benefits/features/university/university_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

import '../../helpers/fake_course_store.dart';

UserProfile _profile({
  String uid = 'u1',
  UserRole role = UserRole.agent,
}) {
  final now = DateTime.utc(2026, 1, 1);
  return UserProfile(
    uid: uid,
    email: 'a@b.com',
    displayName: 'Ada',
    role: role,
    isAnonymous: false,
    profileCompleted: true,
    createdAt: now,
    updatedAt: now,
  );
}

Course _course({
  required String id,
  required String title,
  CourseLevel level = CourseLevel.basic,
  CourseStatus status = CourseStatus.published,
  String createdBy = 'manager-1',
  int lessonCount = 3,
}) {
  final now = DateTime.utc(2026, 1, 1);
  return Course(
    id: id,
    title: title,
    description: 'Descripción de $title',
    teacherName: 'Elena Vargas',
    level: level,
    status: status,
    lessonCount: lessonCount,
    durationMinutes: 120,
    studentCount: 12,
    createdBy: createdBy,
    createdAt: now,
    updatedAt: now,
    publishedAt: status == CourseStatus.published ? now : null,
  );
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: buildEveryInsuranceTheme(Brightness.dark),
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: child,
  );
}

void main() {
  late FakeCourseStore store;
  late CourseRepository repository;

  setUp(() {
    store = FakeCourseStore();
    repository = CourseRepository(store: store);
  });

  tearDown(() => store.dispose());

  testWidgets('catalog lists published courses and hides drafts',
      (tester) async {
    store.seedCourse(_course(id: 'c1', title: 'Fundamentos de vida'));
    store.seedCourse(
      _course(
        id: 'c2',
        title: 'Borrador interno',
        status: CourseStatus.draft,
      ),
    );

    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Fundamentos de vida'), findsOneWidget);
    expect(find.text('Borrador interno'), findsNothing);
    expect(find.text('Academy'), findsOneWidget);
    expect(find.text('Courses'), findsOneWidget);
  });

  testWidgets('level filter narrows the catalog', (tester) async {
    store.seedCourse(_course(id: 'c1', title: 'Curso básico'));
    store.seedCourse(
      _course(
        id: 'c2',
        title: 'Curso avanzado',
        level: CourseLevel.advanced,
      ),
    );

    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Curso básico'), findsOneWidget);
    expect(find.text('Curso avanzado'), findsOneWidget);

    await tester.tap(find.text('Advanced').first);
    await tester.pumpAndSettle();

    expect(find.text('Curso básico'), findsNothing);
    expect(find.text('Curso avanzado'), findsOneWidget);
  });

  testWidgets('empty catalog shows the placeholder message', (tester) async {
    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('No published courses yet.'), findsOneWidget);
  });

  testWidgets('enrolled course shows progress and keep learning row',
      (tester) async {
    final course = _course(id: 'c1', title: 'Curso con avance', lessonCount: 4);
    store.seedCourse(course);
    await repository.enroll(profile: _profile(), course: course);
    await repository.saveLessonProgress(
      uid: 'u1',
      course: course,
      enrollment: store.enrollments['u1']!['c1']!,
      lesson: const Lesson(
        id: 'l1',
        moduleId: 'm1',
        title: 'Intro',
        order: 0,
        durationSeconds: 60,
      ),
      positionSeconds: 55,
      completed: true,
    );

    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Keep learning'), findsOneWidget);
    expect(find.text('25% complete'), findsWidgets);
  });

  void seedAuthoringFixtures() {
    store.seedCourse(
      _course(
        id: 'draft',
        title: 'Mi borrador',
        status: CourseStatus.draft,
        createdBy: 'manager-1',
      ),
    );
    store.seedCourse(
      _course(
        id: 'pending',
        title: 'Curso en revisión',
        status: CourseStatus.pending,
        createdBy: 'manager-2',
      ),
    );
  }

  testWidgets('managers see their own drafts and the Studio shortcut',
      (tester) async {
    seedAuthoringFixtures();

    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(uid: 'manager-1', role: UserRole.manager),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('My courses'), findsOneWidget);
    expect(find.text('Mi borrador'), findsOneWidget);
    expect(find.text('Curso en revisión'), findsNothing);
    expect(find.text('Pending approval'), findsNothing);
    expect(find.byTooltip('Studio'), findsOneWidget);
  });

  testWidgets('admins see the pending review queue', (tester) async {
    seedAuthoringFixtures();

    await tester.pumpWidget(
      _wrap(
        UniversityScreen(
          profile: _profile(uid: 'admin-1', role: UserRole.admin),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Pending approval'), findsOneWidget);
    expect(find.text('Curso en revisión'), findsOneWidget);
  });

  testWidgets('search filters the published catalog by text', (tester) async {
    store.seedCourse(_course(id: 'c1', title: 'Objeciones en ventas'));
    store.seedCourse(_course(id: 'c2', title: 'Compliance del agente'));

    await tester.pumpWidget(
      _wrap(
        CourseSearchScreen(
          profile: _profile(),
          courseRepository: repository,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Objeciones en ventas'), findsOneWidget);
    expect(find.text('Compliance del agente'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'compliance');
    await tester.pumpAndSettle();

    expect(find.text('Objeciones en ventas'), findsNothing);
    expect(find.text('Compliance del agente'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'zzz');
    await tester.pumpAndSettle();

    expect(find.textContaining('zzz'), findsWidgets);
  });
}
