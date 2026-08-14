import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/university/course_models.dart';
import 'package:every_benefits/features/university/course_repository.dart';

import '../../helpers/fake_course_store.dart';

Course _course({int lessonCount = 2}) {
  final now = DateTime.utc(2026, 1, 1);
  return Course(
    id: 'course-1',
    title: 'Compliance',
    description: '',
    teacherName: 'Patricia',
    level: CourseLevel.basic,
    status: CourseStatus.published,
    lessonCount: lessonCount,
    durationMinutes: 20,
    studentCount: 0,
    createdBy: 'manager-1',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  );
}

const _quizLesson = Lesson(
  id: 'q1',
  moduleId: 'm1',
  title: 'Evaluación',
  order: 1,
  durationSeconds: 90,
  type: LessonType.quiz,
  passPercent: 70,
  questions: [
    QuizQuestion(
      id: 'a',
      prompt: 'Una sola',
      selectionMode: QuizSelectionMode.single,
      options: ['Sí', 'No'],
    ),
    QuizQuestion(
      id: 'b',
      prompt: 'Varias',
      selectionMode: QuizSelectionMode.multi,
      options: ['Uno', 'Dos', 'Tres'],
    ),
  ],
);

void main() {
  group('Lesson parsing', () {
    test('treats lessons without a type as video', () {
      final lesson = Lesson.fromMap('l1', {
        'moduleId': 'm1',
        'title': 'Bienvenida',
        'order': 0,
        'durationSeconds': 300,
        'videoUrl': 'https://cdn.test/l1.mp4',
      });

      expect(lesson.type, LessonType.video);
      expect(lesson.isVideo, isTrue);
      expect(lesson.hasContent, isTrue);
      expect(lesson.passPercent, kQuizDefaultPassPercent);
    });

    test('uses durationMinutes when durationSeconds is missing or copied', () {
      final fromMinutes = Lesson.fromMap('l-min', {
        'moduleId': 'm1',
        'title': 'Clase',
        'durationMinutes': 7,
      });
      expect(fromMinutes.durationSeconds, 420);

      final copied = Lesson.fromMap('l-copy', {
        'moduleId': 'm1',
        'title': 'Clase',
        'durationMinutes': 10,
        'durationSeconds': 10,
      });
      expect(copied.durationSeconds, 600);
    });

    test('reads a reading lesson and its body', () {
      final lesson = Lesson.fromMap('l2', {
        'moduleId': 'm1',
        'title': 'Deberes',
        'type': 'reading',
        'bodyMarkdown': '# Título\n\nCuerpo',
      });

      expect(lesson.isReading, isTrue);
      expect(lesson.hasReading, isTrue);
      expect(lesson.hasContent, isTrue);
      expect(lesson.questions, isEmpty);
    });

    test('reads quiz questions without any answer data', () {
      final lesson = Lesson.fromMap('l3', {
        'moduleId': 'm1',
        'title': 'Quiz',
        'type': 'quiz',
        'passPercent': 80,
        'questions': [
          {
            'id': 'a',
            'prompt': 'Pregunta',
            'selectionMode': 'multi',
            'options': ['Uno', 'Dos'],
          },
          // A question missing its id still gets a stable fallback.
          {'prompt': 'Sin id', 'options': ['Sí', 'No']},
        ],
      });

      expect(lesson.isQuiz, isTrue);
      expect(lesson.passPercent, 80);
      expect(lesson.questions.first.isMulti, isTrue);
      expect(lesson.questions[1].id, 'q2');
      expect(lesson.questions[1].selectionMode, QuizSelectionMode.single);
      expect(lesson.toMap().containsKey('answers'), isFalse);
    });

    test('an empty reading or quiz is not ready for learners', () {
      const reading = Lesson(
        id: 'l4',
        moduleId: 'm1',
        title: 'Vacía',
        order: 0,
        durationSeconds: 0,
        type: LessonType.reading,
      );
      const quiz = Lesson(
        id: 'l5',
        moduleId: 'm1',
        title: 'Vacío',
        order: 1,
        durationSeconds: 0,
        type: LessonType.quiz,
      );

      expect(reading.hasContent, isFalse);
      expect(quiz.hasContent, isFalse);
    });
  });

  group('Enrollment quiz attempts', () {
    test('round-trips server-written attempts', () {
      final enrollment = Enrollment.fromMap('course-1', {
        'courseId': 'course-1',
        'completedLessonIds': ['q1'],
        'quizAttempts': {
          'q1': {
            'score': 100,
            'passed': true,
            'at': '2026-01-02T00:00:00.000Z',
          },
        },
      });

      final attempt = enrollment.attemptFor('q1');
      expect(attempt, isNotNull);
      expect(attempt!.score, 100);
      expect(attempt.passed, isTrue);
      expect(enrollment.attemptFor('missing'), isNull);
    });
  });

  group('CourseRepository.submitQuizAttempt', () {
    late FakeCourseStore store;
    late CourseRepository repository;
    final course = _course();

    setUp(() {
      store = FakeCourseStore();
      repository = CourseRepository(store: store);
      store.seedCourse(
        course,
        withContent: const CourseContent(
          modules: [CourseModule(id: 'm1', title: 'Intro', order: 0)],
          lessons: [_quizLesson],
        ),
      );
      store.seedAnswerKey(
        courseId: course.id,
        lessonId: _quizLesson.id,
        answers: {
          'a': [0],
          'b': [0, 2],
        },
      );
    });

    tearDown(() => store.dispose());

    test('refuses to submit while a question is unanswered', () {
      expect(
        () => repository.submitQuizAttempt(
          course: course,
          lesson: _quizLesson,
          answers: {
            'a': [0],
          },
        ),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            kQuizErrIncomplete,
          ),
        ),
      );
      expect(store.quizSubmissions, isEmpty);
    });

    test('a perfect attempt passes and completes the lesson', () async {
      await store.enroll(uid: 'agent-1', courseId: course.id);

      final result = await repository.submitQuizAttempt(
        course: course,
        lesson: _quizLesson,
        answers: {
          'a': [0],
          'b': [2, 0],
        },
      );

      expect(result.score, 100);
      expect(result.passed, isTrue);
      expect(result.correctByQuestion, {'a': true, 'b': true});
      expect(
        store.enrollments['agent-1']?[course.id]?.completedLessonIds,
        contains(_quizLesson.id),
      );
    });

    test('a partial attempt below the bar does not complete the lesson',
        () async {
      await store.enroll(uid: 'agent-1', courseId: course.id);

      final result = await repository.submitQuizAttempt(
        course: course,
        lesson: _quizLesson,
        answers: {
          'a': [0],
          // Missing one of the two correct options counts as wrong.
          'b': [0],
        },
      );

      expect(result.score, 50);
      expect(result.passed, isFalse);
      expect(result.correctByQuestion['b'], isFalse);
      expect(
        store.enrollments['agent-1']?[course.id]?.completedLessonIds,
        isEmpty,
      );
    });
  });

}
