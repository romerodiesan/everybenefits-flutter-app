import type { CourseContent, Enrollment, Lesson } from "./types";

/** Quizzes inside a module, in syllabus order. */
export function quizzesInModule(
  content: CourseContent,
  moduleId: string,
): Lesson[] {
  return content.lessons.filter(
    (lesson) => lesson.moduleId === moduleId && lesson.type === "quiz",
  );
}

/** True when every quiz in the module has a passing server attempt. */
export function moduleQuizzesPassed(
  content: CourseContent,
  moduleId: string,
  enrollment: Enrollment | null | undefined,
): boolean {
  const quizzes = quizzesInModule(content, moduleId);
  if (quizzes.length === 0) return true;
  if (!enrollment) return false;
  return quizzes.every(
    (quiz) => enrollment.quizAttempts[quiz.id]?.passed === true,
  );
}

function moduleIndex(content: CourseContent, moduleId: string): number {
  return content.modules.findIndex((module) => module.id === moduleId);
}

/**
 * Quizzes in earlier modules that still block access to [moduleId].
 * Modules without quizzes never contribute blockers.
 */
export function blockingQuizzesBefore(
  content: CourseContent,
  moduleId: string,
  enrollment: Enrollment | null | undefined,
): Lesson[] {
  const index = moduleIndex(content, moduleId);
  if (index <= 0) return [];
  const blockers: Lesson[] = [];
  for (let i = 0; i < index; i += 1) {
    for (const quiz of quizzesInModule(content, content.modules[i].id)) {
      if (enrollment?.quizAttempts[quiz.id]?.passed !== true) {
        blockers.push(quiz);
      }
    }
  }
  return blockers;
}

/** A module unlocks once every prior module with quizzes has been passed. */
export function isModuleUnlocked(
  content: CourseContent,
  moduleId: string,
  enrollment: Enrollment | null | undefined,
): boolean {
  return blockingQuizzesBefore(content, moduleId, enrollment).length === 0;
}

export function isLessonUnlocked(
  content: CourseContent,
  lesson: Lesson,
  enrollment: Enrollment | null | undefined,
): boolean {
  return isModuleUnlocked(content, lesson.moduleId, enrollment);
}

/** Next lesson in order, but only if its module is unlocked. */
export function lessonAfterAccessible(
  content: CourseContent,
  lessonId: string,
  enrollment: Enrollment | null | undefined,
): Lesson | null {
  const index = content.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0 || index + 1 >= content.lessons.length) return null;
  const next = content.lessons[index + 1];
  if (!isLessonUnlocked(content, next, enrollment)) return null;
  return next;
}
