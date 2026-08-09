import { config } from "./config.mjs";
import { commitInBatches, db, FieldValue, Timestamp, log } from "./admin.mjs";

function dayOffset(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {{ courses: Array<{id:string, lessonMeta:Array<{id:string,type:string}>, published?:boolean}> }} academy
 */
export async function seedAnalytics(academy) {
  const published = academy.courses.filter((c) => c.published !== false);
  log("analytics", `${published.length} courses × ${config.analyticsDays} days`);
  const firestore = db();
  const ops = [];

  for (const [ci, course] of published.entries()) {
    const enrolled = 40 + (ci % 200);
    const completed = Math.floor(enrolled * (0.2 + (ci % 5) * 0.08));
    const views = enrolled * 20 + ci * 3;
    ops.push({
      type: "set",
      ref: firestore.doc(`courses/${course.id}/analytics/summary`),
      data: {
        schemaVersion: 1,
        enrolled,
        completed,
        completionRate: completed / Math.max(1, enrolled),
        avgProgress: 0.35 + (ci % 50) / 100,
        views,
        uniqueViewersApprox: Math.floor(views * 0.4),
        watchSeconds: views * 70,
        avgViewDurationSeconds: 75,
        impressions: views * 3,
        opens: Math.floor(views * 0.7),
        quizAttempts: 20 + (ci % 80),
        quizPasses: 12 + (ci % 50),
        coverageRate: 0.55 + (ci % 40) / 100,
        window28d: {
          views: Math.floor(views * 0.5),
          watchSeconds: Math.floor(views * 35),
          enrolled: Math.floor(enrolled * 0.3),
          completed: Math.floor(completed * 0.3),
          impressions: Math.floor(views * 1.5),
          opens: Math.floor(views * 0.35),
        },
        window7d: {
          views: Math.floor(views * 0.15),
          watchSeconds: Math.floor(views * 10),
          enrolled: Math.floor(enrolled * 0.1),
          completed: Math.floor(completed * 0.1),
          impressions: Math.floor(views * 0.4),
          opens: Math.floor(views * 0.1),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      options: { merge: true },
    });

    ops.push({
      type: "set",
      ref: firestore.doc(`courses/${course.id}/analytics/realtime`),
      data: {
        schemaVersion: 1,
        activeSessions: 1 + (ci % 8),
        viewsLast60m: 5 + (ci % 40),
        watchSecondsLast60m: 200 + (ci % 900),
        topLessonIds: course.lessonMeta.slice(0, 3).map((l) => l.id),
        updatedAt: FieldValue.serverTimestamp(),
      },
      options: { merge: true },
    });

    ops.push({
      type: "set",
      ref: firestore.doc(`courses/${course.id}/analytics/audience`),
      data: {
        schemaVersion: 1,
        uniqueViewersApprox: Math.floor(views * 0.4),
        returningViewersApprox: Math.floor(views * 0.12),
        byCountry: { US: 180, MX: 55, CO: 40, ES: 22 },
        byDevice: { web: 160, mobile: 120, tablet: 18 },
        byLocale: { en: 200, es: 95 },
        byHourUtc: Array.from({ length: 24 }, (_, h) =>
          h >= 13 && h <= 22 ? 20 + (h % 5) * 3 : 4 + (h % 3),
        ),
        suppressed: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      options: { merge: true },
    });

    ops.push({
      type: "set",
      ref: firestore.doc(`courses/${course.id}/analytics/traffic`),
      data: {
        schemaVersion: 1,
        bySource: {
          catalog: 520,
          search: 210,
          path: 140,
          notification: 80,
          direct: 60,
          share: 30,
        },
        impressions: views * 3,
        opens: Math.floor(views * 0.7),
        ctr: 0.23,
        updatedAt: FieldValue.serverTimestamp(),
      },
      options: { merge: true },
    });

    for (let i = config.analyticsDays - 1; i >= 0; i -= 1) {
      const day = dayOffset(i);
      const dayViews = 8 + ((config.analyticsDays - i) % 17) * 2 + (i % 5);
      ops.push({
        type: "set",
        ref: firestore.doc(`courses/${course.id}/analyticsDays/${day}`),
        data: {
          schemaVersion: 1,
          day,
          views: dayViews,
          watchSeconds: dayViews * 70,
          enrolled: i % 11 === 0 ? 1 : 0,
          completed: i % 19 === 0 ? 1 : 0,
          impressions: dayViews * 3,
          opens: Math.round(dayViews * 0.7),
          uniqueViewersApprox: Math.round(dayViews * 0.55),
        },
        options: { merge: true },
      });
    }

    for (const [index, lesson] of course.lessonMeta.entries()) {
      const started = 40 - index * 3 + (ci % 10);
      const completedLessons = Math.max(5, started - 8 - (index % 4));
      const buckets = {};
      for (let pct = 0; pct <= 100; pct += 5) {
        buckets[String(pct)] = Math.max(
          0,
          Math.round(started * (1 - pct / 120) - index),
        );
      }
      ops.push({
        type: "set",
        ref: firestore.doc(`courses/${course.id}/lessonAnalytics/${lesson.id}`),
        data: {
          schemaVersion: 1,
          lessonId: lesson.id,
          started,
          completed: completedLessons,
          watchSeconds: started * 90,
          avgPositionSeconds: 45,
          retentionBucketCounts: buckets,
          quizAttempts: lesson.type === "quiz" ? 28 : 0,
          quizPasses: lesson.type === "quiz" ? 19 : 0,
          updatedAt: FieldValue.serverTimestamp(),
        },
        options: { merge: true },
      });
    }

    for (let s = 0; s < 3; s++) {
      ops.push({
        type: "set",
        ref: firestore.doc(`courses/${course.id}/analyticsSessions/seed_${s}`),
        data: {
          lastSeenAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
          lessonId: course.lessonMeta[s % Math.max(1, course.lessonMeta.length)]?.id ?? null,
          platform: s % 2 === 0 ? "web" : "ios",
        },
      });
    }
  }

  await commitInBatches(ops);
  log("analytics", `${ops.length} docs`);
}
