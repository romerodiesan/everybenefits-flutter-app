import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/university/course_models.dart';

CourseModule _mod(String id, int order, String title) => CourseModule(
      id: id,
      title: title,
      order: order,
    );

Lesson _video(String id, String moduleId, int order) => Lesson(
      id: id,
      moduleId: moduleId,
      title: id,
      order: order,
      durationSeconds: 60,
      type: LessonType.video,
    );

Lesson _quiz(String id, String moduleId, int order) => Lesson(
      id: id,
      moduleId: moduleId,
      title: id,
      order: order,
      durationSeconds: 90,
      type: LessonType.quiz,
      passPercent: 70,
      questions: const [
        QuizQuestion(
          id: 'q',
          prompt: '?',
          selectionMode: QuizSelectionMode.single,
          options: ['A', 'B'],
        ),
      ],
    );

Enrollment _enroll({
  List<String> completed = const [],
  Map<String, QuizAttempt> attempts = const {},
}) {
  final now = DateTime.utc(2026, 1, 1);
  return Enrollment(
    courseId: 'c1',
    completedLessonIds: completed,
    enrolledAt: now,
    updatedAt: now,
    quizAttempts: attempts,
  );
}

void main() {
  // Module 1: video + quiz. Module 2: video. Module 3: quiz only.
  final content = CourseContent(
    modules: [
      _mod('m1', 0, 'Fundamentos'),
      _mod('m2', 1, 'Práctica'),
      _mod('m3', 2, 'Cierre'),
    ],
    lessons: [
      _video('v1', 'm1', 0),
      _quiz('q1', 'm1', 1),
      _video('v2', 'm2', 2),
      _quiz('q3', 'm3', 3),
    ],
  );

  group('module quiz gating', () {
    test('first module is always unlocked', () {
      final enrollment = _enroll();
      expect(content.isModuleUnlocked('m1', enrollment), isTrue);
      expect(content.isLessonUnlocked(content.lessonById('v1')!, enrollment),
          isTrue);
      expect(content.isLessonUnlocked(content.lessonById('q1')!, enrollment),
          isTrue);
    });

    test('next module stays locked until prior quizzes are passed', () {
      final enrollment = _enroll();
      expect(content.isModuleUnlocked('m2', enrollment), isFalse);
      expect(content.isLessonUnlocked(content.lessonById('v2')!, enrollment),
          isFalse);
    });

    test('completing videos alone does not unlock the next module', () {
      final enrollment = _enroll(completed: ['v1']);
      expect(content.isModuleUnlocked('m2', enrollment), isFalse);
    });

    test('passing every quiz in a module unlocks the next one', () {
      final enrollment = _enroll(
        completed: ['v1', 'q1'],
        attempts: {
          'q1': const QuizAttempt(score: 100, passed: true),
        },
      );
      expect(content.isModuleUnlocked('m2', enrollment), isTrue);
      expect(content.isLessonUnlocked(content.lessonById('v2')!, enrollment),
          isTrue);
      // Module 3 still locked: m2 has no quizzes, but wait — m2 has no
      // quizzes so it shouldn't gate. Only modules WITH quizzes gate.
      expect(content.isModuleUnlocked('m3', enrollment), isTrue);
    });

    test('a failed quiz attempt does not unlock the next module', () {
      final enrollment = _enroll(
        attempts: {
          'q1': const QuizAttempt(score: 40, passed: false),
        },
      );
      expect(content.isModuleUnlocked('m2', enrollment), isFalse);
    });

    test('modules without quizzes never block later modules', () {
      final noQuiz = CourseContent(
        modules: [
          _mod('a', 0, 'A'),
          _mod('b', 1, 'B'),
        ],
        lessons: [
          _video('va', 'a', 0),
          _video('vb', 'b', 1),
        ],
      );
      final enrollment = _enroll();
      expect(noQuiz.isModuleUnlocked('b', enrollment), isTrue);
    });

    test('lessonAfterAccessible stays inside a module but not past unpaid quizzes',
        () {
      final locked = _enroll(completed: ['v1']);
      // Same module: next lesson is fine.
      expect(content.lessonAfterAccessible('v1', locked)?.id, 'q1');
      // Next module is locked until q1 is passed.
      expect(content.lessonAfterAccessible('q1', locked), isNull);

      final passed = _enroll(
        completed: ['v1', 'q1'],
        attempts: {
          'q1': const QuizAttempt(score: 90, passed: true),
        },
      );
      expect(content.lessonAfterAccessible('q1', passed)?.id, 'v2');
    });

    test('blockingQuizzesBefore lists unpaid quizzes of prior modules', () {
      final enrollment = _enroll();
      final blockers = content.blockingQuizzesBefore('m2', enrollment);
      expect(blockers.map((l) => l.id), ['q1']);

      final cleared = _enroll(
        attempts: {
          'q1': const QuizAttempt(score: 100, passed: true),
        },
      );
      expect(content.blockingQuizzesBefore('m2', cleared), isEmpty);
    });
  });
}
