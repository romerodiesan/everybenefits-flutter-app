/**
 * Academy creator-analytics telemetry for Pulse web.
 *
 * Dual-path:
 * 1) Consent-gated Firebase Analytics custom events (→ BigQuery when linked)
 * 2) Always-on trusted callable `recordAcademyAnalytics` for Studio rollups
 *
 * Payloads never include uid, email, or free text.
 */
import {
  ACADEMY_ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_HEARTBEAT_SECONDS,
  type AcademyAnalyticsEventInput,
  type AcademyAnalyticsEventName,
  type AcademyAnalyticsPlatform,
  type AcademyAnalyticsSource,
} from "@pulse/shared";
import { callCloudFunction } from "@/lib/firebase/call-function";
import { getAnalyticsConsent } from "@/lib/privacy/telemetry";

const SESSION_KEY = "pulse_academy_session_v1";
const QUEUE_FLUSH_MS = 2500;
const MAX_QUEUE = 40;

type Queued = AcademyAnalyticsEventInput & { clientEventId: string };

let queue: Queued[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function getAcademySessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = randomId();
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

function platform(): AcademyAnalyticsPlatform {
  return "web";
}

function gaEventName(name: AcademyAnalyticsEventName): string {
  return `academy_${name}`;
}

async function logToGa(event: AcademyAnalyticsEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getAnalyticsConsent()) return;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!measurementId) return;
  try {
    const { getAnalytics, isSupported, logEvent } = await import(
      "firebase/analytics"
    );
    if (!(await isSupported())) return;
    const { getFirebaseApp } = await import("@/lib/firebase/client");
    const analytics = getAnalytics(getFirebaseApp());
    logEvent(analytics, gaEventName(event.name), {
      course_id: event.courseId,
      lesson_id: event.lessonId ?? undefined,
      source: event.source ?? "unknown",
      platform: event.platform,
      watch_delta: event.watchDeltaSeconds ?? 0,
      retention_bucket: event.retentionBucket ?? undefined,
      traffic_source: event.trafficSource ?? undefined,
      schema_version: ACADEMY_ANALYTICS_SCHEMA_VERSION,
    });
  } catch {
    // Best-effort.
  }
}

async function flushQueue(): Promise<void> {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, 20);
  try {
    await callCloudFunction("recordAcademyAnalytics", { events: batch });
  } catch {
    // Re-queue a limited number so transient failures don't drop everything.
    queue = [...batch.slice(0, 10), ...queue].slice(0, MAX_QUEUE);
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, QUEUE_FLUSH_MS);
}

export function trackAcademyEvent(
  partial: Omit<AcademyAnalyticsEventInput, "sessionId" | "platform"> & {
    sessionId?: string;
    platform?: AcademyAnalyticsPlatform;
  },
): void {
  if (typeof window === "undefined") return;
  const event: Queued = {
    ...partial,
    sessionId: partial.sessionId ?? getAcademySessionId(),
    platform: partial.platform ?? platform(),
    source: (partial.source ?? "unknown") as AcademyAnalyticsSource,
    clientEventId: randomId(),
  };
  void logToGa(event);
  queue.push(event);
  if (queue.length >= 15) {
    void flushQueue();
  } else {
    scheduleFlush();
  }
}

export function trackCourseImpression(input: {
  courseId: string;
  source?: AcademyAnalyticsSource;
  trafficSource?: string | null;
}): void {
  trackAcademyEvent({
    name: "course_impression",
    courseId: input.courseId,
    source: input.source,
    trafficSource: input.trafficSource,
  });
}

export function trackCourseOpen(input: {
  courseId: string;
  source?: AcademyAnalyticsSource;
  trafficSource?: string | null;
  locale?: string;
}): void {
  trackAcademyEvent({
    name: "course_open",
    courseId: input.courseId,
    source: input.source,
    trafficSource: input.trafficSource,
    locale: input.locale,
  });
}

export function trackLessonStart(input: {
  courseId: string;
  lessonId: string;
  durationSeconds?: number;
  source?: AcademyAnalyticsSource;
}): void {
  trackAcademyEvent({
    name: "lesson_start",
    courseId: input.courseId,
    lessonId: input.lessonId,
    durationSeconds: input.durationSeconds,
    source: input.source,
  });
}

export function trackLessonHeartbeat(input: {
  courseId: string;
  lessonId: string;
  positionSeconds: number;
  durationSeconds: number;
  watchDeltaSeconds: number;
}): void {
  const duration = Math.max(1, input.durationSeconds);
  const bucket = Math.min(
    100,
    Math.max(0, Math.floor((input.positionSeconds / duration) * 100)),
  );
  trackAcademyEvent({
    name: "lesson_heartbeat",
    courseId: input.courseId,
    lessonId: input.lessonId,
    positionSeconds: input.positionSeconds,
    durationSeconds: input.durationSeconds,
    watchDeltaSeconds: input.watchDeltaSeconds,
    retentionBucket: bucket,
  });
}

export function trackLessonComplete(input: {
  courseId: string;
  lessonId: string;
  positionSeconds?: number;
  durationSeconds?: number;
}): void {
  trackAcademyEvent({
    name: "lesson_complete",
    courseId: input.courseId,
    lessonId: input.lessonId,
    positionSeconds: input.positionSeconds,
    durationSeconds: input.durationSeconds,
    retentionBucket: 100,
  });
}

export function trackQuizSubmit(input: {
  courseId: string;
  lessonId: string;
  passed: boolean;
  score: number;
}): void {
  trackAcademyEvent({
    name: "quiz_submit",
    courseId: input.courseId,
    lessonId: input.lessonId,
    quizPassed: input.passed,
    quizScore: input.score,
  });
}

export { ANALYTICS_HEARTBEAT_SECONDS };
