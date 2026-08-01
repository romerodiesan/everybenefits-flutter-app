"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCourseStudentsPage = listCourseStudentsPage;
exports.buildCourseInsights = buildCourseInsights;
exports.buildCatalogInsights = buildCatalogInsights;
exports.assertCanViewCourseInsights = assertCanViewCourseInsights;
/**
 * Academy insights aggregations for Studio (Admin SDK).
 * Keep formulas aligned with studio/lib/insights/metrics.ts.
 */
const firestore_1 = require("firebase-admin/firestore");
const insights_metrics_1 = require("./insights-metrics");
function db() {
    return (0, firestore_1.getFirestore)();
}
function tsMillis(value) {
    if (value instanceof firestore_1.Timestamp)
        return value.toMillis();
    if (value &&
        typeof value === "object" &&
        "toMillis" in value &&
        typeof value.toMillis === "function") {
        return value.toMillis();
    }
    return null;
}
function parseEnrollment(uid, data) {
    const quizRaw = data.quizAttempts && typeof data.quizAttempts === "object"
        ? data.quizAttempts
        : {};
    const quizAttempts = {};
    for (const [lessonId, raw] of Object.entries(quizRaw)) {
        if (!raw || typeof raw !== "object")
            continue;
        const row = raw;
        quizAttempts[lessonId] = {
            score: Number(row.score ?? 0),
            passed: row.passed === true,
            atMs: tsMillis(row.at),
        };
    }
    return {
        uid,
        completedLessonIds: Array.isArray(data.completedLessonIds)
            ? data.completedLessonIds.map(String)
            : [],
        lastLessonId: typeof data.lastLessonId === "string" ? data.lastLessonId : null,
        enrolledAtMs: tsMillis(data.enrolledAt),
        updatedAtMs: tsMillis(data.updatedAt),
        completedAtMs: tsMillis(data.completedAt),
        quizAttempts,
    };
}
async function loadCourseEnrollments(courseId, limit = 500) {
    const snap = await db()
        .collectionGroup("enrollments")
        .where("courseId", "==", courseId)
        .limit(limit)
        .get();
    const rows = [];
    for (const doc of snap.docs) {
        const uid = doc.ref.parent.parent?.id;
        if (!uid)
            continue;
        rows.push(parseEnrollment(uid, doc.data()));
    }
    console.info(JSON.stringify({
        scale: "loadCourseEnrollments",
        courseId,
        docsRead: snap.size,
        limit,
    }));
    return rows;
}
async function listCourseStudentsPage(opts) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    let q = db()
        .collectionGroup("enrollments")
        .where("courseId", "==", opts.courseId)
        .orderBy(firestore_1.FieldPath.documentId())
        .limit(limit + 1);
    // Cursor is enrollment doc path users/{uid}/enrollments/{courseId}
    if (opts.cursor) {
        const cursorSnap = await db().doc(opts.cursor).get();
        if (cursorSnap.exists) {
            q = q.startAfter(cursorSnap);
        }
    }
    const snap = await q.get();
    const docs = snap.docs.slice(0, limit);
    const students = docs.map((doc) => {
        const uid = doc.ref.parent.parent?.id ?? "";
        const data = doc.data();
        return {
            uid,
            enrollment: {
                courseId: String(data.courseId ?? opts.courseId),
                completedLessonIds: Array.isArray(data.completedLessonIds)
                    ? data.completedLessonIds.map(String)
                    : [],
                lastLessonId: typeof data.lastLessonId === "string" ? data.lastLessonId : null,
                lastPositionSeconds: Number(data.lastPositionSeconds ?? 0),
                enrolledAtMs: tsMillis(data.enrolledAt),
                updatedAtMs: tsMillis(data.updatedAt),
                completedAtMs: tsMillis(data.completedAt),
            },
        };
    });
    const nextCursor = snap.docs.length > limit ? docs[docs.length - 1]?.ref.path ?? null : null;
    return { students, nextCursor };
}
async function loadCourseLessons(courseId) {
    const lessonsSnap = await db()
        .collection(`courses/${courseId}/lessons`)
        .orderBy("order", "asc")
        .get();
    return lessonsSnap.docs.map((lesson, index) => {
        const data = lesson.data();
        const typeRaw = String(data.type ?? "video");
        const type = typeRaw === "quiz" || typeRaw === "reading" || typeRaw === "video"
            ? typeRaw
            : "video";
        return {
            id: lesson.id,
            title: String(data.title ?? "Lesson"),
            moduleId: String(data.moduleId ?? ""),
            order: Number(data.order ?? index),
            type,
        };
    });
}
async function loadProfiles(uids) {
    const out = {};
    const unique = [...new Set(uids)].slice(0, 500);
    const chunkSize = 100;
    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const refs = chunk.map((uid) => db().doc(`users/${uid}`));
        const snaps = await db().getAll(...refs);
        for (const snap of snaps) {
            if (!snap.exists) {
                out[snap.id] = {
                    displayName: null,
                    email: null,
                    photoUrl: null,
                    role: "guest",
                };
                continue;
            }
            const data = snap.data() ?? {};
            out[snap.id] = {
                displayName: typeof data.displayName === "string" ? data.displayName : null,
                email: typeof data.email === "string" ? data.email : null,
                photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
                role: String(data.role ?? "student"),
            };
        }
    }
    return out;
}
async function buildCourseInsights(opts) {
    const { courseId, rangeDays } = opts;
    const nowMs = opts.nowMs ?? Date.now();
    // 0 = KPI/charts only (learners table fetches its own pages).
    const learnerLimit = Math.min(200, Math.max(0, opts.learnerLimit ?? 100));
    const learnerOffset = Math.max(0, Math.round(Number(opts.learnerCursor ?? 0)) || 0);
    const learnerStatus = opts.learnerStatus ?? "all";
    const courseSnap = await db().doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) {
        throw new Error("COURSE_NOT_FOUND");
    }
    const course = courseSnap.data() ?? {};
    const lessonCount = Number(course.lessonCount ?? 0);
    const [allEnrollments, lessons] = await Promise.all([
        loadCourseEnrollments(courseId, 500),
        loadCourseLessons(courseId),
    ]);
    const resolvedLessonCount = lessonCount || lessons.length;
    // Range filters enrollments for KPIs / charts; learners table uses same scope.
    const scoped = (0, insights_metrics_1.filterByRange)(allEnrollments, rangeDays, nowMs);
    const kpis = (0, insights_metrics_1.computeCourseKpis)(allEnrollments, rangeDays, nowMs, resolvedLessonCount);
    const funnel = (0, insights_metrics_1.buildLessonFunnel)(lessons, scoped);
    const quizStats = (0, insights_metrics_1.buildQuizStats)(lessons, scoped);
    const stuckRaw = (0, insights_metrics_1.stuckOnQuiz)(lessons, scoped).slice(0, 50);
    const learnersScoped = (0, insights_metrics_1.filterByLearnerStatus)(scoped, learnerStatus, nowMs);
    const learnersSlice = learnerLimit > 0
        ? learnersScoped.slice(learnerOffset, learnerOffset + learnerLimit)
        : [];
    const nextLearnerCursor = learnerLimit > 0 && learnerOffset + learnerLimit < learnersScoped.length
        ? String(learnerOffset + learnerLimit)
        : null;
    const profiles = await loadProfiles([
        ...learnersSlice.map((row) => row.uid),
        ...stuckRaw.map((row) => row.uid),
    ]);
    const stuck = stuckRaw.map((row) => ({
        ...row,
        displayName: profiles[row.uid]?.displayName ?? null,
    }));
    const learners = learnersSlice.map((row) => {
        const profile = profiles[row.uid];
        return {
            uid: row.uid,
            displayName: profile?.displayName ?? null,
            email: profile?.email ?? null,
            photoUrl: profile?.photoUrl ?? null,
            role: profile?.role ?? "student",
            progress: (0, insights_metrics_1.progressPercent)(row.completedLessonIds, resolvedLessonCount),
            completedLessonCount: row.completedLessonIds.length,
            lastLessonId: row.lastLessonId,
            enrolledAtMs: row.enrolledAtMs,
            updatedAtMs: row.updatedAtMs,
            completedAtMs: row.completedAtMs,
            stalled: (0, insights_metrics_1.isStalled)(row, 14, nowMs),
        };
    });
    return {
        courseId,
        title: String(course.title ?? "Course"),
        status: String(course.status ?? "draft"),
        lessonCount: resolvedLessonCount,
        rangeDays,
        kpis,
        progressBuckets: (0, insights_metrics_1.buildProgressBuckets)(scoped, resolvedLessonCount),
        lessonFunnel: funnel,
        dropOffs: (0, insights_metrics_1.topDropOffs)(funnel, 5),
        quizStats,
        stuckOnQuiz: stuck,
        learners,
        nextLearnerCursor,
        generatedAt: nowMs,
    };
}
async function buildCatalogInsights(opts) {
    const nowMs = opts.nowMs ?? Date.now();
    const courseIds = [...new Set(opts.courseIds)].slice(0, 100);
    const courses = [];
    const dropOffs = [];
    const weakQuizzes = [];
    const portfolioRows = [];
    let totalEnrollments = 0;
    let completionSum = 0;
    let coursesWithLearners = 0;
    let atRiskLearners = 0;
    let progressSum = 0;
    let progressCount = 0;
    const activeUids = new Set();
    for (const courseId of courseIds) {
        const courseSnap = await db().doc(`courses/${courseId}`).get();
        if (!courseSnap.exists)
            continue;
        const course = courseSnap.data() ?? {};
        const title = String(course.title ?? "Course");
        const status = String(course.status ?? "draft");
        const studentCount = Number(course.studentCount ?? 0);
        const lessonCount = Number(course.lessonCount ?? 0);
        const statsSnap = await db()
            .doc(`courses/${courseId}/stats/summary`)
            .get();
        const stats = statsSnap.data() ?? {};
        const statsEnrolled = Number(stats.enrolled ?? 0);
        const statsCompleted = Number(stats.completed ?? 0);
        const [enrollments, lessons] = await Promise.all([
            loadCourseEnrollments(courseId, 200),
            loadCourseLessons(courseId),
        ]);
        const resolvedLessonCount = lessonCount || lessons.length;
        const kpis = (0, insights_metrics_1.computeCourseKpis)(enrollments, null, nowMs, resolvedLessonCount);
        const enrolled = statsEnrolled || kpis.enrolled || studentCount;
        const completed = statsCompleted || kpis.completed;
        const inProgress = course.activeStudentCount != null
            ? Number(course.activeStudentCount)
            : kpis.inProgress;
        const completionRate = enrolled > 0 ? completed / enrolled : 0;
        const quizStats = (0, insights_metrics_1.buildQuizStats)(lessons, enrollments);
        const funnel = (0, insights_metrics_1.buildLessonFunnel)(lessons, enrollments);
        const quizAvg = quizStats.length > 0
            ? quizStats.reduce((sum, q) => sum + q.passRate, 0) / quizStats.length
            : null;
        for (const row of enrollments) {
            portfolioRows.push({
                enrollment: row,
                courseId,
                title,
                lessonCount: resolvedLessonCount,
            });
            if (row.completedAtMs == null) {
                activeUids.add(row.uid);
                progressSum += (0, insights_metrics_1.progressPercent)(row.completedLessonIds, resolvedLessonCount);
                progressCount += 1;
            }
        }
        courses.push({
            courseId,
            title,
            status,
            enrolled,
            inProgress,
            completed,
            completionRate,
            quizAvgPassRate: quizAvg,
            stalled: kpis.stalled,
            studentCount: studentCount || enrolled,
            activeStudentCount: inProgress,
            avgProgress: kpis.avgProgress,
        });
        totalEnrollments += enrolled;
        if (enrolled > 0) {
            coursesWithLearners += 1;
            completionSum += completionRate;
        }
        atRiskLearners += kpis.stalled;
        for (const row of (0, insights_metrics_1.topDropOffs)(funnel, 2)) {
            if (row.dropFromPrev == null || row.dropFromPrev < 0.15)
                continue;
            dropOffs.push({
                courseId,
                courseTitle: title,
                lessonId: row.lessonId,
                lessonTitle: row.title,
                dropFromPrev: row.dropFromPrev,
            });
        }
        for (const quiz of quizStats) {
            if (quiz.attempts < 2 || quiz.passRate >= 0.6)
                continue;
            weakQuizzes.push({
                courseId,
                courseTitle: title,
                lessonId: quiz.lessonId,
                lessonTitle: quiz.title,
                passRate: quiz.passRate,
                attempts: quiz.attempts,
            });
        }
    }
    dropOffs.sort((a, b) => b.dropFromPrev - a.dropFromPrev);
    weakQuizzes.sort((a, b) => a.passRate - b.passRate);
    const portfolio = (0, insights_metrics_1.buildPortfolioStudents)(portfolioRows, nowMs);
    const profiles = await loadProfiles(portfolio.map((row) => row.uid));
    const students = portfolio.map((row) => {
        const profile = profiles[row.uid];
        return {
            uid: row.uid,
            displayName: profile?.displayName ?? null,
            email: profile?.email ?? null,
            photoUrl: profile?.photoUrl ?? null,
            coursesInProgress: row.coursesInProgress,
            avgProgress: row.avgProgress,
            updatedAtMs: row.updatedAtMs,
            atRisk: row.atRisk,
            courses: row.courses,
        };
    });
    const pathSummaries = (opts.pathSummaries ?? []).slice(0, 5);
    const paths = [];
    for (const path of pathSummaries) {
        const ids = path.courseIds.filter(Boolean).slice(0, 20);
        if (ids.length === 0) {
            paths.push({
                pathId: path.pathId,
                title: path.title,
                courseIds: ids,
                learnersCompletedAll: 0,
                learnersStartedAny: 0,
                completionRate: 0,
            });
            continue;
        }
        const completedByCourse = [];
        const started = new Set();
        for (const courseId of ids) {
            const enrollments = await loadCourseEnrollments(courseId, 150);
            const completed = new Set();
            for (const row of enrollments) {
                started.add(row.uid);
                if (row.completedAtMs != null)
                    completed.add(row.uid);
            }
            completedByCourse.push(completed);
        }
        let completedAll = 0;
        if (completedByCourse.length > 0) {
            const [first, ...rest] = completedByCourse;
            for (const uid of first) {
                if (rest.every((set) => set.has(uid)))
                    completedAll += 1;
            }
        }
        paths.push({
            pathId: path.pathId,
            title: path.title,
            courseIds: ids,
            learnersCompletedAll: completedAll,
            learnersStartedAny: started.size,
            completionRate: started.size > 0 ? completedAll / started.size : 0,
        });
    }
    return {
        kpis: {
            activeStudents: activeUids.size,
            avgCompletionRate: coursesWithLearners > 0 ? completionSum / coursesWithLearners : 0,
            avgProgress: progressCount > 0 ? progressSum / progressCount : 0,
            atRiskLearners,
            totalEnrollments,
            coursesWithLearners,
        },
        courses,
        students,
        attention: {
            dropOffs: dropOffs.slice(0, 8),
            weakQuizzes: weakQuizzes.slice(0, 8),
        },
        paths,
        generatedAt: nowMs,
    };
}
async function assertCanViewCourseInsights(actorUid, courseCreatedBy, actorRole) {
    if (actorRole === "admin")
        return true;
    return courseCreatedBy === actorUid;
}
//# sourceMappingURL=insights.js.map