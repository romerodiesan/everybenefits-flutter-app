"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACADEMY_ANALYTICS_PLATFORMS = exports.ACADEMY_ANALYTICS_SOURCES = exports.ACADEMY_ANALYTICS_EVENT_NAMES = exports.ANALYTICS_HEARTBEAT_SECONDS = exports.ANALYTICS_MIN_COHORT = exports.ACADEMY_ANALYTICS_SCHEMA_VERSION = exports.QUIZ_DEFAULT_PASS_PERCENT = exports.LESSON_COMPLETE_THRESHOLD = exports.LESSON_TYPES = exports.COURSE_LEVELS = void 0;
exports.emptyRetentionBuckets = emptyRetentionBuckets;
exports.emptyHourHistogram = emptyHourHistogram;
exports.emptyAnalyticsWindow = emptyAnalyticsWindow;
exports.COURSE_LEVELS = [
    "basic",
    "intermediate",
    "advanced",
];
exports.LESSON_TYPES = ["video", "reading", "quiz"];
exports.LESSON_COMPLETE_THRESHOLD = 0.9;
exports.QUIZ_DEFAULT_PASS_PERCENT = 70;
// --- Creator analytics (YouTube-Studio-like, aggregate-only in Studio) ---
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
