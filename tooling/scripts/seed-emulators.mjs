#!/usr/bin/env node
/**
 * Seed Firebase emulator data used by local Pulse development.
 *
 * Prerequisites: emulators running (`pnpm emulators`).
 *
 * Usage:
 *   pnpm seed
 *   pnpm seed -- --uid <firebase-uid>   # notifications for a specific user
 *   SEED_USER_UID=<uid> pnpm seed
 *
 * Seeds (in order):
 *   1. Auth + Firestore users (admin/manager/agent/student/…)
 *   2. Academy catalog
 *   3. Notification fixtures for agent@pulse.local (or --uid / SEED_USER_UID)
 *
 * Env:
 *   FIRESTORE_EMULATOR_HOST       (default 127.0.0.1:8080)
 *   FIREBASE_AUTH_EMULATOR_HOST   (default 127.0.0.1:9099)
 *   GCLOUD_PROJECT                (default every-insurance)
 *   SEED_USER_UID                 optional override for notifications
 *   SEED_USER_PASSWORD            default PulseSeed1!
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const PROJECT = process.env.GCLOUD_PROJECT ?? "every-insurance";

function parseUid(argv) {
  const fromEnv = process.env.SEED_USER_UID?.trim();
  if (fromEnv) return fromEnv;
  const flag = argv.findIndex((arg) => arg === "--uid" || arg === "--user");
  if (flag >= 0 && argv[flag + 1]) return argv[flag + 1].trim();
  return "";
}

function run(scriptRel, args = []) {
  const script = path.join(ROOT, scriptRel);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
        FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
        GCLOUD_PROJECT: PROJECT,
      },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptRel} exited with code ${code ?? "null"}`));
    });
  });
}

/** Capture stdout from a seed script (used to pick agent uid). */
function runCapture(scriptRel, args = []) {
  const script = path.join(ROOT, scriptRel);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
        FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
        GCLOUD_PROJECT: PROJECT,
      },
      stdio: ["inherit", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
      process.stdout.write(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${scriptRel} exited with code ${code ?? "null"}`));
    });
  });
}

async function assertEmulatorUp() {
  const url = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
  try {
    await fetch(url, { headers: { Authorization: "Bearer owner" } });
  } catch (err) {
    throw new Error(
      `Firestore emulator not reachable at ${FIRESTORE_HOST}. Start it with \`pnpm emulators\` first.\n${err instanceof Error ? err.message : err}`,
    );
  }
}

function agentUidFromUsersOutput(output) {
  const match = output.match(
    /agent@pulse\.local\s+→\s+(\S+)/i,
  );
  return match?.[1]?.trim() ?? "";
}

async function main() {
  const argv = process.argv.slice(2).filter((arg) => arg !== "--");
  let uid = parseUid(argv);

  console.log(
    `Seeding emulators @ Firestore ${FIRESTORE_HOST} / Auth ${AUTH_HOST} (project ${PROJECT})…`,
  );
  await assertEmulatorUp();

  const usersOut = await runCapture("tooling/scripts/seed-users.mjs");
  if (!uid) {
    uid = agentUidFromUsersOutput(usersOut);
  }

  await run("tooling/scripts/seed-academy.mjs");

  if (uid) {
    await run("tooling/scripts/seed-notifications.mjs", [uid]);
  } else {
    console.log(
      "\nSkipped notifications seed (could not resolve a user uid).",
    );
  }

  console.log("\nEmulator seed complete.");
  console.log("Sign in with e.g. agent@pulse.local / PulseSeed1!");
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exit(1);
});
