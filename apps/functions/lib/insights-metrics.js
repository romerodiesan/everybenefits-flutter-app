"use strict";
/**
 * Pure Academy insights metrics — no Firebase imports.
 * Mirrored from studio/lib/insights/metrics.ts — keep in sync.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRESS_BUCKETS = void 0;
exports.progressPercent = progressPercent;
exports.progressBucket = progressBucket;
exports.buildProgressBuckets = buildProgressBuckets;
exports.filterByRange = filterByRange;
exports.countActive = countActive;
exports.countCompleted = countCompleted;
exports.countInProgress = countInProgress;
exports.countUniqueActiveStudents = countUniqueActiveStudents;
exports.avgProgressInProgress = avgProgressInProgress;
exports.isStalled = isStalled;
exports.countStalled = countStalled;
exports.filterByLearnerStatus = filterByLearnerStatus;
exports.buildPortfolioStudents = buildPortfolioStudents;
exports.medianDaysToComplete = medianDaysToComplete;
exports.buildLessonFunnel = buildLessonFunnel;
exports.topDropOffs = topDropOffs;
exports.buildQuizStats = buildQuizStats;
exports.stuckOnQuiz = stuckOnQuiz;
exports.computeCourseKpis = computeCourseKpis;
exports.PROGRESS_BUCKETS = [
    "0",
    "1-25",
    "26-50",
    "51-75",
    "76-99",
    "100",
];
function progressPercent(completedLessonIds, lessonCount) {
    if (lessonCount <= 0)
        return 0;
    return Math.min(1, completedLessonIds.length / lessonCount);
}
function progressBucket(completedLessonIds, lessonCount) {
    const pct = progressPercent(completedLessonIds, lessonCount) * 100;
    if (pct <= 0)
        return "0";
    if (pct >= 100)
        return "100";
    if (pct <= 25)
        return "1-25";
    if (pct <= 50)
        return "26-50";
    if (pct <= 75)
        return "51-75";
    return "76-99";
}
function buildProgressBuckets(enrollments, lessonCount) {
    const counts = {
        "0": 0,
        "1-25": 0,
        "26-50": 0,
        "51-75": 0,
        "76-99": 0,
        "100": 0,
    };
    for (const row of enrollments) {
        counts[progressBucket(row.completedLessonIds, lessonCount)] += 1;
    }
    return exports.PROGRESS_BUCKETS.map((id) => ({ id, count: counts[id] }));
}
function filterByRange(enrollments, rangeDays, nowMs = Date.now()) {
    if (rangeDays == null || rangeDays <= 0)
        return enrollments;
    const cutoff = nowMs - rangeDays * 24 * 60 * 60 * 1000;
    return enrollments.filter((row) => {
        const ts = row.enrolledAtMs ?? row.updatedAtMs;
        return ts != null && ts >= cutoff;
    });
}
/** Active = touched (updatedAt) within range; if no range, updated in last 30d. */
function countActive(enrollments, rangeDays, nowMs = Date.now()) {
    const windowDays = rangeDays && rangeDays > 0 ? rangeDays : 30;
    const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;
    return enrollments.filter((row) => row.updatedAtMs != null && row.updatedAtMs >= cutoff).length;
}
function countCompleted(enrollments) {
    return enrollments.filter((row) => row.completedAtMs != null).length;
}
/** In progress = enrolled and not yet completed. */
function countInProgress(enrollments) {
    return enrollments.filter((row) => row.completedAtMs == null).length;
}
/** Unique UIDs with at least one in-progress enrollment. */
function countUniqueActiveStudents(enrollments) {
    const uids = new Set();
    for (const row of enrollments) {
        if (row.completedAtMs == null)
            uids.add(row.uid);
    }
    return uids.size;
}
/** Mean progress (0–1) across in-progress enrollments only. */
function avgProgressInProgress(enrollments, lessonCount) {
    const open = enrollments.filter((row) => row.completedAtMs == null);
    if (open.length === 0)
        return 0;
    const sum = open.reduce((acc, row) => acc + progressPercent(row.completedLessonIds, lessonCount), 0);
    return sum / open.length;
}
function isStalled(row, stalledDays = 14, nowMs = Date.now()) {
    if (row.completedAtMs != null)
        return false;
    if (row.updatedAtMs == null)
        return true;
    return nowMs - row.updatedAtMs > stalledDays * 24 * 60 * 60 * 1000;
}
function countStalled(enrollments, stalledDays = 14, nowMs = Date.now()) {
    return enrollments.filter((row) => isStalled(row, stalledDays, nowMs)).length;
}
function filterByLearnerStatus(enrollments, status, nowMs = Date.now(), stalledDays = 14) {
    if (status === "all")
        return enrollments;
    if (status === "completed") {
        return enrollments.filter((row) => row.completedAtMs != null);
    }
    if (status === "atRisk") {
        return enrollments.filter((row) => isStalled(row, stalledDays, nowMs));
    }
    return enrollments.filter((row) => row.completedAtMs == null);
}
/**
 * Group enrollments by uid for portfolio student progress.
 * Only students with ≥1 in-progress course are included.
 */
function buildPortfolioStudents(rows, nowMs = Date.now()) {
    const byUid = new Map();
    for (const row of rows) {
        const { enrollment, courseId, title, lessonCount } = row;
        const progress = progressPercent(enrollment.completedLessonIds, lessonCount);
        const stalled = isStalled(enrollment, 14, nowMs);
        const courseRow = {
            courseId,
            title,
            progress,
            stalled,
            completedAtMs: enrollment.completedAtMs,
        };
        let entry = byUid.get(enrollment.uid);
        if (!entry) {
            entry = {
                courses: [],
                progressSum: 0,
                inProgressCount: 0,
                updatedAtMs: null,
                atRisk: false,
            };
            byUid.set(enrollment.uid, entry);
        }
        entry.courses.push(courseRow);
        if (enrollment.completedAtMs == null) {
            entry.inProgressCount += 1;
            entry.progressSum += progress;
            if (stalled)
                entry.atRisk = true;
        }
        const updated = enrollment.updatedAtMs;
        if (updated != null &&
            (entry.updatedAtMs == null || updated > entry.updatedAtMs)) {
            entry.updatedAtMs = updated;
        }
    }
    const out = [];
    for (const [uid, entry] of byUid) {
        if (entry.inProgressCount === 0)
            continue;
        out.push({
            uid,
            coursesInProgress: entry.inProgressCount,
            avgProgress: entry.progressSum / entry.inProgressCount,
            updatedAtMs: entry.updatedAtMs,
            atRisk: entry.atRisk,
            courses: entry.courses,
        });
    }
    out.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
    return out;
}
function medianDaysToComplete(enrollments) {
    const days = [];
    for (const row of enrollments) {
        if (row.completedAtMs == null || row.enrolledAtMs == null)
            continue;
        const delta = row.completedAtMs - row.enrolledAtMs;
        if (delta < 0)
            continue;
        days.push(delta / (24 * 60 * 60 * 1000));
    }
    if (days.length === 0)
        return null;
    days.sort((a, b) => a - b);
    const mid = Math.floor(days.length / 2);
    if (days.length % 2 === 0) {
        return (days[mid - 1] + days[mid]) / 2;
    }
    return days[mid];
}
function buildLessonFunnel(lessons, enrollments) {
    const enrolled = enrollments.length;
    const ordered = [...lessons].sort((a, b) => a.order - b.order);
    let prevRate = null;
    return ordered.map((lesson) => {
        const completedCount = enrollments.filter((row) => row.completedLessonIds.includes(lesson.id)).length;
        const rate = enrolled > 0 ? completedCount / enrolled : 0;
        const dropFromPrev = prevRate == null ? null : Math.max(0, prevRate - rate);
        prevRate = rate;
        return {
            lessonId: lesson.id,
            title: lesson.title,
            moduleId: lesson.moduleId,
            type: lesson.type,
            completedCount,
            rate,
            dropFromPrev,
        };
    });
}
function topDropOffs(funnel, limit = 5) {
    return [...funnel]
        .filter((row) => row.dropFromPrev != null && row.dropFromPrev > 0)
        .sort((a, b) => (b.dropFromPrev ?? 0) - (a.dropFromPrev ?? 0))
        .slice(0, limit);
}
function buildQuizStats(lessons, enrollments) {
    return lessons
        .filter((lesson) => lesson.type === "quiz")
        .map((lesson) => {
        const attempts = enrollments
            .map((row) => row.quizAttempts[lesson.id])
            .filter(Boolean);
        const passed = attempts.filter((a) => a.passed).length;
        const avgScore = attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
            : null;
        return {
            lessonId: lesson.id,
            title: lesson.title,
            attempts: attempts.length,
            passed,
            passRate: attempts.length > 0 ? passed / attempts.length : 0,
            avgScore,
        };
    });
}
function stuckOnQuiz(lessons, enrollments) {
    const quizzes = lessons.filter((l) => l.type === "quiz");
    const out = [];
    for (const row of enrollments) {
        if (row.completedAtMs != null)
            continue;
        for (const quiz of quizzes) {
            const attempt = row.quizAttempts[quiz.id];
            if (!attempt || attempt.passed)
                continue;
            if (row.completedLessonIds.includes(quiz.id))
                continue;
            out.push({
                uid: row.uid,
                lessonId: quiz.id,
                lessonTitle: quiz.title,
                score: attempt.score,
            });
        }
    }
    return out;
}
function computeCourseKpis(enrollments, rangeDays, nowMs = Date.now(), lessonCount = 0) {
    const scoped = filterByRange(enrollments, rangeDays, nowMs);
    const enrolled = scoped.length;
    const completed = countCompleted(scoped);
    return {
        enrolled,
        active: countActive(scoped, rangeDays, nowMs),
        inProgress: countInProgress(scoped),
        completed,
        completionRate: enrolled > 0 ? completed / enrolled : 0,
        medianDaysToComplete: medianDaysToComplete(scoped),
        stalled: countStalled(scoped, 14, nowMs),
        avgProgress: avgProgressInProgress(scoped, lessonCount),
    };
}
//# sourceMappingURL=insights-metrics.js.map