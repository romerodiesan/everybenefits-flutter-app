#!/usr/bin/env node
/**
 * Seed built-in roles and permission matrices (`roles/{id}`).
 *
 * New Functions deploys also auto-seed on instance init. This CLI is for
 * emulators, first-time environments, and ops who want to run it now.
 *
 * Emulator (default; requires `pnpm emulators`):
 *   pnpm seed:roles
 *
 * Production:
 *   pnpm seed:roles -- --production
 *   pnpm seed:roles -- --production --from-functions-env
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const production = argv.includes("--production") || argv.includes("--prod");
const fromFunctionsEnv = argv.includes("--from-functions-env");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

async function seedEmulator() {
  const { initAdmin, log } = await import("./mega-seed/admin.mjs");
  const { seedRoles } = await import("./mega-seed/roles.mjs");
  initAdmin();
  log("seed-roles", "target=emulator");
  return seedRoles();
}

async function seedProduction() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      "Refusing --production: FIRESTORE_EMULATOR_HOST is set (%s). Unset it to target production.",
      process.env.FIRESTORE_EMULATOR_HOST,
    );
    process.exit(2);
  }

  const requireFromFunctions = createRequire(
    path.join(root, "apps/functions/package.json"),
  );
  const { getApps, initializeApp, applicationDefault, cert } =
    requireFromFunctions("firebase-admin/app");
  const { getFirestore, FieldValue } = requireFromFunctions(
    "firebase-admin/firestore",
  );
  const { seedBuiltinRoles } = await import("./mega-seed/roles.mjs");

  if (!getApps().length) {
    const fromEnv = fromFunctionsEnv
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

  return seedBuiltinRoles(getFirestore(), FieldValue, "seed-roles");
}

const result = await (production ? seedProduction() : seedEmulator()).catch(
  (err) => {
    console.error(
      `Role seed failed: ${err instanceof Error ? err.message : err}`,
    );
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  },
);
console.log(
  `Seeded builtin roles version=${result.version} created=${result.created} updated=${result.updated} permissions=${result.permissionCount}`,
);
process.exit(0);
