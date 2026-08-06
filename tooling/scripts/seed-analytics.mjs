#!/usr/bin/env node
/**
 * Seed synthetic creator-analytics rollups for emulator Studio dashboards.
 *
 * Usage (after academy seed):
 *   node tooling/scripts/seed-analytics.mjs
 *   node tooling/scripts/seed-analytics.mjs --course <courseId>
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const PROJECT = process.env.GCLOUD_PROJECT ?? "every-insurance";

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST;
initializeApp({ projectId: PROJECT });
const db = getFirestore();

function dayOffset(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function parseCourseArg(argv) {
  const idx = argv.findIndex((a) => a === "--course");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].trim();
  return "";
}

async function seedCourse(courseId, lessons) {
  const summaryRef = db.doc(`courses/${courseId}/analytics/summary`);
  await summaryRef.set(
    {
      schemaVersion: 1,
      enrolled: 42,
      completed: 18,
      completionRate: 18 / 42,
      avgProgress: 0.56,
      views: 1280,
      uniqueViewersApprox: 310,
      watchSeconds: 96_400,
      avgViewDurationSeconds: 75,
      impressions: 4200,
      opens: 980,
      quizAttempts: 120,
      quizPasses: 86,
      coverageRate: 0.72,
      window28d: {
        views: 640,
        watchSeconds: 48_000,
        enrolled: 12,
        completed: 5,
        impressions: 1800,
        opens: 420,
      },
      window7d: {
        views: 180,
        watchSeconds: 12_500,
        enrolled: 4,
        completed: 1,
        impressions: 520,
        opens: 110,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.doc(`courses/${courseId}/analytics/realtime`).set(
    {
      schemaVersion: 1,
      activeSessions: 3,
      viewsLast60m: 14,
      watchSecondsLast60m: 820,
      topLessonIds: lessons.slice(0, 3).map((l) => l.id),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.doc(`courses/${courseId}/analytics/audience`).set(
    {
      schemaVersion: 1,
      uniqueViewersApprox: 310,
      returningViewersApprox: 94,
      byCountry: { US: 180, MX: 55, CO: 40, ES: 22 },
      byDevice: { web: 160, mobile: 120, tablet: 18 },
      byLocale: { en: 200, es: 95 },
      byHourUtc: Array.from({ length: 24 }, (_, h) =>
        h >= 13 && h <= 22 ? 20 + (h % 5) * 3 : 4 + (h % 3),
      ),
      suppressed: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.doc(`courses/${courseId}/analytics/traffic`).set(
    {
      schemaVersion: 1,
      bySource: {
        catalog: 520,
        search: 210,
        path: 140,
        notification: 80,
        direct: 60,
        share: 30,
      },
      impressions: 4200,
      opens: 980,
      ctr: 980 / 4200,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  for (let i = 89; i >= 0; i -= 1) {
    const day = dayOffset(i);
    const views = 8 + ((89 - i) % 17) * 2 + Math.floor(i % 5);
    await db.doc(`courses/${courseId}/analyticsDays/${day}`).set(
      {
        schemaVersion: 1,
        day,
        views,
        watchSeconds: views * 70,
        enrolled: i % 11 === 0 ? 1 : 0,
        completed: i % 19 === 0 ? 1 : 0,
        impressions: views * 3,
        opens: Math.round(views * 0.7),
        uniqueViewersApprox: Math.round(views * 0.55),
      },
      { merge: true },
    );
  }

  for (const [index, lesson] of lessons.entries()) {
    const started = 40 - index * 3;
    const completed = Math.max(5, started - 8 - (index % 4));
    const buckets = {};
    for (let pct = 0; pct <= 100; pct += 5) {
      buckets[String(pct)] = Math.max(
        0,
        Math.round(started * (1 - pct / 120) - index),
      );
    }
    await db.doc(`courses/${courseId}/lessonAnalytics/${lesson.id}`).set(
      {
        schemaVersion: 1,
        lessonId: lesson.id,
        started,
        completed,
        watchSeconds: started * 90,
        avgPositionSeconds: 45,
        retentionBucketCounts: buckets,
        quizAttempts: lesson.type === "quiz" ? 28 : 0,
        quizPasses: lesson.type === "quiz" ? 19 : 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // Presence docs for realtime refresh testing.
  for (let i = 0; i < 3; i += 1) {
    await db.doc(`courses/${courseId}/analyticsSessions/seed_${i}`).set({
      lastSeenAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
      lessonId: lessons[i % Math.max(1, lessons.length)]?.id ?? null,
      platform: i % 2 === 0 ? "web" : "ios",
    });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const only = parseCourseArg(argv);
  console.log(`Seeding analytics @ ${FIRESTORE_HOST} (project ${PROJECT})…`);

  let courseIds = [];
  if (only) {
    courseIds = [only];
  } else {
    const snap = await db.collection("courses").limit(25).get();
    courseIds = snap.docs.map((d) => d.id);
  }

  if (courseIds.length === 0) {
    throw new Error("No courses found. Run seed-academy first.");
  }

  for (const courseId of courseIds) {
    const lessonsSnap = await db
      .collection(`courses/${courseId}/lessons`)
      .limit(20)
      .get();
    const lessons = lessonsSnap.docs.map((d) => ({
      id: d.id,
      type: String(d.data()?.type ?? "video"),
    }));
    await seedCourse(courseId, lessons);
    console.log(`  ✓ ${courseId} (${lessons.length} lessons)`);
  }

  console.log(`\nAnalytics seed complete for ${courseIds.length} course(s).`);
}

main().catch((error) => {
  console.error(`\nAnalytics seed failed: ${error.message}`);
  process.exit(1);
});
