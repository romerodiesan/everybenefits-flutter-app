import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../../users/user_profile.dart';
import '../../users/user_role.dart';
import 'course_models.dart';

/// Persistence port for the academy (testable without Firebase).
abstract class CourseStore {
  Stream<List<Course>> watchPublishedCourses({int limit = 60});

  Stream<Course?> watchCourse(String courseId);

  Future<Course?> fetchCourse(String courseId);

  Future<CourseContent> fetchCourseContent(String courseId);

  Stream<List<LearningPath>> watchPaths({int limit = 30});

  Future<LearningPath?> fetchPath(String pathId);

  Stream<List<Enrollment>> watchEnrollments(String uid, {int limit = 50});

  Stream<Enrollment?> watchEnrollment({
    required String uid,
    required String courseId,
  });

  /// Creates the enrollment and bumps the course's denormalized counter.
  Future<Enrollment> enroll({required String uid, required String courseId});

  Future<void> saveEnrollment({
    required String uid,
    required Enrollment enrollment,
  });

  /// Resolves a playable URL from a Storage path or a direct URL.
  Future<String?> resolveVideoUrl(Lesson lesson);

  Future<String?> resolveCoverUrl(Course course);

  /// Grades a quiz server-side; the answer key never reaches the device.
  Future<QuizAttemptResult> submitQuizAttempt({
    required String courseId,
    required String lessonId,
    required Map<String, List<int>> answers,
  });

  // --- Authoring / management ---

  Stream<List<Course>> watchAuthoredCourses(String uid);

  Stream<List<Course>> watchCoursesByStatus(CourseStatus status);

  Future<Course> createCourse({
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
    required String createdBy,
    required CourseStatus status,
  });

  Future<void> updateCourseMeta({
    required String courseId,
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
  });

  Future<void> setCourseStatus({
    required String courseId,
    required CourseStatus status,
  });

  Future<void> deleteCourse(String courseId);
}

class FirestoreCourseStore implements CourseStore {
  FirestoreCourseStore({
    FirebaseFirestore? firestore,
    this.storage,
    this.functions,
  }) : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  /// Injected in tests; production resolves [FirebaseStorage.instance] lazily.
  final FirebaseStorage? storage;

  /// Injected in tests; quizzes are graded by the `submitQuizAttempt` callable.
  final FirebaseFunctions? functions;
  final Map<String, Future<String>> _storageUrlCache = {};

  FirebaseStorage get _bucket => storage ?? FirebaseStorage.instance;

  FirebaseFunctions get _functions =>
      functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  CollectionReference<Map<String, dynamic>> get _courses =>
      _firestore.collection('courses');

  CollectionReference<Map<String, dynamic>> get _paths =>
      _firestore.collection('paths');

  CollectionReference<Map<String, dynamic>> _enrollments(String uid) =>
      _firestore.collection('users').doc(uid).collection('enrollments');

  @override
  Stream<List<Course>> watchPublishedCourses({int limit = 60}) {
    return _courses
        .where('status', isEqualTo: CourseStatus.published.wireValue)
        .orderBy('publishedAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => Course.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  @override
  Stream<Course?> watchCourse(String courseId) {
    return _courses.doc(courseId).snapshots().map((snap) {
      final data = snap.data();
      if (!snap.exists || data == null) return null;
      return Course.fromMap(snap.id, data);
    });
  }

  @override
  Future<Course?> fetchCourse(String courseId) async {
    final snap = await _courses.doc(courseId).get();
    final data = snap.data();
    if (!snap.exists || data == null) return null;
    return Course.fromMap(snap.id, data);
  }

  @override
  Future<CourseContent> fetchCourseContent(String courseId) async {
    final courseRef = _courses.doc(courseId);
    final results = await Future.wait([
      courseRef.collection('modules').orderBy('order').get(),
      courseRef.collection('lessons').orderBy('order').get(),
    ]);
    return CourseContent(
      modules: results[0]
          .docs
          .map((doc) => CourseModule.fromMap(doc.id, doc.data()))
          .toList(),
      lessons: results[1]
          .docs
          .map((doc) => Lesson.fromMap(doc.id, doc.data()))
          .toList(),
    );
  }

  @override
  Stream<List<LearningPath>> watchPaths({int limit = 30}) {
    return _paths
        .where('status', isEqualTo: CourseStatus.published.wireValue)
        .orderBy('order')
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => LearningPath.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  @override
  Future<LearningPath?> fetchPath(String pathId) async {
    final snap = await _paths.doc(pathId).get();
    final data = snap.data();
    if (!snap.exists || data == null) return null;
    return LearningPath.fromMap(snap.id, data);
  }

  @override
  Stream<List<Enrollment>> watchEnrollments(String uid, {int limit = 50}) {
    return _enrollments(uid)
        .orderBy('updatedAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => Enrollment.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  @override
  Stream<Enrollment?> watchEnrollment({
    required String uid,
    required String courseId,
  }) {
    return _enrollments(uid).doc(courseId).snapshots().map((snap) {
      final data = snap.data();
      if (!snap.exists || data == null) return null;
      return Enrollment.fromMap(snap.id, data);
    });
  }

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

    await _functions.httpsCallable('enrollInCourse').call(<String, dynamic>{
      'courseId': courseId,
    });
    return enrollment;
  }

  @override
  Future<void> saveEnrollment({
    required String uid,
    required Enrollment enrollment,
  }) async {
    final lessonId = enrollment.lastLessonId;
    if (lessonId == null || lessonId.isEmpty) return;
    await _functions.httpsCallable('saveCourseProgress').call(<String, dynamic>{
      'courseId': enrollment.courseId,
      'lessonId': lessonId,
      'positionSeconds': enrollment.lastPositionSeconds,
      'completed': enrollment.completedLessonIds.contains(lessonId),
    });
  }

  @override
  Future<String?> resolveVideoUrl(Lesson lesson) async {
    final direct = lesson.videoUrl;
    if (direct != null && direct.trim().isNotEmpty) return direct.trim();
    final path = lesson.videoPath;
    if (path == null || path.trim().isEmpty) return null;
    return _cachedStorageUrl(path.trim());
  }

  @override
  Future<String?> resolveCoverUrl(Course course) async {
    final direct = course.coverUrl;
    if (direct != null && direct.trim().isNotEmpty) return direct.trim();
    final path = course.coverPath;
    if (path == null || path.trim().isEmpty) return null;
    return _cachedStorageUrl(path.trim());
  }

  Future<String> _cachedStorageUrl(String path) {
    final existing = _storageUrlCache[path];
    if (existing != null) return existing;
    final pending = _bucket.ref(path).getDownloadURL().catchError((Object error) {
      _storageUrlCache.remove(path);
      throw error;
    });
    _storageUrlCache[path] = pending;
    return pending;
  }

  @override
  Future<QuizAttemptResult> submitQuizAttempt({
    required String courseId,
    required String lessonId,
    required Map<String, List<int>> answers,
  }) async {
    final callable = _functions.httpsCallable('submitQuizAttempt');
    final response = await callable.call<Object?>(<String, dynamic>{
      'courseId': courseId,
      'lessonId': lessonId,
      'answers': answers,
    });
    final data = response.data;
    if (data is Map) {
      return QuizAttemptResult.fromMap(Map<String, dynamic>.from(data));
    }
    throw StateError(kQuizErrNoAnswerKey);
  }

  @override
  Stream<List<Course>> watchAuthoredCourses(String uid) {
    return _courses
        .where('createdBy', isEqualTo: uid)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => Course.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  @override
  Stream<List<Course>> watchCoursesByStatus(CourseStatus status) {
    return _courses
        .where('status', isEqualTo: status.wireValue)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => Course.fromMap(doc.id, doc.data()))
              .toList(),
        );
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
    final doc = _courses.doc();
    final course = Course(
      id: doc.id,
      title: title,
      description: description,
      teacherName: teacherName,
      level: level,
      status: status,
      lessonCount: 0,
      durationMinutes: 0,
      studentCount: 0,
      activeStudentCount: 0,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
      publishedAt: status == CourseStatus.published ? now : null,
    );
    await doc.set({
      'title': course.title,
      'description': course.description,
      'teacherName': course.teacherName,
      'level': course.level.wireValue,
      'status': course.status.wireValue,
      'coverPath': null,
      'coverUrl': null,
      'lessonCount': 0,
      'durationMinutes': 0,
      'studentCount': 0,
      'activeStudentCount': 0,
      'createdBy': createdBy,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'publishedAt': status == CourseStatus.published
          ? FieldValue.serverTimestamp()
          : null,
    });
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
    await _courses.doc(courseId).update({
      'title': title,
      'description': description,
      'teacherName': teacherName,
      'level': level.wireValue,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> setCourseStatus({
    required String courseId,
    required CourseStatus status,
  }) async {
    await _courses.doc(courseId).update({
      'status': status.wireValue,
      'updatedAt': FieldValue.serverTimestamp(),
      if (status == CourseStatus.published)
        'publishedAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> deleteCourse(String courseId) async {
    final courseRef = _courses.doc(courseId);
    final modules = await courseRef.collection('modules').get();
    final lessons = await courseRef.collection('lessons').get();

    final batch = _firestore.batch();
    for (final doc in modules.docs) {
      batch.delete(doc.reference);
    }
    for (final doc in lessons.docs) {
      // Answer keys are subdocuments and need an explicit delete.
      batch.delete(doc.reference.collection('secure').doc('answerKey'));
      batch.delete(doc.reference);
    }
    batch.delete(courseRef);
    await batch.commit();

    // Best effort: drop the course folder from Storage.
    try {
      final folder = await _bucket.ref('courses/$courseId').listAll();
      await Future.wait([
        for (final item in folder.items) item.delete(),
        for (final prefix in folder.prefixes)
          prefix.listAll().then(
                (nested) =>
                    Future.wait([for (final f in nested.items) f.delete()]),
              ),
      ]);
    } catch (_) {
      // Missing folder or storage rules — the Firestore docs are already gone.
    }
  }
}

/// Business rules for the academy: permissions, enrollment and progress.
class CourseRepository {
  CourseRepository({CourseStore? store}) : _storeOverride = store;

  final CourseStore? _storeOverride;
  CourseStore? _lazyStore;

  CourseStore get _store =>
      _storeOverride ?? (_lazyStore ??= FirestoreCourseStore());

  Stream<List<Course>> watchPublishedCourses({int limit = 60}) =>
      _store.watchPublishedCourses(limit: limit);

  Stream<Course?> watchCourse(String courseId) => _store.watchCourse(courseId);

  Future<Course?> fetchCourse(String courseId) => _store.fetchCourse(courseId);

  Future<CourseContent> fetchCourseContent(String courseId) =>
      _store.fetchCourseContent(courseId);

  Stream<List<LearningPath>> watchPaths({int limit = 30}) =>
      _store.watchPaths(limit: limit);

  Future<LearningPath?> fetchPath(String pathId) => _store.fetchPath(pathId);

  Stream<List<Enrollment>> watchEnrollments(String uid, {int limit = 50}) =>
      _store.watchEnrollments(uid, limit: limit);

  Stream<Enrollment?> watchEnrollment({
    required String uid,
    required String courseId,
  }) =>
      _store.watchEnrollment(uid: uid, courseId: courseId);

  Future<String?> resolveVideoUrl(Lesson lesson) =>
      _store.resolveVideoUrl(lesson);

  Future<String?> resolveCoverUrl(Course course) =>
      _store.resolveCoverUrl(course);

  Stream<List<Course>> watchAuthoredCourses(String uid) =>
      _store.watchAuthoredCourses(uid);

  Stream<List<Course>> watchPendingCourses() =>
      _store.watchCoursesByStatus(CourseStatus.pending);

  Future<Enrollment> enroll({
    required UserProfile profile,
    required Course course,
  }) {
    if (profile.isAnonymous || profile.role == UserRole.guest) {
      throw StateError(kCourseErrSignInRequired);
    }
    if (!course.isPublished) {
      throw StateError(kCourseErrNotPublished);
    }
    return _store.enroll(uid: profile.uid, courseId: course.id);
  }

  /// Persists playback position and marks lessons complete past the threshold.
  ///
  /// Returns the updated enrollment so callers can render progress optimistically.
  Future<Enrollment> saveLessonProgress({
    required String uid,
    required Course course,
    required Enrollment enrollment,
    required Lesson lesson,
    required int positionSeconds,
    required bool completed,
  }) async {
    final completedIds = [...enrollment.completedLessonIds];
    if (completed && !completedIds.contains(lesson.id)) {
      completedIds.add(lesson.id);
    }
    final allDone =
        course.lessonCount > 0 && completedIds.length >= course.lessonCount;
    final next = enrollment.copyWith(
      completedLessonIds: completedIds,
      lastLessonId: lesson.id,
      lastPositionSeconds: positionSeconds < 0 ? 0 : positionSeconds,
      updatedAt: DateTime.now().toUtc(),
      completedAt: allDone
          ? (enrollment.completedAt ?? DateTime.now().toUtc())
          : null,
      clearCompletedAt: !allDone,
    );
    await _store.saveEnrollment(uid: uid, enrollment: next);
    return next;
  }

  /// Sends a quiz for server-side grading.
  ///
  /// The callable owns completion for quiz lessons, so the caller only needs to
  /// refresh the enrollment afterwards.
  Future<QuizAttemptResult> submitQuizAttempt({
    required Course course,
    required Lesson lesson,
    required Map<String, List<int>> answers,
  }) {
    final unanswered = lesson.questions
        .where((question) => (answers[question.id] ?? const []).isEmpty)
        .isNotEmpty;
    if (unanswered) {
      throw StateError(kQuizErrIncomplete);
    }
    return _store.submitQuizAttempt(
      courseId: course.id,
      lessonId: lesson.id,
      answers: answers,
    );
  }

  Future<Course> createCourse({
    required UserProfile actor,
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
  }) {
    if (!canAuthorCourses(actor.role)) {
      throw StateError(kCourseErrNoPermission);
    }
    final trimmed = title.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError(kCourseErrTitleRequired);
    }
    return _store.createCourse(
      title: trimmed,
      description: description.trim(),
      teacherName: teacherName.trim(),
      level: level,
      createdBy: actor.uid,
      // Admins skip the review queue entirely.
      status: CourseStatus.draft,
    );
  }

  Future<void> updateCourseMeta({
    required UserProfile actor,
    required Course course,
    required String title,
    required String description,
    required String teacherName,
    required CourseLevel level,
  }) {
    if (!canAuthorCourses(actor.role)) {
      throw StateError(kCourseErrNoPermission);
    }
    if (!canEditCourse(course: course, uid: actor.uid, role: actor.role)) {
      throw StateError(
        course.isPublished
            ? kCourseErrAlreadyPublished
            : kCourseErrNoPermission,
      );
    }
    final trimmed = title.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError(kCourseErrTitleRequired);
    }
    return _store.updateCourseMeta(
      courseId: course.id,
      title: trimmed,
      description: description.trim(),
      teacherName: teacherName.trim(),
      level: level,
    );
  }

  Future<void> submitForReview({
    required UserProfile actor,
    required Course course,
  }) {
    if (!canEditCourse(course: course, uid: actor.uid, role: actor.role)) {
      throw StateError(kCourseErrNoPermission);
    }
    return _store.setCourseStatus(
      courseId: course.id,
      status: CourseStatus.pending,
    );
  }

  /// Publishing, unpublishing and rejecting are admin-only.
  Future<void> setCourseStatus({
    required UserProfile actor,
    required Course course,
    required CourseStatus status,
  }) {
    if (status == CourseStatus.pending) {
      return submitForReview(actor: actor, course: course);
    }
    if (!canManageCourses(actor.role)) {
      throw StateError(kCourseErrOnlyAdminPublishes);
    }
    return _store.setCourseStatus(courseId: course.id, status: status);
  }

  Future<void> deleteCourse({
    required UserProfile actor,
    required Course course,
  }) {
    final allowed = canManageCourses(actor.role) ||
        canEditCourse(course: course, uid: actor.uid, role: actor.role);
    if (!allowed) {
      throw StateError(kCourseErrNoPermission);
    }
    return _store.deleteCourse(course.id);
  }
}
