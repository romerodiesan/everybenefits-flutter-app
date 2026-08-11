#!/usr/bin/env node
/**
 * One-shot backfill of user search index fields (displayNameLower, emailLower, nameTokens).
 *
 * Prefer production credentials (service account JSON or ADC). Refuses emulator hosts.
 *
 *   env -u FIRESTORE_EMULATOR_HOST -u FIREBASE_AUTH_EMULATOR_HOST \\
 *     GOOGLE_APPLICATION_CREDENTIALS=./sa.json \\
 *     node ./tooling/scripts/backfill-user-search-fields.mjs
 *
 * Or with functions/.env SERVICE_ACCOUNT_KEY / FIREBASE_SERVICE_ACCOUNT_KEY JSON:
 *   node ./tooling/scripts/backfill-user-search-fields.mjs --from-functions-env
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "Refusing to run: FIRESTORE_EMULATOR_HOST is set (%s). Unset it to target production.",
    process.env.FIRESTORE_EMULATOR_HOST,
  );
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "apps/functions/package.json"));

const { userSearchIndexFields } = require("./vendor/pulse-shared/dist/profile.js");
const {
  getApps,
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function loadServiceAccountFromFunctionsEnv() {
  const envPath = path.join(root, "apps/functions/.env");
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, "utf8");
  const pick = (key) => {
    const re = new RegExp(`^${key}=(.*)$`, "m");
    const m = text.match(re);
    if (!m) return null;
    let raw = m[1].trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    // Support escaped newlines in .env JSON strings.
    raw = raw.replace(/\\n/g, "\n");
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  return (
    pick("FIREBASE_SERVICE_ACCOUNT_KEY") ||
    pick("SERVICE_ACCOUNT_KEY") ||
    pick("GOOGLE_SERVICE_ACCOUNT_KEY")
  );
}

if (!getApps().length) {
  const fromEnv =
    process.argv.includes("--from-functions-env")
      ? loadServiceAccountFromFunctionsEnv()
      : null;
  if (fromEnv) {
    initializeApp({
      credential: cert(fromEnv),
      projectId: fromEnv.project_id || "every-benefits-us",
    });
    console.log("Initialized with service account from apps/functions/.env");
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: "every-benefits-us",
    });
    console.log("Initialized with application default credentials");
  }
}
const db = getFirestore();

const PAGE = 400;

async function main() {
  let pageToken = null;
  let scanned = 0;
  let updated = 0;
  for (;;) {
    let q = db.collection("users").orderBy("__name__", "asc").limit(PAGE);
    if (pageToken) {
      const cursor = await db.doc(`users/${pageToken}`).get();
      if (cursor.exists) q = q.startAfter(cursor);
    }
    const snap = await q.get();
    if (snap.empty) break;

    let batch = db.batch();
    let ops = 0;
    const flush = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const doc of snap.docs) {
      scanned += 1;
      const data = doc.data();
      const search = userSearchIndexFields(
        typeof data.displayName === "string" ? data.displayName : null,
        typeof data.email === "string" ? data.email : null,
      );
      const existingTokens = Array.isArray(data.nameTokens)
        ? data.nameTokens.map(String)
        : [];
      const needs =
        data.displayNameLower !== search.displayNameLower ||
        data.emailLower !== search.emailLower ||
        JSON.stringify(existingTokens) !== JSON.stringify(search.nameTokens);
      if (!needs) continue;
      batch.set(
        doc.ref,
        { ...search, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      ops += 1;
      updated += 1;
      if (ops >= 400) await flush();
    }
    await flush();

    const last = snap.docs[snap.docs.length - 1];
    console.log(
      `scanned=${scanned} updated=${updated} last=${last?.id ?? "-"}`,
    );
    if (snap.size < PAGE) break;
    pageToken = last.id;
  }
  console.log(`done scanned=${scanned} updated=${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
