#!/usr/bin/env node
// Rebuilds the Pulse AI retrieval index by calling the app's own endpoint, so
// indexing always runs through the same code path the cron job uses.
//
// Usage: node scripts/reindex-ai-knowledge.mjs [forum] [academy] [official]
// Env:   PULSE_AI_BASE_URL      (default http://127.0.0.1:3000)
//        PULSE_AI_ADMIN_TASK_KEY  shared secret configured on the app
//
// Requires AI_GATEWAY_API_KEY and Firebase Admin credentials on the app side:
// embeddings are generated server-side, not here.

const BASE = process.env.PULSE_AI_BASE_URL ?? 'http://127.0.0.1:3000';
const KEY = process.env.PULSE_AI_ADMIN_TASK_KEY;

const VALID_GROUPS = ['forum', 'academy', 'official'];
const groups = process.argv.slice(2).filter((arg) => VALID_GROUPS.includes(arg));

if (!KEY) {
  console.error('PULSE_AI_ADMIN_TASK_KEY is required.');
  process.exit(1);
}

const response = await fetch(`${BASE}/api/ai/reindex`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-pulse-admin-key': KEY,
  },
  body: JSON.stringify(groups.length ? { groups } : {}),
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Reindex failed (${response.status}):`, body);
  process.exit(1);
}

const { report } = body;
console.log(
  `Indexed ${report.written} chunk(s), ${report.unchanged} unchanged, ` +
    `${report.removed} removed, ${report.failed} failed in ${report.durationMs}ms ` +
    `(groups: ${report.groups.join(', ')}).`,
);
