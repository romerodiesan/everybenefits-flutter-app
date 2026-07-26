#!/usr/bin/env node
// Seeds a representative notification inbox into the Firestore emulator.
//
// Usage: node scripts/seed-notifications.mjs <firebase-uid>
// Env:   FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8080)
//        GCLOUD_PROJECT          (default every-insurance)

import { buildNotificationSeed } from './notification-seed-fixtures.mjs';

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT ?? 'every-insurance';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encode) } };
  }
  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'object':
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, child]) => [key, encode(child)]),
          ),
        },
      };
    default:
      throw new Error(`Unsupported seed value: ${typeof value}`);
  }
}

async function setDoc(path, data) {
  const response = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, encode(value)]),
      ),
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${await response.text()}`);
  }
}

async function main() {
  const uid = process.argv[2]?.trim() ?? process.env.SEED_USER_UID?.trim();
  if (!uid) {
    throw new Error(
      'Usage: node scripts/seed-notifications.mjs <firebase-uid>',
    );
  }

  const seed = buildNotificationSeed(uid);
  await Promise.all(
    seed.notifications.map(({ id, ...notification }) =>
      setDoc(`users/${uid}/notifications/${id}`, notification),
    ),
  );
  await setDoc(`users/${uid}/notificationState/default`, seed.state);

  console.log(
    `Seeded ${seed.notifications.length} notifications for ${uid} at ${HOST}.`,
  );
  console.log(
    `Unread: ${seed.state.unreadCount}; forum unread: ${seed.state.unreadForumCount}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
