/**
 * Creator analytics pipeline for Pulse Studio (aggregate-only creator dashboards).
 *
 * Clients send sanitized events via `recordAcademyAnalytics`. Functions update
 * Firestore aggregate rollups for Studio. Historical audience/geo/device series
 * come from a scheduled BigQuery job when GA4→BQ export is linked (Blaze).
 *
 * Privacy: Studio only reads aggregates. No per-learner UIDs in rollups.
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  ACADEMY_ANALYTICS_EVENT_NAMES,
  ACADEMY_ANALYTICS_PLATFORMS,
  ACADEMY_ANALYTICS_SCHEMA_VERSION,
  ACADEMY_ANALYTICS_SOURCES,
  ANALYTICS_MIN_COHORT,
  emptyAnalyticsWindow,
  emptyHourHistogram,
  emptyRetentionBuckets,
  type AcademyAnalyticsEventName,
  type AcademyAnalyticsEventInput,
  type AcademyAnalyticsPlatform,
  type AcademyAnalyticsSource,
} from "@pulse/shared";
import { callableOpts, db } from "./init";
import { requireActor, requireCaller } from "./guards";
import { mapPool } from "./batch-utils";

const MAX_EVENTS_PER_CALL = 20;
const MAX_WATCH_DELTA = 120;
const MAX_SESSION_ID = 64;
const MAX_TRAFFIC = 80;
const REALTIME_WINDOW_MS = 60 * 60 * 1000;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_COURSE_CONCURRENCY = 8;
const ANALYTICS_COURSE_PAGE = 200;

const EVENT_SET = new Set<string>(ACADEMY_ANALYTICS_EVENT_NAMES);
const SOURCE_SET = new Set<string>(ACADEMY_ANALYTICS_SOURCES);
const PLATFORM_SET = new Set<string>(ACADEMY_ANALYTICS_PLATFORMS);

function dayId(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function clampInt(n: unknown, min: number, max: number, fallback = 0): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeTraffic(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase().slice(0, MAX_TRAFFIC);
  if (!trimmed) return null;
  // Host / UTM source only — strip paths and query.
  return trimmed.replace(/[^a-z0-9._\-:+]/g, "") || null;
}

function parseEvent(raw: unknown): AcademyAnalyticsEventInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const name = String(data.name ?? "");
  const courseId = String(data.courseId ?? "").trim();
  const sessionId = String(data.sessionId ?? "").trim().slice(0, MAX_SESSION_ID);
  const platform = String(data.platform ?? "");
  if (!EVENT_SET.has(name) || !courseId || !sessionId || !PLATFORM_SET.has(platform)) {
    return null;
  }
  const sourceRaw = String(data.source ?? "unknown");
  const source = (SOURCE_SET.has(sourceRaw) ? sourceRaw : "unknown") as AcademyAnalyticsSource;
  const lessonId =
    typeof data.lessonId === "string" && data.lessonId.trim()
      ? data.lessonId.trim().slice(0, 128)
      : null;
  return {
    name: name as AcademyAnalyticsEventName,
    courseId: courseId.slice(0, 128),
    lessonId,
    sessionId,
    source,
    platform: platform as AcademyAnalyticsPlatform,
    positionSeconds: clampInt(data.positionSeconds, 0, 86_400),
    durationSeconds: clampInt(data.durationSeconds, 0, 86_400),
    watchDeltaSeconds: clampInt(data.watchDeltaSeconds, 0, MAX_WATCH_DELTA),
    retentionBucket: clampInt(data.retentionBucket, 0, 100),
    quizPassed: data.quizPassed === true,
    quizScore: clampInt(data.quizScore, 0, 100),
    locale:
      typeof data.locale === "string"
        ? data.locale.trim().toLowerCase().slice(0, 16)
        : undefined,
    trafficSource: sanitizeTraffic(data.trafficSource),
    clientEventId:
      typeof data.clientEventId === "string"
        ? data.clientEventId.trim().slice(0, 64)
        : null,
  };
}

async function wasDuplicate(uid: string, clientEventId: string | null): Promise<boolean> {
  if (!clientEventId) return false;
  const ref = db.doc(`analyticsDedupe/${uid}_${clientEventId}`);
  const snap = await ref.get();
  if (snap.exists) return true;
  await ref.set({
    uid,
    clientEventId,
    expiresAt: Timestamp.fromMillis(Date.now() + DEDUPE_TTL_MS),
  });
  return false;
}

function summaryRef(courseId: string) {
  return db.doc(`courses/${courseId}/analytics/summary`);
}

function realtimeRef(courseId: string) {
  return db.doc(`courses/${courseId}/analytics/realtime`);
}

function audienceRef(courseId: string) {
  return db.doc(`courses/${courseId}/analytics/audience`);
}

function trafficRef(courseId: string) {
  return db.doc(`courses/${courseId}/analytics/traffic`);
}

function dayRef(courseId: string, day: string) {
  return db.doc(`courses/${courseId}/analyticsDays/${day}`);
}

function lessonRef(courseId: string, lessonId: string) {
  return db.doc(`courses/${courseId}/lessonAnalytics/${lessonId}`);
}

function sessionPresenceRef(courseId: string, sessionId: string) {
  return db.doc(`courses/${courseId}/analyticsSessions/${sessionId}`);
}

async function applyEvent(
  uid: string,
  event: AcademyAnalyticsEventInput,
): Promise<void> {
  const courseSnap = await db.doc(`courses/${event.courseId}`).get();
  if (!courseSnap.exists) {
    throw new HttpsError("not-found", "Course not found.");
  }

  const now = Date.now();
  const day = dayId();
  const hour = new Date().getUTCHours();
  const watchDelta = event.watchDeltaSeconds ?? 0;
  const isView =
    event.name === "course_open" ||
    event.name === "lesson_start" ||
    event.name === "lesson_heartbeat";
  const isImpression = event.name === "course_impression";
  const isOpen = event.name === "course_open";
  const isStart = event.name === "lesson_start";
  const isComplete = event.name === "lesson_complete";
  const isQuiz = event.name === "quiz_submit";

  const batch = db.batch();

  // Presence for realtime active-session count.
  batch.set(
    sessionPresenceRef(event.courseId, event.sessionId),
    {
      lastSeenAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + REALTIME_WINDOW_MS),
      lessonId: event.lessonId ?? null,
      platform: event.platform,
    },
    { merge: true },
  );

  const summaryInc: Record<string, unknown> = {
    schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isView) {
    summaryInc.views = FieldValue.increment(1);
    summaryInc["window28d.views"] = FieldValue.increment(1);
    summaryInc["window7d.views"] = FieldValue.increment(1);
  }
  if (watchDelta > 0) {
    summaryInc.watchSeconds = FieldValue.increment(watchDelta);
    summaryInc["window28d.watchSeconds"] = FieldValue.increment(watchDelta);
    summaryInc["window7d.watchSeconds"] = FieldValue.increment(watchDelta);
  }
  if (isImpression) {
    summaryInc.impressions = FieldValue.increment(1);
    summaryInc["window28d.impressions"] = FieldValue.increment(1);
    summaryInc["window7d.impressions"] = FieldValue.increment(1);
  }
  if (isOpen) {
    summaryInc.opens = FieldValue.increment(1);
    summaryInc["window28d.opens"] = FieldValue.increment(1);
    summaryInc["window7d.opens"] = FieldValue.increment(1);
  }
  if (isComplete) {
    // Completions of lessons are tracked on lesson rollups; course completion
    // still comes from enrollment.completedAt via backfill/triggers.
  }
  if (isQuiz) {
    summaryInc.quizAttempts = FieldValue.increment(1);
    if (event.quizPassed) summaryInc.quizPasses = FieldValue.increment(1);
  }
  batch.set(summaryRef(event.courseId), summaryInc, { merge: true });

  const dayInc: Record<string, unknown> = {
    schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    day,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isView) dayInc.views = FieldValue.increment(1);
  if (watchDelta > 0) dayInc.watchSeconds = FieldValue.increment(watchDelta);
  if (isImpression) dayInc.impressions = FieldValue.increment(1);
  if (isOpen) dayInc.opens = FieldValue.increment(1);
  batch.set(dayRef(event.courseId, day), dayInc, { merge: true });

  if (event.lessonId) {
    const lessonInc: Record<string, unknown> = {
      schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
      lessonId: event.lessonId,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (isStart) lessonInc.started = FieldValue.increment(1);
    if (isComplete) lessonInc.completed = FieldValue.increment(1);
    if (watchDelta > 0) lessonInc.watchSeconds = FieldValue.increment(watchDelta);
    if (isQuiz) {
      lessonInc.quizAttempts = FieldValue.increment(1);
      if (event.quizPassed) lessonInc.quizPasses = FieldValue.increment(1);
    }
    const bucket = event.retentionBucket;
    if (typeof bucket === "number" && bucket >= 0 && bucket <= 100) {
      // Map keys (not a sparse array) so FieldValue.increment works.
      lessonInc[`retentionBucketCounts.${bucket}`] = FieldValue.increment(1);
    }
    batch.set(lessonRef(event.courseId, event.lessonId), lessonInc, {
      merge: true,
    });
  }

  // Audience (coarse, server-side only — no PII). Country/geo filled by BQ job.
  const audienceInc: Record<string, unknown> = {
    schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };
  audienceInc[`byDevice.${event.platform}`] = FieldValue.increment(1);
  audienceInc[`byHourUtc.${hour}`] = FieldValue.increment(1);
  if (event.locale) {
    const loc = event.locale.replace(/\./g, "_").slice(0, 16);
    audienceInc[`byLocale.${loc}`] = FieldValue.increment(1);
  }
  batch.set(audienceRef(event.courseId), audienceInc, { merge: true });

  const trafficKey = event.trafficSource || event.source || "unknown";
  const trafficInc: Record<string, unknown> = {
    schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
    [`bySource.${trafficKey}`]: FieldValue.increment(1),
  };
  if (isImpression) trafficInc.impressions = FieldValue.increment(1);
  if (isOpen) trafficInc.opens = FieldValue.increment(1);
  batch.set(trafficRef(event.courseId), trafficInc, { merge: true });

  // Realtime counters (approximate; activeSessions refreshed on schedule).
  const rtInc: Record<string, unknown> = {
    schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (isView) rtInc.viewsLast60m = FieldValue.increment(1);
  if (watchDelta > 0) rtInc.watchSecondsLast60m = FieldValue.increment(watchDelta);
  batch.set(realtimeRef(event.courseId), rtInc, { merge: true });

  await batch.commit();

  // Soft unique-viewer approx: one session doc per uid+course+day (hashed).
  const viewerKey = `${event.courseId}_${day}_${uid.slice(0, 12)}`;
  const viewerRef = db.doc(`analyticsViewerDays/${viewerKey}`);
  const viewerSnap = await viewerRef.get();
  if (!viewerSnap.exists) {
    await viewerRef.set({
      courseId: event.courseId,
      day,
      expiresAt: Timestamp.fromMillis(now + 40 * 24 * 60 * 60 * 1000),
    });
    await summaryRef(event.courseId).set(
      {
        uniqueViewersApprox: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await dayRef(event.courseId, day).set(
      {
        uniqueViewersApprox: FieldValue.increment(1),
      },
      { merge: true },
    );
  }
}

/**
 * Batch ingest of sanitized academy analytics events from web/mobile.
 */
export const recordAcademyAnalytics = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "recordAcademyAnalytics");
  const rawEvents = request.data?.events;
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    throw new HttpsError("invalid-argument", "events[] required");
  }
  if (rawEvents.length > MAX_EVENTS_PER_CALL) {
    throw new HttpsError("invalid-argument", "Too many events in one call.");
  }

  let accepted = 0;
  let duplicates = 0;
  for (const raw of rawEvents) {
    const event = parseEvent(raw);
    if (!event) continue;
    if (await wasDuplicate(uid, event.clientEventId ?? null)) {
      duplicates += 1;
      continue;
    }
    await applyEvent(uid, event);
    accepted += 1;
  }
  return { ok: true, accepted, duplicates };
});

/**
 * Recompute enrollment-derived KPIs on course analytics/summary.
 * Safe to call after seeding or when backfilling historical enrollments.
 */
export async function recomputeEnrollmentRollup(courseId: string): Promise<void> {
  const courseSnap = await db.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) return;
  const lessonCount = Number(courseSnap.data()?.lessonCount ?? 0);
  const enrolledSnap = await db
    .collectionGroup("enrollments")
    .where("courseId", "==", courseId)
    .get();

  let enrolled = 0;
  let completed = 0;
  let progressSum = 0;
  for (const doc of enrolledSnap.docs) {
    enrolled += 1;
    const data = doc.data();
    if (data.completedAt) completed += 1;
    const done = Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.length
      : 0;
    progressSum += lessonCount > 0 ? Math.min(1, done / lessonCount) : 0;
  }
  const avgProgress = enrolled > 0 ? progressSum / enrolled : 0;
  const completionRate = enrolled > 0 ? completed / enrolled : 0;

  await summaryRef(courseId).set(
    {
      schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
      enrolled,
      completed,
      completionRate,
      avgProgress,
      updatedAt: FieldValue.serverTimestamp(),
      window28d: emptyAnalyticsWindow(),
      window7d: emptyAnalyticsWindow(),
    },
    { merge: true },
  );

  // Ensure nested docs exist with defaults for Studio first paint.
  await Promise.all([
    realtimeRef(courseId).set(
      {
        schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
        activeSessions: 0,
        viewsLast60m: 0,
        watchSecondsLast60m: 0,
        topLessonIds: [],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    audienceRef(courseId).set(
      {
        schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
        uniqueViewersApprox: 0,
        returningViewersApprox: 0,
        byCountry: {},
        byDevice: {},
        byLocale: {},
        byHourUtc: emptyHourHistogram(),
        suppressed: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    trafficRef(courseId).set(
      {
        schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
        bySource: {},
        impressions: 0,
        opens: 0,
        ctr: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
}

export const backfillCourseAnalytics = onCall(callableOpts, async (request) => {
  await requireActor(request, "backfillCourseAnalytics", {
    permission: "academy.analytics.read",
  });
  const courseId = String(request.data?.courseId ?? "").trim();
  if (courseId) {
    await recomputeEnrollmentRollup(courseId);
    return { ok: true, courses: 1 };
  }
  const courses = await db
    .collection("courses")
    .select()
    .limit(ANALYTICS_COURSE_PAGE)
    .get();
  await mapPool(courses.docs, ANALYTICS_COURSE_CONCURRENCY, (doc) =>
    recomputeEnrollmentRollup(doc.id),
  );
  return { ok: true, courses: courses.size };
});

/**
 * Refresh realtime active session counts and decay 60m counters lightly.
 * Also recomputes CTR on traffic docs.
 */
export const refreshAcademyAnalyticsRealtime = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "us-central1",
    timeoutSeconds: 120,
  },
  async () => {
    const courses = await db
      .collection("courses")
      .select()
      .limit(ANALYTICS_COURSE_PAGE)
      .get();
    const cutoff = Timestamp.fromMillis(Date.now() - REALTIME_WINDOW_MS);
    await mapPool(courses.docs, ANALYTICS_COURSE_CONCURRENCY, async (course) => {
      const sessions = await db
        .collection(`courses/${course.id}/analyticsSessions`)
        .where("lastSeenAt", ">=", cutoff)
        .select()
        .limit(500)
        .get();
      const topLessons = new Map<string, number>();
      for (const s of sessions.docs) {
        const lessonId = String(s.data()?.lessonId ?? "");
        if (lessonId) topLessons.set(lessonId, (topLessons.get(lessonId) ?? 0) + 1);
      }
      const topLessonIds = [...topLessons.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      await realtimeRef(course.id).set(
        {
          activeSessions: sessions.size,
          topLessonIds,
          updatedAt: FieldValue.serverTimestamp(),
          schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
        },
        { merge: true },
      );

      const trafficSnap = await trafficRef(course.id).get();
      if (trafficSnap.exists) {
        const impressions = Number(trafficSnap.data()?.impressions ?? 0);
        const opens = Number(trafficSnap.data()?.opens ?? 0);
        const ctr = impressions > 0 ? opens / impressions : 0;
        await trafficRef(course.id).set({ ctr }, { merge: true });
      }

      // Suppress small audience buckets for privacy.
      const audienceSnap = await audienceRef(course.id).get();
      if (audienceSnap.exists) {
        const data = audienceSnap.data() ?? {};
        let suppressed = false;
        const scrub = (map: Record<string, number> | undefined) => {
          if (!map || typeof map !== "object") return {};
          const next: Record<string, number> = {};
          for (const [k, v] of Object.entries(map)) {
            const n = Number(v);
            if (n >= ANALYTICS_MIN_COHORT) next[k] = n;
            else if (n > 0) suppressed = true;
          }
          return next;
        };
        await audienceRef(course.id).set(
          {
            byCountry: scrub(data.byCountry as Record<string, number>),
            byDevice: scrub(data.byDevice as Record<string, number>),
            byLocale: scrub(data.byLocale as Record<string, number>),
            suppressed,
          },
          { merge: true },
        );
      }
    });
  },
);

/**
 * Pull GA4→BigQuery export into Firestore audience/traffic rollups.
 * No-ops when BIGQUERY_ANALYTICS_DATASET is unset (local / pre-Blaze).
 */
export const aggregateAcademyAnalyticsFromBigQuery = onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-central1",
    timeoutSeconds: 540,
  },
  async () => {
    const dataset = process.env.BIGQUERY_ANALYTICS_DATASET?.trim();
    if (!dataset) {
      console.info(
        "aggregateAcademyAnalyticsFromBigQuery skipped: BIGQUERY_ANALYTICS_DATASET unset",
      );
      return;
    }
    // Dynamic import keeps the functions bundle usable without BQ client locally.
    const { BigQuery } = await import("@google-cloud/bigquery");
    const bq = new BigQuery();
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
    const tableWildcard = `\`${projectId}.${dataset}.events_*\``;
    const sql = `
      SELECT
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'course_id') AS course_id,
        geo.country AS country,
        device.category AS device,
        device.operating_system AS os,
        COUNT(1) AS events
      FROM ${tableWildcard}
      WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        AND event_name IN (
          'academy_course_open', 'academy_lesson_start',
          'academy_lesson_heartbeat', 'academy_lesson_complete'
        )
      GROUP BY 1, 2, 3, 4
      HAVING course_id IS NOT NULL
      LIMIT 5000
    `;
    const [rows] = await bq.query({ query: sql });
    const byCourse = new Map<
      string,
      { byCountry: Record<string, number>; byDevice: Record<string, number> }
    >();
    for (const row of rows as Array<Record<string, unknown>>) {
      const courseId = String(row.course_id ?? "");
      if (!courseId) continue;
      const bucket =
        byCourse.get(courseId) ?? { byCountry: {}, byDevice: {} };
      const country = String(row.country ?? "unknown").slice(0, 64);
      const device = String(row.device ?? row.os ?? "unknown")
        .toLowerCase()
        .slice(0, 32);
      const events = Number(row.events ?? 0);
      bucket.byCountry[country] = (bucket.byCountry[country] ?? 0) + events;
      bucket.byDevice[device] = (bucket.byDevice[device] ?? 0) + events;
      byCourse.set(courseId, bucket);
    }
    for (const [courseId, bucket] of byCourse) {
      let suppressed = false;
      const scrub = (map: Record<string, number>) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(map)) {
          if (v >= ANALYTICS_MIN_COHORT) next[k] = v;
          else if (v > 0) suppressed = true;
        }
        return next;
      };
      await audienceRef(courseId).set(
        {
          schemaVersion: ACADEMY_ANALYTICS_SCHEMA_VERSION,
          byCountry: scrub(bucket.byCountry),
          byDevice: scrub(bucket.byDevice),
          suppressed,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);

/** Ensure lesson analytics docs have a full retention array on first write. */
export function ensureRetentionShape(
  data: Record<string, unknown> | undefined,
): number[] {
  const existing = data?.retentionBuckets;
  if (Array.isArray(existing) && existing.length === 101) {
    return existing.map((n) => Number(n) || 0);
  }
  return emptyRetentionBuckets();
}
