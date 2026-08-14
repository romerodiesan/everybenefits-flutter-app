import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/university/course_models.dart';
import 'package:every_benefits/features/university/course_repository.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

import '../../helpers/fake_course_store.dart';

UserProfile _profile(
  String uid, {
  UserRole role = UserRole.agent,
  bool isAnonymous = false,
}) {
  final now = DateTime.utc(2026, 1, 1);
  return UserProfile(
    uid: uid,
    role: role,
    isAnonymous: isAnonymous,
    createdAt: now,
    updatedAt: now,
    profileCompleted: true,
  );
}

Course _course({
  String id = 'course-1',
  CourseStatus status = CourseStatus.published,
  String createdBy = 'manager-1',
  int lessonCount = 2,
}) {
  final now = DateTime.utc(2026, 1, 1);
  return Course(
    id: id,
    title: 'Fundamentos de seguros',
    description: 'Curso base',
    teacherName: 'Elena Vargas',
    level: CourseLevel.basic,
    status: status,
    lessonCount: lessonCount,
    durationMinutes: 90,
    studentCount: 0,
    createdBy: createdBy,
    createdAt: now,
    updatedAt: now,
    publishedAt: status == CourseStatus.published ? now : null,
  );
}

CourseContent _content() {
  return const CourseContent(
    modules: [CourseModule(id: 'm1', title: 'Intro', order: 0)],
    lessons: [
      Lesson(
        id: 'l1',
        moduleId: 'm1',
        title: 'Bienvenida',
        order: 0,
        durationSeconds: 300,
        videoUrl: 'https://cdn.test/l1.mp4',
      ),
      Lesson(
        id: 'l2',
        moduleId: 'm1',
        title: 'Coberturas',
        order: 1,
        durationSeconds: 600,
        videoPath: 'courses/course-1/lessons/l2.mp4',
      ),
    ],
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

  group('catalog visibility', () {
    test('only published courses reach the catalog', () async {
      store.seedCourse(_course(id: 'published'));
      store.seedCourse(_course(id: 'draft', status: CourseStatus.draft));
      store.seedCourse(_course(id: 'pending', status: CourseStatus.pending));

      final courses = await repository.watchPublishedCourses().first;

      expect(courses.map((c) => c.id), ['published']);
    });

    test('authors see their own drafts and admins see the review queue',
        () async {
      store.seedCourse(
        _course(id: 'mine', status: CourseStatus.draft, createdBy: 'manager-1'),
      );
      store.seedCourse(
        _course(
          id: 'theirs',
          status: CourseStatus.pending,
          createdBy: 'manager-2',
        ),
      );

      final authored = await repository.watchAuthoredCourses('manager-1').first;
      final pending = await repository.watchPendingCourses().first;

      expect(authored.map((c) => c.id), ['mine']);
      expect(pending.map((c) => c.id), ['theirs']);
    });
  });

  group('enrollment', () {
    test('enrolling bumps the course student count', () async {
      final course = _course();
      store.seedCourse(course, withContent: _content());

      final enrollment = await repository.enroll(
        profile: _profile('student-1'),
        course: course,
      );

      expect(enrollment.courseId, course.id);
      expect(enrollment.completedLessonIds, isEmpty);
      expect(store.courses[course.id]!.studentCount, 1);
    });

    test('guests cannot enroll', () async {
      final course = _course();
      store.seedCourse(course);

      expect(
        () => repository.enroll(
          profile: _profile('guest', role: UserRole.guest, isAnonymous: true),
          course: course,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            kCourseErrSignInRequired,
          ),
        ),
      );
    });

    test('unpublished courses reject enrollment', () async {
      final course = _course(status: CourseStatus.draft);
      store.seedCourse(course);

      expect(
        () => repository.enroll(profile: _profile('student-1'), course: course),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            kCourseErrNotPublished,
          ),
        ),
      );
    });
  });

  group('progress', () {
    test('completing every lesson marks the enrollment finished', () async {
      final course = _course();
      final content = _content();
      store.seedCourse(course, withContent: content);
      var enrollment = await repository.enroll(
        profile: _profile('student-1'),
        course: course,
      );

      enrollment = await repository.saveLessonProgress(
        uid: 'student-1',
        course: course,
        enrollment: enrollment,
        lesson: content.lessons[0],
        positionSeconds: 290,
        completed: true,
      );

      expect(enrollment.progressFor(course.lessonCount), 0.5);
      expect(enrollment.isCompleted, isFalse);
      expect(enrollment.lastLessonId, 'l1');

      enrollment = await repository.saveLessonProgress(
        uid: 'student-1',
        course: course,
        enrollment: enrollment,
        lesson: content.lessons[1],
        positionSeconds: 600,
        completed: true,
      );

      expect(enrollment.progressFor(course.lessonCount), 1);
      expect(enrollment.isCompleted, isTrue);
      expect(store.enrollments['student-1']![course.id]!.completedLessonIds,
          ['l1', 'l2']);
    });

    test('saving position keeps the lesson incomplete and never goes negative',
        () async {
      final course = _course();
      final content = _content();
      store.seedCourse(course, withContent: content);
      final enrollment = await repository.enroll(
        profile: _profile('student-1'),
        course: course,
      );

      final saved = await repository.saveLessonProgress(
        uid: 'student-1',
        course: course,
        enrollment: enrollment,
        lesson: content.lessons[0],
        positionSeconds: -5,
        completed: false,
      );

      expect(saved.lastPositionSeconds, 0);
      expect(saved.completedLessonIds, isEmpty);
      expect(saved.progressFor(course.lessonCount), 0);
    });

    test('the same lesson is never counted twice', () async {
      final course = _course();
      final content = _content();
      store.seedCourse(course, withContent: content);
      var enrollment = await repository.enroll(
        profile: _profile('student-1'),
        course: course,
      );

      for (var i = 0; i < 3; i++) {
        enrollment = await repository.saveLessonProgress(
          uid: 'student-1',
          course: course,
          enrollment: enrollment,
          lesson: content.lessons[0],
          positionSeconds: 300,
          completed: true,
        );
      }

      expect(enrollment.completedLessonIds, ['l1']);
    });
  });

  group('authoring permissions', () {
    test('agents cannot create courses', () {
      expect(
        () => repository.createCourse(
          actor: _profile('agent-1'),
          title: 'Nuevo',
          description: '',
          teacherName: '',
          level: CourseLevel.basic,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            kCourseErrNoPermission,
          ),
        ),
      );
    });

    test('managers create drafts, never published courses', () async {
      final course = await repository.createCourse(
        actor: _profile('manager-1', role: UserRole.manager),
        title: '  Ventas consultivas  ',
        description: 'Objeciones',
        teacherName: 'Diego',
        level: CourseLevel.intermediate,
      );

      expect(course.status, CourseStatus.draft);
      expect(course.title, 'Ventas consultivas');
      expect(course.createdBy, 'manager-1');
    });

    test('an empty title is rejected', () {
      expect(
        () => repository.createCourse(
          actor: _profile('manager-1', role: UserRole.manager),
          title: '   ',
          description: '',
          teacherName: '',
          level: CourseLevel.basic,
        ),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('managers cannot edit a published course', () {
      final course = _course(createdBy: 'manager-1');
      store.seedCourse(course);

      expect(
        () => repository.updateCourseMeta(
          actor: _profile('manager-1', role: UserRole.manager),
          course: course,
          title: 'Otro título',
          description: '',
          teacherName: '',
          level: CourseLevel.basic,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            kCourseErrAlreadyPublished,
          ),
        ),
      );
    });

    test('managers cannot edit courses they do not own', () {
      final course = _course(status: CourseStatus.draft, createdBy: 'other');
      store.seedCourse(course);

      expect(
        () => repository.updateCourseMeta(
          actor: _profile('manager-1', role: UserRole.manager),
          course: course,
          title: 'Otro título',
          description: '',
          teacherName: '',
          level: CourseLevel.basic,
        ),
        throwsA(isA<StateError>()),
      );
    });
  });

  group('publication workflow', () {
    test('a manager can only move their draft to pending', () async {
      final course = _course(status: CourseStatus.draft, createdBy: 'manager-1');
      store.seedCourse(course);
      final manager = _profile('manager-1', role: UserRole.manager);

      await repository.setCourseStatus(
        actor: manager,
        course: course,
        status: CourseStatus.pending,
      );
      expect(store.courses[course.id]!.status, CourseStatus.pending);

      expect(
        () => repository.setCourseStatus(
          actor: manager,
          course: store.courses[course.id]!,
          status: CourseStatus.published,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            kCourseErrOnlyAdminPublishes,
          ),
        ),
      );
    });

    test('an admin publishes and stamps publishedAt', () async {
      final course = _course(status: CourseStatus.pending);
      store.seedCourse(course);

      await repository.setCourseStatus(
        actor: _profile('admin-1', role: UserRole.admin),
        course: course,
        status: CourseStatus.published,
      );

      final stored = store.courses[course.id]!;
      expect(stored.status, CourseStatus.published);
      expect(stored.publishedAt, isNotNull);
    });

    test('an admin can send a pending course back to draft', () async {
      final course = _course(status: CourseStatus.pending);
      store.seedCourse(course);

      await repository.setCourseStatus(
        actor: _profile('admin-1', role: UserRole.admin),
        course: course,
        status: CourseStatus.draft,
      );

      expect(store.courses[course.id]!.status, CourseStatus.draft);
    });

    test('deleting is limited to admins and the draft owner', () async {
      final published = _course(id: 'pub', createdBy: 'manager-1');
      final draft = _course(
        id: 'draft',
        status: CourseStatus.draft,
        createdBy: 'manager-1',
      );
      store.seedCourse(published);
      store.seedCourse(draft);
      final manager = _profile('manager-1', role: UserRole.manager);

      expect(
        () => repository.deleteCourse(actor: manager, course: published),
        throwsA(isA<StateError>()),
      );

      await repository.deleteCourse(actor: manager, course: draft);
      expect(store.courses.containsKey('draft'), isFalse);

      await repository.deleteCourse(
        actor: _profile('admin-1', role: UserRole.admin),
        course: published,
      );
      expect(store.courses.containsKey('pub'), isFalse);
    });
  });

  group('media', () {
    test('a direct URL wins over the storage path', () async {
      final content = _content();

      expect(
        await repository.resolveVideoUrl(content.lessons[0]),
        'https://cdn.test/l1.mp4',
      );
      expect(
        await repository.resolveVideoUrl(content.lessons[1]),
        'https://example.test/courses/course-1/lessons/l2.mp4',
      );
    });
  });

  group('permission helpers', () {
    test('canAuthorCourses covers instructors, managers, and admins', () {
      expect(canAuthorCourses(UserRole.guest), isFalse);
      expect(canAuthorCourses(UserRole.agent), isFalse);
      expect(canAuthorCourses(UserRole.instructor), isTrue);
      expect(canAuthorCourses(UserRole.manager), isTrue);
      expect(canAuthorCourses(UserRole.admin), isTrue);
    });

    test('canManageCourses is admin only', () {
      expect(canManageCourses(UserRole.manager), isFalse);
      expect(canManageCourses(UserRole.admin), isTrue);
    });

    test('canEditCourse follows ownership and status', () {
      final draft = _course(status: CourseStatus.draft, createdBy: 'manager-1');
      final published = _course(createdBy: 'manager-1');

      expect(
        canEditCourse(
          course: draft,
          uid: 'manager-1',
          roleOrPermissions: UserRole.manager,
        ),
        isTrue,
      );
      expect(
        canEditCourse(
          course: published,
          uid: 'manager-1',
          roleOrPermissions: UserRole.manager,
        ),
        isFalse,
      );
      expect(
        canEditCourse(
          course: published,
          uid: 'admin',
          roleOrPermissions: UserRole.admin,
        ),
        isTrue,
      );
      expect(
        canEditCourse(
          course: draft,
          uid: 'agent',
          roleOrPermissions: UserRole.agent,
        ),
        isFalse,
      );
    });

    test('canEditPath mirrors course ownership rules', () {
      const draft = LearningPath(
        id: 'p1',
        title: 'Ruta',
        description: '',
        level: CourseLevel.basic,
        status: CourseStatus.draft,
        courseIds: ['c1'],
        order: 0,
        createdBy: 'manager-1',
      );
      const published = LearningPath(
        id: 'p2',
        title: 'Ruta live',
        description: '',
        level: CourseLevel.basic,
        status: CourseStatus.published,
        courseIds: ['c1'],
        order: 1,
        createdBy: 'manager-1',
      );

      expect(canAuthorPaths(UserRole.manager), isTrue);
      expect(
        canEditPath(
          path: draft,
          uid: 'manager-1',
          roleOrPermissions: UserRole.manager,
        ),
        isTrue,
      );
      expect(
        canEditPath(
          path: draft,
          uid: 'manager-2',
          roleOrPermissions: UserRole.manager,
        ),
        isFalse,
      );
      expect(
        canEditPath(
          path: published,
          uid: 'manager-1',
          roleOrPermissions: UserRole.manager,
        ),
        isFalse,
      );
      expect(
        canEditPath(
          path: published,
          uid: 'admin',
          roleOrPermissions: UserRole.admin,
        ),
        isTrue,
      );
    });

    test('LearningPath.fromMap reads createdBy', () {
      final path = LearningPath.fromMap('p1', {
        'title': 'Agente nuevo',
        'description': 'Primer mes',
        'level': 'basic',
        'status': 'published',
        'courseIds': ['a', 'b'],
        'order': 2,
        'createdBy': 'admin1',
      });
      expect(path.createdBy, 'admin1');
      expect(path.courseIds, ['a', 'b']);
      expect(path.isPublished, isTrue);
    });
  });
}
