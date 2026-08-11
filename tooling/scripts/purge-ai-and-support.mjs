#!/usr/bin/env node
/**
 * Purge Pulse AI + in-app Support chat data from Firestore / RTDB.
 *
 * Default is dry-run (lists what would be deleted).
 *
 * Emulators:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
 *   node tooling/scripts/purge-ai-and-support.mjs
 *
 * Production (requires Application Default Credentials or a service account):
 *   I_UNDERSTAND_PURGE_PROD=1 node tooling/scripts/purge-ai-and-support.mjs --prod --execute
 *
 * Flags:
 *   --prod       Target every-benefits-us (no emulator env vars)
 *   --execute    Actually delete (omit for dry-run)
 *   --project=X  Override project id
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.resolve(__dirname, "../../apps/functions/package.json"),
);

const { applicationDefault, cert, initializeApp } =
  requireFromFunctions("firebase-admin/app");
const { FieldPath, FieldValue, getFirestore } =
  requireFromFunctions("firebase-admin/firestore");
const { getDatabase } = requireFromFunctions("firebase-admin/database");

const argv = process.argv.slice(2);
const isProd = argv.includes("--prod");
const execute = argv.includes("--execute");
const projectArg = argv.find((a) => a.startsWith("--project="));
const projectId =
  projectArg?.slice("--project=".length) ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  (isProd ? "every-benefits-us" : "every-insurance");

const BATCH = 400;

function log(msg) {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] ${msg}`);
}

function readServiceAccount() {
  const raw =
    process.env.SERVICE_ACCOUNT_KEY ??
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ??
    process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw?.trim()) return null;
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(text);
  return {
    projectId: parsed.project_id ?? parsed.projectId,
    clientEmail: parsed.client_email ?? parsed.clientEmail,
    privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
  };
}

function init() {
  if (isProd) {
    if (process.env.I_UNDERSTAND_PURGE_PROD !== "1") {
      console.error(
        "Refusing production purge without I_UNDERSTAND_PURGE_PROD=1",
      );
      process.exit(1);
    }
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  } else if (
    !process.env.FIRESTORE_EMULATOR_HOST &&
    !process.env.FIREBASE_DATABASE_EMULATOR_HOST
  ) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
  }

  const sa = readServiceAccount();
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${projectId}-default-rtdb.firebaseio.com`;

  initializeApp(
    sa
      ? {
          credential: cert(sa),
          projectId: sa.projectId ?? projectId,
          databaseURL,
        }
      : isProd
        ? {
            credential: applicationDefault(),
            projectId,
            databaseURL,
          }
        : { projectId, databaseURL },
  );
}

async function deleteQuery(db, query, label) {
  let total = 0;
  let reportedDry = false;
  for (;;) {
    const snap = await query.limit(BATCH).get();
    if (snap.empty) break;
    total += snap.size;
    if (!execute) {
      if (!reportedDry) {
        log(`dry-run ${label}: would delete ≥${snap.size}`);
        reportedDry = true;
      }
      break;
    }
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    log(`deleted ${label}: ${snap.size} (running total ${total})`);
    if (snap.size < BATCH) break;
  }
  if (total === 0) log(`${execute ? "deleted" : "dry-run"} ${label}: 0`);
  return total;
}

async function deleteCollection(db, collectionPath) {
  return deleteQuery(db, db.collection(collectionPath), collectionPath);
}

async function purgePerUser(db) {
  let usersScanned = 0;
  let last = null;
  for (;;) {
    let q = db.collection("users").orderBy(FieldPath.documentId()).limit(100);
    if (last) q = q.startAfter(last);
    const users = await q.get();
    if (users.empty) break;

    for (const user of users.docs) {
      usersScanned += 1;

      const convos = await user.ref.collection("aiConversations").limit(BATCH).get();
      for (const convo of convos.docs) {
        await deleteQuery(
          db,
          convo.ref.collection("messages"),
          `users/${user.id}/aiConversations/${convo.id}/messages`,
        );
      }
      await deleteQuery(
        db,
        user.ref.collection("aiConversations"),
        `users/${user.id}/aiConversations`,
      );
      await deleteQuery(
        db,
        user.ref.collection("aiUsage"),
        `users/${user.id}/aiUsage`,
      );

      const prefsRef = user.ref.collection("private").doc("notificationPrefs");
      const prefs = await prefsRef.get();
      if (prefs.exists) {
        const data = prefs.data() ?? {};
        const patch = {};
        let dirty = false;
        for (const key of Object.keys(data)) {
          if (/support/i.test(key)) {
            patch[key] = FieldValue.delete();
            dirty = true;
          }
        }
        if (dirty) {
          if (execute) {
            await prefsRef.update(patch);
            log(`cleaned notification prefs for ${user.id}`);
          } else {
            log(`dry-run notification prefs: would clean ${user.id}`);
          }
        }
      }

      await deleteQuery(
        db,
        user.ref
          .collection("notifications")
          .where("type", "==", "support_message"),
        `users/${user.id}/notifications[support_message]`,
      );
    }

    last = users.docs[users.docs.length - 1];
    if (users.size < 100) break;
  }
  log(`scanned ${usersScanned} users`);
}

async function purgeRtdb(rtdb) {
  const chatsSnap = await rtdb.ref("chats").once("value");
  const chats = chatsSnap.val() || {};
  const supportIds = Object.keys(chats).filter(
    (id) => id.startsWith("support_") || chats[id]?.isSupportChat === true,
  );

  log(
    `${execute ? "deleting" : "dry-run"} RTDB support chats: ${supportIds.length}`,
  );

  for (const chatId of supportIds) {
    if (execute) {
      await Promise.all([
        rtdb.ref(`chats/${chatId}`).remove(),
        rtdb.ref(`messages/${chatId}`).remove(),
      ]);
    } else {
      log(`  would remove chats/${chatId} + messages/${chatId}`);
    }
  }

  const userChatsSnap = await rtdb.ref("userChats").once("value");
  const userChats = userChatsSnap.val() || {};
  let inboxRows = 0;
  for (const [uid, inbox] of Object.entries(userChats)) {
    if (!inbox || typeof inbox !== "object") continue;
    for (const chatId of Object.keys(inbox)) {
      if (!chatId.startsWith("support_")) continue;
      inboxRows += 1;
      if (execute) {
        await rtdb.ref(`userChats/${uid}/${chatId}`).remove();
      } else if (inboxRows <= 20) {
        log(`  would remove userChats/${uid}/${chatId}`);
      }
    }
  }
  log(
    `${execute ? "deleted" : "dry-run"} userChats support rows: ${inboxRows}`,
  );
}

async function main() {
  log(
    `purge-ai-and-support project=${projectId} mode=${isProd ? "prod" : "emulator"} action=${execute ? "EXECUTE" : "dry-run"}`,
  );
  init();
  const db = getFirestore();
  const rtdb = getDatabase();

  await deleteCollection(db, "aiKnowledgeChunks");
  await deleteCollection(db, "aiRuns");

  const pulseAi = db.doc("platformConfig/pulseAi");
  const pulseAiSnap = await pulseAi.get();
  if (pulseAiSnap.exists) {
    if (execute) {
      await pulseAi.delete();
      log("deleted platformConfig/pulseAi");
    } else {
      log("dry-run platformConfig/pulseAi: would delete");
    }
  } else {
    log("platformConfig/pulseAi: absent");
  }

  await purgePerUser(db);
  await purgeRtdb(rtdb);

  log(
    execute
      ? "Purge complete."
      : "Dry-run complete. Re-run with --execute to delete.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
