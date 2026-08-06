/**
 * Studio reads of creator-analytics rollups (aggregate only).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import {
  ACADEMY_ANALYTICS_SCHEMA_VERSION,
  emptyAnalyticsWindow,
  emptyHourHistogram,
  emptyRetentionBuckets,
  type CourseAnalyticsAudience,
  type CourseAnalyticsDay,
  type CourseAnalyticsRealtime,
  type CourseAnalyticsSummary,
  type CourseAnalyticsTraffic,
  type LessonAnalyticsRollup,
} from "@pulse/shared";
import { getFirebaseDb } from "./client";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function recordNums(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

function windowFrom(value: unknown) {
  if (!value || typeof value !== "object") return emptyAnalyticsWindow();
  const data = value as Record<string, unknown>;
  return {
    views: num(data.views),
    watchSeconds: num(data.watchSeconds),
    enrolled: num(data.enrolled),
    completed: num(data.completed),
    impressions: num(data.impressions),
    opens: num(data.opens),
  };
}

function retentionFrom(data: Record<string, unknown>): number[] {
  const buckets = emptyRetentionBuckets();
  const counts = data.retentionBucketCounts;
  if (counts && typeof counts === "object") {
    for (const [k, v] of Object.entries(counts as Record<string, unknown>)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && idx <= 100) {
        buckets[idx] = num(v);
      }
    }
    return buckets;
  }
  if (Array.isArray(data.retentionBuckets) && data.retentionBuckets.length === 101) {
    return data.retentionBuckets.map((v) => num(v));
  }
  return buckets;
}

export function parseSummary(
  data: Record<string, unknown> | undefined,
): CourseAnalyticsSummary {
  return {
    schemaVersion: num(data?.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    enrolled: num(data?.enrolled),
    completed: num(data?.completed),
    completionRate: num(data?.completionRate),
    avgProgress: num(data?.avgProgress),
    views: num(data?.views),
    uniqueViewersApprox: num(data?.uniqueViewersApprox),
    watchSeconds: num(data?.watchSeconds),
    avgViewDurationSeconds: num(data?.avgViewDurationSeconds),
    impressions: num(data?.impressions),
    opens: num(data?.opens),
    quizAttempts: num(data?.quizAttempts),
    quizPasses: num(data?.quizPasses),
    window28d: windowFrom(data?.window28d),
    window7d: windowFrom(data?.window7d),
    updatedAt: toDate(data?.updatedAt),
    coverageRate: num(data?.coverageRate, 1),
  };
}

export function parseRealtime(
  data: Record<string, unknown> | undefined,
): CourseAnalyticsRealtime {
  return {
    schemaVersion: num(data?.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    activeSessions: num(data?.activeSessions),
    viewsLast60m: num(data?.viewsLast60m),
    watchSecondsLast60m: num(data?.watchSecondsLast60m),
    topLessonIds: Array.isArray(data?.topLessonIds)
      ? data!.topLessonIds.map(String)
      : [],
    updatedAt: toDate(data?.updatedAt),
  };
}

export function parseAudience(
  data: Record<string, unknown> | undefined,
): CourseAnalyticsAudience {
  const hours = Array.isArray(data?.byHourUtc)
    ? data!.byHourUtc.map((v) => num(v))
    : emptyHourHistogram();
  while (hours.length < 24) hours.push(0);
  return {
    schemaVersion: num(data?.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    uniqueViewersApprox: num(data?.uniqueViewersApprox),
    returningViewersApprox: num(data?.returningViewersApprox),
    byCountry: recordNums(data?.byCountry),
    byDevice: recordNums(data?.byDevice),
    byLocale: recordNums(data?.byLocale),
    byHourUtc: hours.slice(0, 24),
    suppressed: data?.suppressed === true,
    updatedAt: toDate(data?.updatedAt),
  };
}

export function parseTraffic(
  data: Record<string, unknown> | undefined,
): CourseAnalyticsTraffic {
  return {
    schemaVersion: num(data?.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    bySource: recordNums(data?.bySource),
    impressions: num(data?.impressions),
    opens: num(data?.opens),
    ctr: num(data?.ctr),
    updatedAt: toDate(data?.updatedAt),
  };
}

export function parseLessonRollup(
  id: string,
  data: Record<string, unknown>,
): LessonAnalyticsRollup {
  return {
    schemaVersion: num(data.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    lessonId: String(data.lessonId ?? id),
    started: num(data.started),
    completed: num(data.completed),
    watchSeconds: num(data.watchSeconds),
    avgPositionSeconds: num(data.avgPositionSeconds),
    retentionBuckets: retentionFrom(data),
    quizAttempts: num(data.quizAttempts),
    quizPasses: num(data.quizPasses),
    updatedAt: toDate(data.updatedAt),
  };
}

export function parseDay(
  id: string,
  data: Record<string, unknown>,
): CourseAnalyticsDay {
  return {
    schemaVersion: num(data.schemaVersion, ACADEMY_ANALYTICS_SCHEMA_VERSION),
    day: String(data.day ?? id),
    views: num(data.views),
    watchSeconds: num(data.watchSeconds),
    enrolled: num(data.enrolled),
    completed: num(data.completed),
    impressions: num(data.impressions),
    opens: num(data.opens),
    uniqueViewersApprox: num(data.uniqueViewersApprox),
  };
}

export type CourseAnalyticsBundle = {
  summary: CourseAnalyticsSummary;
  realtime: CourseAnalyticsRealtime;
  audience: CourseAnalyticsAudience;
  traffic: CourseAnalyticsTraffic;
  days: CourseAnalyticsDay[];
  lessons: LessonAnalyticsRollup[];
};

const emptyBundle = (): CourseAnalyticsBundle => ({
  summary: parseSummary(undefined),
  realtime: parseRealtime(undefined),
  audience: parseAudience(undefined),
  traffic: parseTraffic(undefined),
  days: [],
  lessons: [],
});

export type FetchCourseAnalyticsOptions = {
  /** Inclusive day window (default 90). */
  dayLimit?: number;
  includeAudience?: boolean;
  includeTraffic?: boolean;
  includeLessons?: boolean;
};

export async function fetchCourseAnalytics(
  courseId: string,
  options: FetchCourseAnalyticsOptions = {},
): Promise<CourseAnalyticsBundle> {
  const {
    dayLimit = 90,
    includeAudience = true,
    includeTraffic = true,
    includeLessons = true,
  } = options;
  const db = getFirebaseDb();
  const [summary, realtime, audience, traffic, daysSnap, lessonsSnap] =
    await Promise.all([
      getDoc(doc(db, "courses", courseId, "analytics", "summary")),
      getDoc(doc(db, "courses", courseId, "analytics", "realtime")),
      includeAudience
        ? getDoc(doc(db, "courses", courseId, "analytics", "audience"))
        : Promise.resolve(null),
      includeTraffic
        ? getDoc(doc(db, "courses", courseId, "analytics", "traffic"))
        : Promise.resolve(null),
      getDocs(
        query(
          collection(db, "courses", courseId, "analyticsDays"),
          orderBy("day", "asc"),
          limit(dayLimit),
        ),
      ),
      includeLessons
        ? getDocs(
            query(
              collection(db, "courses", courseId, "lessonAnalytics"),
              limit(100),
            ),
          )
        : Promise.resolve(null),
    ]);

  const bundle = {
    summary: parseSummary(summary.data() as Record<string, unknown> | undefined),
    realtime: parseRealtime(
      realtime.data() as Record<string, unknown> | undefined,
    ),
    audience: parseAudience(
      audience?.data() as Record<string, unknown> | undefined,
    ),
    traffic: parseTraffic(
      traffic?.data() as Record<string, unknown> | undefined,
    ),
    days: daysSnap.docs.map((d) =>
      parseDay(d.id, d.data() as Record<string, unknown>),
    ),
    lessons: lessonsSnap
      ? lessonsSnap.docs.map((d) =>
          parseLessonRollup(d.id, d.data() as Record<string, unknown>),
        )
      : [],
  };
  if (!bundle.summary.avgViewDurationSeconds && bundle.summary.views > 0) {
    bundle.summary.avgViewDurationSeconds =
      bundle.summary.watchSeconds / bundle.summary.views;
  }
  return bundle;
}

export function watchCourseAnalyticsSummary(
  courseId: string,
  onNext: (summary: CourseAnalyticsSummary) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "courses", courseId, "analytics", "summary"),
    (snap) =>
      onNext(parseSummary(snap.data() as Record<string, unknown> | undefined)),
    (error) => onError?.(error),
  );
}

export function watchCourseAnalyticsRealtime(
  courseId: string,
  onNext: (realtime: CourseAnalyticsRealtime) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "courses", courseId, "analytics", "realtime"),
    (snap) =>
      onNext(parseRealtime(snap.data() as Record<string, unknown> | undefined)),
    (error) => onError?.(error),
  );
}

export async function fetchAuthorDashboardStats(
  courseIds: string[],
): Promise<{
  totals: CourseAnalyticsSummary;
  realtimeActive: number;
  byCourse: Record<string, CourseAnalyticsSummary>;
}> {
  const byCourse: Record<string, CourseAnalyticsSummary> = {};
  let realtimeActive = 0;
  const ids = courseIds.slice(0, 24);
  const concurrency = 6;
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (id) => {
        const [summarySnap, rtSnap] = await Promise.all([
          getDoc(doc(getFirebaseDb(), "courses", id, "analytics", "summary")),
          getDoc(doc(getFirebaseDb(), "courses", id, "analytics", "realtime")),
        ]);
        byCourse[id] = parseSummary(
          summarySnap.data() as Record<string, unknown> | undefined,
        );
        realtimeActive += num(rtSnap.data()?.activeSessions);
      }),
    );
  }

  const totals = parseSummary(undefined);
  for (const s of Object.values(byCourse)) {
    totals.enrolled += s.enrolled;
    totals.completed += s.completed;
    totals.views += s.views;
    totals.watchSeconds += s.watchSeconds;
    totals.impressions += s.impressions;
    totals.opens += s.opens;
    totals.quizAttempts += s.quizAttempts;
    totals.quizPasses += s.quizPasses;
    totals.window28d.views += s.window28d.views;
    totals.window28d.watchSeconds += s.window28d.watchSeconds;
    totals.window28d.impressions += s.window28d.impressions;
    totals.window28d.opens += s.window28d.opens;
    totals.window7d.views += s.window7d.views;
    totals.window7d.watchSeconds += s.window7d.watchSeconds;
  }
  totals.completionRate =
    totals.enrolled > 0 ? totals.completed / totals.enrolled : 0;
  totals.avgViewDurationSeconds =
    totals.views > 0 ? totals.watchSeconds / totals.views : 0;

  return { totals, realtimeActive, byCourse };
}

/** Enrolled/completed from analytics rollup — no learner UIDs. */
export async function fetchCourseStudentCounts(
  courseId: string,
): Promise<{ enrolled: number; completed: number }> {
  const snap = await getDoc(
    doc(getFirebaseDb(), "courses", courseId, "analytics", "summary"),
  );
  const summary = parseSummary(
    snap.data() as Record<string, unknown> | undefined,
  );
  return { enrolled: summary.enrolled, completed: summary.completed };
}

export { emptyBundle };
