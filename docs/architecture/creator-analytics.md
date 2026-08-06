# Creator analytics (Studio)

Creator performance metrics for course authors. Learner progress remains in
`users/{uid}/enrollments/{courseId}`; Studio dashboards read **aggregates only**.

## Pipeline

1. **Web / mobile** emit sanitized events (no UID/email/free text):
   - Consent-gated Firebase Analytics custom events (`academy_*`) → GA4 → BigQuery
   - Trusted callable `recordAcademyAnalytics` → Firestore rollups (always-on for Studio)
2. **Scheduled Functions**
   - `refreshAcademyAnalyticsRealtime` (every 5 min): active sessions, CTR, cohort scrubbing
   - `aggregateAcademyAnalyticsFromBigQuery` (daily): country/device from GA4 export
3. **Backfill** `backfillCourseAnalytics` (admin callable) recomputes enrollment KPIs

## Prerequisites (production)

1. Upgrade Firebase project to **Blaze**
2. Link GA4 property → **BigQuery export** (daily)
3. Set Functions env `BIGQUERY_ANALYTICS_DATASET` (e.g. `analytics_XXXXXX`)
4. Redeploy Functions + Firestore rules/indexes

Local / emulator: leave `BIGQUERY_ANALYTICS_DATASET` unset. Seed script writes
synthetic rollups under `courses/*/analytics*`.

## Privacy

- Studio UI never lists learner UIDs
- Audience buckets below `ANALYTICS_MIN_COHORT` (5) are suppressed
- Coverage note: GA-derived geo/device only includes opted-in Analytics users

## Event names

| Event | Meaning |
|-------|---------|
| `course_impression` | Course card visible in catalog |
| `course_open` | Course detail / player opened |
| `lesson_start` | Lesson became active |
| `lesson_heartbeat` | ~15s watch sample + retention bucket |
| `lesson_complete` | Lesson finished |
| `quiz_submit` | Quiz graded |
| `session_ping` | Optional presence ping |
