#!/usr/bin/env node
/**
 * One-shot: rewrite legacy orgNodes type `sub_agency` → `agency`.
 *
 * Emulators:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tooling/scripts/migrate-sub-agencies.mjs
 *
 * Production (Application Default Credentials):
 *   GCLOUD_PROJECT=every-benefits-us node tooling/scripts/migrate-sub-agencies.mjs
 *
 * The Cloud Function migrateSubAgenciesToAgencies stays exported but is
 * disabled unless FUNCTIONS_ALLOW_ORG_MIGRATIONS=true.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(
  path.resolve(__dirname, "../../apps/functions/package.json"),
);
const { initializeApp, getApps } = requireFromFunctions("firebase-admin/app");
const { getFirestore, FieldValue } = requireFromFunctions(
  "firebase-admin/firestore",
);

const project =
  process.env.GCLOUD_PROJECT?.trim() ||
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  "every-benefits-us";

if (getApps().length === 0) {
  initializeApp({ projectId: project });
}

const db = getFirestore();

async function main() {
  let scanned = 0;
  let updated = 0;
  let done = false;
  while (!done) {
    const snap = await db
      .collection("orgNodes")
      .where("type", "==", "sub_agency")
      .limit(400)
      .get();
    scanned += snap.size;
    done = snap.size < 400;
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.set(
        doc.ref,
        { type: "agency", updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      updated += 1;
    }
    await batch.commit();
    console.log(`migrate-sub-agencies: scanned=${scanned} updated=${updated}`);
  }
  console.log(`migrate-sub-agencies: done scanned=${scanned} updated=${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
