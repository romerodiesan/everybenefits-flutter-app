"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACADEMY_ANALYTICS_PLATFORMS = exports.ACADEMY_ANALYTICS_SOURCES = exports.ACADEMY_ANALYTICS_EVENT_NAMES = exports.ANALYTICS_HEARTBEAT_SECONDS = exports.ANALYTICS_MIN_COHORT = exports.ACADEMY_ANALYTICS_SCHEMA_VERSION = exports.QUIZ_DEFAULT_PASS_PERCENT = exports.LESSON_COMPLETE_THRESHOLD = exports.LESSON_TYPES = exports.COURSE_LEVELS = void 0;
exports.parseClockDuration = parseClockDuration;
exports.resolveLessonDurationSeconds = resolveLessonDurationSeconds;
exports.emptyRetentionBuckets = emptyRetentionBuckets;
exports.emptyHourHistogram = emptyHourHistogram;
exports.emptyAnalyticsWindow = emptyAnalyticsWindow;
exports.COURSE_LEVELS = [
    "basic",
    "intermediate",
    "advanced",
];
exports.LESSON_TYPES = ["video", "reading", "quiz"];
function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const n = Number(value);
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
/** Parses `m:ss` / `h:mm:ss` duration labels. */
function parseClockDuration(raw) {
    const parts = raw.trim().split(":").map((part) => Number(part));
    if (parts.length < 2 || parts.length > 3)
        return null;
    if (parts.some((n) => !Number.isFinite(n) || n < 0))
        return null;
    if (parts.length === 2) {
        return Math.round(parts[0] * 60 + parts[1]);
    }
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
}
/**
 * Reads a lesson's duration in seconds.
 * Some Studio docs stored minutes in `durationMinutes` (or duplicated that
 * value into `durationSeconds`); prefer a real second count when present.
 */
function resolveLessonDurationSeconds(data) {
    const minutes = toFiniteNumber(data.durationMinutes);
    let seconds = toFiniteNumber(data.durationSeconds);
    if (seconds == null && typeof data.durationSeconds === "string") {
        seconds = parseClockDuration(data.durationSeconds);
    }
    if (minutes != null &&
        minutes > 0 &&
        (seconds == null || seconds === 0 || seconds === minutes)) {
        return Math.max(0, Math.round(minutes * 60));
    }
    return Math.max(0, Math.round(seconds ?? 0));
}
exports.LESSON_COMPLETE_THRESHOLD = 0.9;
exports.QUIZ_DEFAULT_PASS_PERCENT = 70;
// --- Creator analytics (aggregate-only in Studio) ---
/** Bump when event payload or rollup shape changes incompatibly. */
exports.ACADEMY_ANALYTICS_SCHEMA_VERSION = 1;
/** Minimum cohort size before audience breakdowns are shown (privacy). */
exports.ANALYTICS_MIN_COHORT = 5;
/** Heartbeat / progress sample interval expected from clients (seconds). */
exports.ANALYTICS_HEARTBEAT_SECONDS = 15;
exports.ACADEMY_ANALYTICS_EVENT_NAMES = [
    "course_impression",
    "course_open",
    "lesson_start",
    "lesson_heartbeat",
    "lesson_complete",
    "quiz_submit",
    "session_ping",
];
exports.ACADEMY_ANALYTICS_SOURCES = [
    "catalog",
    "search",
    "path",
    "notification",
    "direct",
    "share",
    "unknown",
];
exports.ACADEMY_ANALYTICS_PLATFORMS = ["web", "ios", "android"];
function emptyRetentionBuckets() {
    return Array.from({ length: 101 }, () => 0);
}
function emptyHourHistogram() {
    return Array.from({ length: 24 }, () => 0);
}
function emptyAnalyticsWindow() {
    return {
        views: 0,
        watchSeconds: 0,
        enrolled: 0,
        completed: 0,
        impressions: 0,
        opens: 0,
    };
}
