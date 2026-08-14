import 'package:cloud_firestore/cloud_firestore.dart';

import '../../l10n/app_localizations.dart';
import '../../users/permissions.dart';
import '../../users/user_role.dart';

DateTime? readCourseDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value.toUtc();
  if (value is String) return DateTime.tryParse(value)?.toUtc();
  if (value is Timestamp) return value.toDate().toUtc();
  return null;
}

enum CourseLevel {
  basic,
  intermediate,
  advanced;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        CourseLevel.basic => l10n.levelBasic,
        CourseLevel.intermediate => l10n.levelIntermediate,
        CourseLevel.advanced => l10n.levelAdvanced,
      };

  static CourseLevel parse(String? value) {
    return CourseLevel.values.firstWhere(
      (level) => level.wireValue == value,
      orElse: () => CourseLevel.basic,
    );
  }
}

/// Publication workflow: authors draft, admins publish.
enum CourseStatus {
  draft,
  pending,
  published;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        CourseStatus.draft => l10n.courseStatusDraft,
        CourseStatus.pending => l10n.courseStatusPending,
        CourseStatus.published => l10n.courseStatusPublished,
      };

  static CourseStatus parse(String? value) {
    return CourseStatus.values.firstWhere(
      (status) => status.wireValue == value,
      orElse: () => CourseStatus.draft,
    );
  }
}

class Course {
  const Course({
    required this.id,
    required this.title,
    required this.description,
    required this.teacherName,
    required this.level,
    required this.status,
    required this.lessonCount,
    required this.durationMinutes,
    required this.studentCount,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.coverPath,
    this.coverUrl,
    this.publishedAt,
  });

  final String id;
  final String title;
  final String description;
  final String teacherName;
  final CourseLevel level;
  final CourseStatus status;

  /// Storage path of the cover image (resolved to a URL on demand).
  final String? coverPath;

  /// Direct cover URL, used by seeds and already-resolved covers.
  final String? coverUrl;

  final int lessonCount;
  final int durationMinutes;
  final int studentCount;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? publishedAt;

  bool get isPublished => status == CourseStatus.published;

  Course copyWith({
    String? title,
    String? description,
    String? teacherName,
    CourseLevel? level,
    CourseStatus? status,
    String? coverPath,
    String? coverUrl,
    int? lessonCount,
    int? durationMinutes,
    int? studentCount,
    DateTime? updatedAt,
    DateTime? publishedAt,
  }) {
    return Course(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      teacherName: teacherName ?? this.teacherName,
      level: level ?? this.level,
      status: status ?? this.status,
      coverPath: coverPath ?? this.coverPath,
      coverUrl: coverUrl ?? this.coverUrl,
      lessonCount: lessonCount ?? this.lessonCount,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      studentCount: studentCount ?? this.studentCount,
      createdBy: createdBy,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      publishedAt: publishedAt ?? this.publishedAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'title': title,
      'description': description,
      'teacherName': teacherName,
      'level': level.wireValue,
      'status': status.wireValue,
      'coverPath': coverPath,
      'coverUrl': coverUrl,
      'lessonCount': lessonCount,
      'durationMinutes': durationMinutes,
      'studentCount': studentCount,
      'createdBy': createdBy,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'updatedAt': updatedAt.toUtc().toIso8601String(),
      'publishedAt': publishedAt?.toUtc().toIso8601String(),
    };
  }

  factory Course.fromMap(String id, Map<String, dynamic> data) {
    final now = DateTime.now().toUtc();
    return Course(
      id: id,
      title: data['title'] as String? ?? '',
      description: data['description'] as String? ?? '',
      teacherName: data['teacherName'] as String? ?? '',
      level: CourseLevel.parse(data['level'] as String?),
      status: CourseStatus.parse(data['status'] as String?),
      coverPath: data['coverPath'] as String?,
      coverUrl: data['coverUrl'] as String?,
      lessonCount: (data['lessonCount'] as num?)?.toInt() ?? 0,
      durationMinutes: (data['durationMinutes'] as num?)?.toInt() ?? 0,
      studentCount: (data['studentCount'] as num?)?.toInt() ?? 0,
      createdBy: data['createdBy'] as String? ?? '',
      createdAt: readCourseDate(data['createdAt']) ?? now,
      updatedAt: readCourseDate(data['updatedAt']) ??
          readCourseDate(data['createdAt']) ??
          now,
      publishedAt: readCourseDate(data['publishedAt']),
    );
  }

  bool matchesQuery(String rawQuery) {
    final q = rawQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    return title.toLowerCase().contains(q) ||
        description.toLowerCase().contains(q) ||
        teacherName.toLowerCase().contains(q);
  }
}

/// What a learner does in a lesson: watch, read, or answer a quiz.
enum LessonType {
  video,
  reading,
  quiz;

  String get wireValue => name;

  String label(AppLocalizations l10n) => switch (this) {
        LessonType.video => l10n.lessonTypeVideo,
        LessonType.reading => l10n.lessonTypeReading,
        LessonType.quiz => l10n.lessonTypeQuiz,
      };

  /// Legacy lessons predate the field and are always videos.
  static LessonType parse(String? value) {
    return LessonType.values.firstWhere(
      (type) => type.wireValue == value,
      orElse: () => LessonType.video,
    );
  }
}

/// One or many correct options, decided per question by the author.
enum QuizSelectionMode {
  single,
  multi;

  String get wireValue => name;

  static QuizSelectionMode parse(String? value) {
    return QuizSelectionMode.values.firstWhere(
      (mode) => mode.wireValue == value,
      orElse: () => QuizSelectionMode.single,
    );
  }
}

/// A quiz question as learners see it: no correct answers included.
class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.prompt,
    required this.selectionMode,
    required this.options,
  });

  final String id;
  final String prompt;
  final QuizSelectionMode selectionMode;
  final List<String> options;

  bool get isMulti => selectionMode == QuizSelectionMode.multi;

  Map<String, Object?> toMap() => {
        'id': id,
        'prompt': prompt,
        'selectionMode': selectionMode.wireValue,
        'options': options,
      };

  factory QuizQuestion.fromMap(Map<String, dynamic> data, {int index = 0}) {
    final rawOptions = data['options'];
    return QuizQuestion(
      id: (data['id'] as String?)?.trim().isNotEmpty == true
          ? (data['id'] as String).trim()
          : 'q${index + 1}',
      prompt: data['prompt'] as String? ?? '',
      selectionMode: QuizSelectionMode.parse(data['selectionMode'] as String?),
      options: rawOptions is List
          ? rawOptions.map((e) => e.toString()).toList()
          : const [],
    );
  }
}

/// Result of a graded quiz attempt, returned by the `submitQuizAttempt` callable.
class QuizAttemptResult {
  const QuizAttemptResult({
    required this.score,
    required this.passed,
    required this.passPercent,
    required this.correctByQuestion,
  });

  /// Percentage of questions answered correctly, 0–100.
  final int score;
  final bool passed;
  final int passPercent;

  /// Per-question outcome; never exposes the correct options.
  final Map<String, bool> correctByQuestion;

  factory QuizAttemptResult.fromMap(Map<String, dynamic> data) {
    final raw = data['correctByQuestion'];
    return QuizAttemptResult(
      score: (data['score'] as num?)?.round() ?? 0,
      passed: data['passed'] == true,
      passPercent: (data['passPercent'] as num?)?.round() ?? 0,
      correctByQuestion: raw is Map
          ? {
              for (final entry in raw.entries)
                entry.key.toString(): entry.value == true,
            }
          : const {},
    );
  }
}

class CourseModule {
  const CourseModule({
    required this.id,
    required this.title,
    required this.order,
  });

  final String id;
  final String title;
  final int order;

  Map<String, Object?> toMap() => {'title': title, 'order': order};

  factory CourseModule.fromMap(String id, Map<String, dynamic> data) {
    return CourseModule(
      id: id,
      title: data['title'] as String? ?? '',
      order: (data['order'] as num?)?.toInt() ?? 0,
    );
  }
}

class Lesson {
  const Lesson({
    required this.id,
    required this.moduleId,
    required this.title,
    required this.order,
    required this.durationSeconds,
    this.type = LessonType.video,
    this.videoPath,
    this.videoUrl,
    this.bodyMarkdown,
    this.questions = const [],
    this.passPercent = kQuizDefaultPassPercent,
  });

  final String id;
  final String moduleId;
  final String title;
  final int order;
  final int durationSeconds;
  final LessonType type;

  /// Storage path; resolved to a download URL when playing.
  final String? videoPath;

  /// Direct URL, used by seeds and external hosting.
  final String? videoUrl;

  /// Markdown body for reading lessons.
  final String? bodyMarkdown;

  /// Quiz questions without their answer key (that lives in a secure doc).
  final List<QuizQuestion> questions;

  /// Score needed to pass a quiz, 0–100.
  final int passPercent;

  bool get isVideo => type == LessonType.video;
  bool get isReading => type == LessonType.reading;
  bool get isQuiz => type == LessonType.quiz;

  bool get hasVideo =>
      (videoPath != null && videoPath!.isNotEmpty) ||
      (videoUrl != null && videoUrl!.isNotEmpty);

  bool get hasReading =>
      bodyMarkdown != null && bodyMarkdown!.trim().isNotEmpty;

  bool get hasQuiz => questions.isNotEmpty;

  /// Whether the lesson is ready for learners, whatever its type.
  bool get hasContent => switch (type) {
        LessonType.video => hasVideo,
        LessonType.reading => hasReading,
        LessonType.quiz => hasQuiz,
      };

  Map<String, Object?> toMap() => {
        'moduleId': moduleId,
        'title': title,
        'order': order,
        'durationSeconds': durationSeconds,
        'type': type.wireValue,
        'videoPath': videoPath,
        'videoUrl': videoUrl,
        'bodyMarkdown': bodyMarkdown,
        'questions': [for (final question in questions) question.toMap()],
        'passPercent': passPercent,
      };

  factory Lesson.fromMap(String id, Map<String, dynamic> data) {
    final rawQuestions = data['questions'];
    return Lesson(
      id: id,
      moduleId: data['moduleId'] as String? ?? '',
      title: data['title'] as String? ?? '',
      order: (data['order'] as num?)?.toInt() ?? 0,
      durationSeconds: resolveLessonDurationSeconds(data),
      type: LessonType.parse(data['type'] as String?),
      videoPath: data['videoPath'] as String?,
      videoUrl: data['videoUrl'] as String?,
      bodyMarkdown: data['bodyMarkdown'] as String?,
      questions: rawQuestions is List
          ? [
              for (var i = 0; i < rawQuestions.length; i++)
                if (rawQuestions[i] is Map)
                  QuizQuestion.fromMap(
                    Map<String, dynamic>.from(rawQuestions[i] as Map),
                    index: i,
                  ),
            ]
          : const [],
      passPercent: (data['passPercent'] as num?)?.round() ??
          kQuizDefaultPassPercent,
    );
  }
}

/// Modules plus their lessons, already ordered for rendering.
class CourseContent {
  const CourseContent({required this.modules, required this.lessons});

  static const empty = CourseContent(modules: [], lessons: []);

  final List<CourseModule> modules;
  final List<Lesson> lessons;

  List<Lesson> lessonsOf(String moduleId) =>
      lessons.where((lesson) => lesson.moduleId == moduleId).toList();

  /// Lessons whose module no longer exists still need to be reachable.
  List<Lesson> get orphanLessons {
    final ids = modules.map((m) => m.id).toSet();
    return lessons.where((l) => !ids.contains(l.moduleId)).toList();
  }

  Lesson? lessonById(String? id) {
    if (id == null) return null;
    for (final lesson in lessons) {
      if (lesson.id == id) return lesson;
    }
    return null;
  }

  Lesson? lessonAfter(String id) {
    final index = lessons.indexWhere((lesson) => lesson.id == id);
    if (index < 0 || index + 1 >= lessons.length) return null;
    return lessons[index + 1];
  }

  /// Quizzes inside a module, in syllabus order.
  List<Lesson> quizzesInModule(String moduleId) =>
      lessonsOf(moduleId).where((lesson) => lesson.isQuiz).toList();

  /// True when every quiz in [moduleId] has a passing server attempt.
  /// Modules without quizzes are treated as cleared.
  bool moduleQuizzesPassed(String moduleId, Enrollment? enrollment) {
    final quizzes = quizzesInModule(moduleId);
    if (quizzes.isEmpty) return true;
    if (enrollment == null) return false;
    for (final quiz in quizzes) {
      if (enrollment.attemptFor(quiz.id)?.passed != true) return false;
    }
    return true;
  }

  int _moduleIndex(String moduleId) =>
      modules.indexWhere((module) => module.id == moduleId);

  /// Quizzes in earlier modules that still block access to [moduleId].
  List<Lesson> blockingQuizzesBefore(
    String moduleId,
    Enrollment? enrollment,
  ) {
    final index = _moduleIndex(moduleId);
    if (index <= 0) return const [];
    final blockers = <Lesson>[];
    for (var i = 0; i < index; i++) {
      for (final quiz in quizzesInModule(modules[i].id)) {
        if (enrollment?.attemptFor(quiz.id)?.passed != true) {
          blockers.add(quiz);
        }
      }
    }
    return blockers;
  }

  /// A module unlocks once every prior module with quizzes has been passed.
  bool isModuleUnlocked(String moduleId, Enrollment? enrollment) =>
      blockingQuizzesBefore(moduleId, enrollment).isEmpty;

  bool isLessonUnlocked(Lesson lesson, Enrollment? enrollment) =>
      isModuleUnlocked(lesson.moduleId, enrollment);

  /// Next lesson in order, but only if its module is unlocked.
  Lesson? lessonAfterAccessible(String id, Enrollment? enrollment) {
    final next = lessonAfter(id);
    if (next == null) return null;
    if (!isLessonUnlocked(next, enrollment)) return null;
    return next;
  }
}

class LearningPath {
  const LearningPath({
    required this.id,
    required this.title,
    required this.description,
    required this.level,
    required this.status,
    required this.courseIds,
    required this.order,
    this.createdBy = '',
  });

  final String id;
  final String title;
  final String description;
  final CourseLevel level;
  final CourseStatus status;
  final List<String> courseIds;
  final int order;

  /// Author uid; managers edit their own drafts until an admin publishes.
  final String createdBy;

  bool get isPublished => status == CourseStatus.published;

  Map<String, Object?> toMap() => {
        'title': title,
        'description': description,
        'level': level.wireValue,
        'status': status.wireValue,
        'courseIds': courseIds,
        'order': order,
        'createdBy': createdBy,
      };

  factory LearningPath.fromMap(String id, Map<String, dynamic> data) {
    final raw = data['courseIds'];
    return LearningPath(
      id: id,
      title: data['title'] as String? ?? '',
      description: data['description'] as String? ?? '',
      level: CourseLevel.parse(data['level'] as String?),
      status: CourseStatus.parse(data['status'] as String?),
      courseIds: raw is List
          ? raw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList()
          : const [],
      order: (data['order'] as num?)?.toInt() ?? 0,
      createdBy: data['createdBy'] as String? ?? '',
    );
  }
}

/// Best graded attempt for a quiz lesson, written by the server.
class QuizAttempt {
  const QuizAttempt({
    required this.score,
    required this.passed,
    this.at,
  });

  final int score;
  final bool passed;
  final DateTime? at;

  Map<String, Object?> toMap() => {
        'score': score,
        'passed': passed,
        'at': at?.toUtc().toIso8601String(),
      };

  factory QuizAttempt.fromMap(Map<String, dynamic> data) {
    return QuizAttempt(
      score: (data['score'] as num?)?.round() ?? 0,
      passed: data['passed'] == true,
      at: readCourseDate(data['at']),
    );
  }
}

class Enrollment {
  const Enrollment({
    required this.courseId,
    required this.completedLessonIds,
    required this.enrolledAt,
    required this.updatedAt,
    this.lastLessonId,
    this.lastPositionSeconds = 0,
    this.completedAt,
    this.quizAttempts = const {},
  });

  final String courseId;
  final List<String> completedLessonIds;
  final String? lastLessonId;
  final int lastPositionSeconds;
  final DateTime enrolledAt;
  final DateTime updatedAt;
  final DateTime? completedAt;

  /// Latest graded quiz attempt per lesson id (server-written).
  final Map<String, QuizAttempt> quizAttempts;

  bool get isCompleted => completedAt != null;

  bool hasCompleted(String lessonId) => completedLessonIds.contains(lessonId);

  QuizAttempt? attemptFor(String lessonId) => quizAttempts[lessonId];

  /// Fraction of the course finished, clamped to [0, 1].
  double progressFor(int lessonCount) {
    if (lessonCount <= 0) return isCompleted ? 1 : 0;
    final done = completedLessonIds.length;
    return (done / lessonCount).clamp(0.0, 1.0);
  }

  Enrollment copyWith({
    List<String>? completedLessonIds,
    String? lastLessonId,
    int? lastPositionSeconds,
    DateTime? updatedAt,
    DateTime? completedAt,
    Map<String, QuizAttempt>? quizAttempts,
    bool clearCompletedAt = false,
  }) {
    return Enrollment(
      courseId: courseId,
      completedLessonIds: completedLessonIds ?? this.completedLessonIds,
      lastLessonId: lastLessonId ?? this.lastLessonId,
      lastPositionSeconds: lastPositionSeconds ?? this.lastPositionSeconds,
      enrolledAt: enrolledAt,
      updatedAt: updatedAt ?? this.updatedAt,
      completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
      quizAttempts: quizAttempts ?? this.quizAttempts,
    );
  }

  Map<String, Object?> toMap() => {
        'courseId': courseId,
        'completedLessonIds': completedLessonIds,
        'lastLessonId': lastLessonId,
        'lastPositionSeconds': lastPositionSeconds,
        'enrolledAt': enrolledAt.toUtc().toIso8601String(),
        'updatedAt': updatedAt.toUtc().toIso8601String(),
        'completedAt': completedAt?.toUtc().toIso8601String(),
        'quizAttempts': {
          for (final entry in quizAttempts.entries)
            entry.key: entry.value.toMap(),
        },
      };

  factory Enrollment.fromMap(String courseId, Map<String, dynamic> data) {
    final now = DateTime.now().toUtc();
    final raw = data['completedLessonIds'];
    final rawAttempts = data['quizAttempts'];
    return Enrollment(
      courseId: data['courseId'] as String? ?? courseId,
      completedLessonIds: raw is List
          ? raw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList()
          : const [],
      lastLessonId: data['lastLessonId'] as String?,
      lastPositionSeconds:
          (data['lastPositionSeconds'] as num?)?.toInt() ?? 0,
      enrolledAt: readCourseDate(data['enrolledAt']) ?? now,
      updatedAt: readCourseDate(data['updatedAt']) ??
          readCourseDate(data['enrolledAt']) ??
          now,
      completedAt: readCourseDate(data['completedAt']),
      quizAttempts: rawAttempts is Map
          ? {
              for (final entry in rawAttempts.entries)
                if (entry.value is Map)
                  entry.key.toString(): QuizAttempt.fromMap(
                    Map<String, dynamic>.from(entry.value as Map),
                  ),
            }
          : const {},
    );
  }
}

/// A course paired with the viewer's progress, for "keep learning" rows.
class EnrolledCourse {
  const EnrolledCourse({required this.course, required this.enrollment});

  final Course course;
  final Enrollment enrollment;

  double get progress => enrollment.progressFor(course.lessonCount);
}

/// Managers and admins can author courses.
bool canAuthorCoursesForRole(UserRole role) => canAuthorCourses(role.wireValue);

/// Same authors who write courses can draft learning paths.
bool canAuthorPathsForRole(UserRole role) => canAuthorPaths(role.wireValue);

/// Only admins publish and approve courses and paths.
bool canManageCoursesForRole(UserRole role) => canManageCourses(role.wireValue);

/// Authors keep editing until an admin publishes; admins always may.
bool canEditCourse({
  required Course course,
  required String uid,
  required Object? roleOrPermissions,
}) {
  if (can(roleOrPermissions, Perm.coursesEditAny) ||
      canManageCourses(roleOrPermissions)) {
    return true;
  }
  if (!canAuthorCourses(roleOrPermissions)) return false;
  return course.createdBy == uid && !course.isPublished;
}

/// Authors keep editing their path until an admin publishes; admins always may.
bool canEditPath({
  required LearningPath path,
  required String uid,
  required Object? roleOrPermissions,
}) {
  if (can(roleOrPermissions, Perm.pathsEditAny) ||
      canManageCourses(roleOrPermissions)) {
    return true;
  }
  if (!canAuthorPaths(roleOrPermissions)) return false;
  return path.createdBy == uid && !path.isPublished;
}
/// Formats a course duration using localized units.
String courseDurationLabel(AppLocalizations l10n, int minutes) {
  if (minutes < 60) return l10n.courseDurationMinutes(minutes);
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  if (rest == 0) return l10n.courseDurationHoursMinutes(hours, 0);
  return l10n.courseDurationHoursMinutes(hours, rest);
}

int resolveLessonDurationSeconds(Map<String, dynamic> data) {
  final minutes = _asPositiveInt(data['durationMinutes']);
  var seconds = _asPositiveInt(data['durationSeconds']);
  if (seconds == null && data['durationSeconds'] is String) {
    seconds = parseClockDuration(data['durationSeconds'] as String);
  }
  if (minutes != null &&
      minutes > 0 &&
      (seconds == null || seconds == 0 || seconds == minutes)) {
    return minutes * 60;
  }
  return seconds ?? 0;
}

int? parseClockDuration(String raw) {
  final parts = raw.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  final nums = parts.map(int.tryParse).toList();
  if (nums.any((n) => n == null || n < 0)) return null;
  if (parts.length == 2) return nums[0]! * 60 + nums[1]!;
  return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
}

int? _asPositiveInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

String lessonDurationLabel(AppLocalizations l10n, int seconds) {
  if (seconds <= 0) return '';
  if (seconds < 60) return l10n.courseDurationSeconds(seconds);
  final minutes = (seconds / 60).round();
  if (minutes < 60) return l10n.courseDurationMinutes(minutes);
  return courseDurationLabel(l10n, minutes);
}

/// Video lesson completes once the learner reaches this share of the video.
const double kLessonCompleteThreshold = 0.9;

/// Default passing score for new quizzes; authors can change it per quiz.
const int kQuizDefaultPassPercent = 70;

String friendlyCourseError(Object error, AppLocalizations l10n) {
  final raw = '$error';
  if (raw.contains('permission') || raw.contains('PERMISSION')) {
    return l10n.errCourseNoPermission;
  }

  final cleaned = raw
      .replaceFirst(RegExp(r'^.*?Exception:\s*'), '')
      .replaceFirst(RegExp(r'^Bad state:\s*'), '')
      .replaceFirst(RegExp(r'^Invalid argument\(s\):\s*'), '')
      .replaceFirst('StateError: ', '')
      .replaceFirst('ArgumentError: ', '')
      .trim();

  final known = <String, String Function(AppLocalizations)>{
    kCourseErrNoPermission: (l) => l.errCourseNoPermission,
    kCourseErrTitleRequired: (l) => l.errCourseTitleRequired,
    kCourseErrAlreadyPublished: (l) => l.errCourseAlreadyPublished,
    kCourseErrNotPublished: (l) => l.errCourseNotPublished,
    kCourseErrSignInRequired: (l) => l.errCourseSignInRequired,
    kCourseErrOnlyAdminPublishes: (l) => l.errCourseOnlyAdminPublishes,
    kQuizErrIncomplete: (l) => l.errQuizIncomplete,
    kQuizErrNoAnswerKey: (l) => l.errQuizNoAnswerKey,
  };

  final mapped = known[cleaned];
  if (mapped != null) return mapped(l10n);
  return l10n.errGenericRetry;
}

// Repository error codes, mapped to copy by [friendlyCourseError].
const kCourseErrNoPermission = 'course/no-permission';
const kCourseErrTitleRequired = 'course/title-required';
const kCourseErrAlreadyPublished = 'course/already-published';
const kCourseErrNotPublished = 'course/not-published';
const kCourseErrSignInRequired = 'course/sign-in-required';
const kCourseErrOnlyAdminPublishes = 'course/only-admin-publishes';
const kQuizErrIncomplete = 'quiz/incomplete';
const kQuizErrNoAnswerKey = 'quiz/no-answer-key';
