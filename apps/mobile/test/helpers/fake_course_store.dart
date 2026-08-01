import 'dart:async';

import 'package:every_benefits/features/university/course_models.dart';
import 'package:every_benefits/features/university/course_repository.dart';

/// In-memory [CourseStore] for widget and repository tests.
class FakeCourseStore implements CourseStore {
  final Map<String, Course> courses = {};
  final Map<String, CourseContent> content = {};
  final Map<String, LearningPath> paths = {};

  /// uid -> courseId -> enrollment
  final Map<String, Map<String, Enrollment>> enrollments = {};

  /// courseId/lessonId -> questionId -> correct option indexes.
  final Map<String, Map<String, List<int>>> answerKeys = {};

  /// Quiz submissions received, in order, for assertions.
  final List<({String courseId, String lessonId, Map<String, List<int>> answers})>
      quizSubmissions = [];

  final _bump = StreamController<void>.broadcast();
  var _nextId = 0;

  void dispose() => _bump.close();

  void seedCourse(Course course, {CourseContent? withContent}) {
    courses[course.id] = course;
    if (withContent != null) content[course.id] = withContent;
    _notify();
  }

  void seedPath(LearningPath path) {
    paths[path.id] = path;
    _notify();
  }

  void seedAnswerKey({
    required String courseId,
    required String lessonId,
    required Map<String, List<int>> answers,
  }) {
    answerKeys['$courseId/$lessonId'] = answers;
  }

  void _notify() {
    if (!_bump.isClosed) _bump.add(null);
  }

  /// Emits the current value, then again after every mutation.
  Stream<T> _watch<T>(T Function() read) async* {
    yield read();
    yield* _bump.stream.map((_) => read());
  }

  @override
  Stream<List<Course>> watchPublishedCourses({int limit = 60}) {
    return _watch(() {
      final list = courses.values.where((c) => c.isPublished).toList()
        ..sort((a, b) {
          final at = a.publishedAt ?? a.createdAt;
          final bt = b.publishedAt ?? b.createdAt;
          return bt.compareTo(at);
        });
      return list.take(limit).toList();
    });
  }

  @override
  Stream<Course?> watchCourse(String courseId) =>
      _watch(() => courses[courseId]);

  @override
  Future<Course?> fetchCourse(String courseId) async => courses[courseId];

  @override
  Future<CourseContent> fetchCourseContent(String courseId) async =>
      content[courseId] ?? CourseContent.empty;

  @override
  Stream<List<LearningPath>> watchPaths({int limit = 30}) {
    return _watch(() {
      final list = paths.values
          .where((p) => p.status == CourseStatus.published)
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order));
      return list.take(limit).toList();
    });
  }

  @override
  Future<LearningPath?> fetchPath(String pathId) async => paths[pathId];

  @override
  Stream<List<Enrollment>> watchEnrollments(String uid, {int limit = 50}) {
    return _watch(() {
      final list = (enrollments[uid] ?? const {}).values.toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return list.take(limit).toList();
    });
  }

  @override
  Stream<Enrollment?> watchEnrollment({
    required String uid,
    required String courseId,
  }) =>
      _watch(() => enrollments[uid]?[courseId]);

  @override
  Future<Enrollment> enroll({
    required String uid,
    required String courseId,
  }) async {
    final now = DateTime.now().toUtc();
    final enrollment = Enrollment(
      courseId: courseId,
      completedLessonIds: const [],
      enrolledAt: now,
      updatedAt: now,
    );
    (enrollments[uid] ??= {})[courseId] = enrollment;
    final course = courses[courseId];
    if (course != null) {
      courses[courseId] = course.copyWith(
        studentCount: course.studentCount + 1,
        activeStudentCount: course.activeStudentCount + 1,
      );
    }
    _notify();
    return enrollment;
  }

  @override
  Future<void> saveEnrollment({
    required String uid,
    required Enrollment enrollment,
  }) async {
    (enrollments[uid] ??= {})[enrollment.courseId] = enrollment;
    _notify();
  }

  @override
  Future<String?> resolveVideoUrl(Lesson lesson) async {
    if (lesson.videoUrl != null && lesson.videoUrl!.isNotEmpty) {
      return lesson.videoUrl;
    }
    if (lesson.videoPath == null || lesson.videoPath!.isEmpty) return null;
    return 'https://example.test/${lesson.videoPath}';
  }

  @override
  Future<String?> resolveCoverUrl(Course course) async {
    if (course.coverUrl != null && course.coverUrl!.isNotEmpty) {
      return course.coverUrl;
    }
    if (course.coverPath == null || course.coverPath!.isEmpty) return null;
    return 'https://example.test/${course.coverPath}';
  }

  /// Mirrors the `submitQuizAttempt` callable: grades against the seeded key
  /// and owns completion for quiz lessons.
  @override
  Future<QuizAttemptResult> submitQuizAttempt({
    required String courseId,
    required String lessonId,
    required Map<String, List<int>> answers,
  }) async {
    quizSubmissions.add(
      (courseId: courseId, lessonId: lessonId, answers: answers),
    );
    final key = answerKeys['$courseId/$lessonId'];
    if (key == null) throw StateError(kQuizErrNoAnswerKey);

    final lesson = content[courseId]?.lessonById(lessonId);
    final passPercent = lesson?.passPercent ?? kQuizDefaultPassPercent;

    final correctByQuestion = <String, bool>{};
    for (final entry in key.entries) {
      final expected = entry.value.toSet();
      final given = (answers[entry.key] ?? const <int>[]).toSet();
      correctByQuestion[entry.key] =
          expected.length == given.length && expected.containsAll(given);
    }
    final correct = correctByQuestion.values.where((ok) => ok).length;
    final score = key.isEmpty ? 0 : ((correct / key.length) * 100).round();
    final passed = score >= passPercent;

    if (passed) {
      for (final byCourse in enrollments.values) {
        final enrollment = byCourse[courseId];
        if (enrollment == null) continue;
        final ids = [...enrollment.completedLessonIds];
        if (!ids.contains(lessonId)) ids.add(lessonId);
        byCourse[courseId] = enrollment.copyWith(
          completedLessonIds: ids,
          quizAttempts: {
            ...enrollment.quizAttempts,
            lessonId: QuizAttempt(
              score: score,
              passed: passed,
              at: DateTime.now().toUtc(),
            ),
          },
          updatedAt: DateTime.now().toUtc(),
        );
      }
      _notify();
    }

    return QuizAttemptResult(
      score: score,
      passed: passed,
      passPercent: passPercent,
      correctByQuestion: correctByQuestion,
    );
  }

  @override
  Stream<List<Course>> watchAuthoredCourses(String uid) {
    return _watch(() {
      final list = courses.values.where((c) => c.createdBy == uid).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return list;
    });
  }

  @override
  Stream<List<Course>> watchCoursesByStatus(CourseStatus status) {
    return _watch(() {
      final list = courses.values.where((c) => c.status == status).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return list;
    });
  }

  @override
  Future<Course> createCourse({
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
    required String createdBy,
    required CourseStatus status,
  }) async {
    final now = DateTime.now().toUtc();
    final course = Course(
      id: 'fake-course-${_nextId++}',
      title: title,
      description: description,
      teacherName: teacherName,
      level: level,
      status: status,
      lessonCount: 0,
      durationMinutes: 0,
      studentCount: 0,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
      publishedAt: status == CourseStatus.published ? now : null,
    );
    courses[course.id] = course;
    _notify();
    return course;
  }

  @override
  Future<void> updateCourseMeta({
    required String courseId,
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
  }) async {
    final course = courses[courseId];
    if (course == null) return;
    courses[courseId] = course.copyWith(
      title: title,
      description: description,
      teacherName: teacherName,
      level: level,
      updatedAt: DateTime.now().toUtc(),
    );
    _notify();
  }

  @override
  Future<void> setCourseStatus({
    required String courseId,
    required CourseStatus status,
  }) async {
    final course = courses[courseId];
    if (course == null) return;
    final now = DateTime.now().toUtc();
    courses[courseId] = course.copyWith(
      status: status,
      updatedAt: now,
      publishedAt: status == CourseStatus.published ? now : course.publishedAt,
    );
    _notify();
  }

  @override
  Future<void> deleteCourse(String courseId) async {
    courses.remove(courseId);
    content.remove(courseId);
    _notify();
  }
}
