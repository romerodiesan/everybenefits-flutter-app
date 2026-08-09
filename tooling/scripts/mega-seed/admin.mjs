import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.resolve(__dirname, "../../../apps/functions/package.json"),
);

const { initializeApp } = requireFromFunctions("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } =
  requireFromFunctions("firebase-admin/firestore");
const { getDatabase } = requireFromFunctions("firebase-admin/database");

let ready = false;

export function initAdmin() {
  if (ready) return;
  process.env.FIRESTORE_EMULATOR_HOST = config.firestoreHost;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = config.authHost;
  // Admin SDK RTDB emulator
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = config.databaseHost;

  initializeApp({
    projectId: config.project,
    // Match app env; FIREBASE_DATABASE_EMULATOR_HOST redirects to local RTDB.
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      `https://${config.project}-default-rtdb.firebaseio.com`,
  });
  ready = true;
}

export function db() {
  initAdmin();
  return getFirestore();
}

export function rtdb() {
  initAdmin();
  return getDatabase();
}

export { FieldValue, Timestamp };

/** Commit write batches of ≤ batchSize ops. */
export async function commitInBatches(ops, size = config.batchSize) {
  const firestore = db();
  for (let i = 0; i < ops.length; i += size) {
    const slice = ops.slice(i, i + size);
    const batch = firestore.batch();
    for (const op of slice) {
      if (op.type === "set") {
        batch.set(op.ref, op.data, op.options ?? {});
      } else if (op.type === "update") {
        batch.update(op.ref, op.data);
      } else if (op.type === "delete") {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export function log(step, detail = "") {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] ${step}${detail ? ` — ${detail}` : ""}`);
}

export async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}
