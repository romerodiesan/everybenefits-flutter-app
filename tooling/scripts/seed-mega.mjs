#!/usr/bin/env node
/**
 * Mega-seed for Firebase emulators — volume load data for Pulse.
 *
 * Prerequisites: `pnpm emulators` (Auth, Firestore, RTDB).
 * Restart emulators after pulling functions changes so bootstrap skips
 * *@pulse.local seed signups (otherwise 10k onCreate floods Firestore).
 *
 * Usage:
 *   pnpm seed:quick           # smoke (~200 users) — prefer this first
 *   pnpm seed / seed:mega     # full (~10k users, ~2k agencies)
 *   pnpm seed:roles           # built-in roles + permissions only
 *   pnpm seed -- --quick
 *   SEED_USERS=500 pnpm seed  # override counts (see mega-seed/config.mjs)
 *
 * Fixture logins (password PulseSeed1!):
 *   admin@pulse.local, manager@pulse.local, agent@pulse.local,
 *   student@pulse.local, instructor@pulse.local, pending@pulse.local
 */

const argv = process.argv.slice(2);
if (argv.includes("--quick") || argv.includes("-q")) {
  process.env.SEED_PROFILE = "quick";
}

const { config } = await import("./mega-seed/config.mjs");
const { initAdmin, log } = await import("./mega-seed/admin.mjs");
const { seedRoles } = await import("./mega-seed/roles.mjs");
const { seedOrgs } = await import("./mega-seed/orgs.mjs");
const { seedUsers } = await import("./mega-seed/users.mjs");
const { seedAcademy } = await import("./mega-seed/academy.mjs");
const { seedForums } = await import("./mega-seed/forums.mjs");
const { seedChats } = await import("./mega-seed/chats.mjs");
const { seedNotifications } = await import("./mega-seed/notifications.mjs");
const { seedAnalytics } = await import("./mega-seed/analytics.mjs");

async function main() {
  const started = Date.now();
  initAdmin();
  log(
    "mega-seed",
    `project=${config.project} profile=${config.profile} users=${config.users} agencies=${config.agencies}`,
  );
  log(
    "mega-seed",
    `emulators firestore=${config.firestoreHost} auth=${config.authHost} rtdb=${config.databaseHost}`,
  );

  await seedRoles();
  const org = await seedOrgs();
  const userCtx = await seedUsers(org);
  const academy = await seedAcademy(userCtx);
  await seedForums(userCtx);
  await seedChats(userCtx);
  await seedNotifications(userCtx, academy);
  await seedAnalytics(academy);

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log("\n────────────────────────────────────────");
  console.log(`Mega-seed complete in ${secs}s (profile=${config.profile})`);
  console.log(`Password for all Auth users: ${config.password}`);
  console.log("Fixture accounts:");
  for (const [email, uid] of Object.entries(userCtx.fixtures)) {
    console.log(`  ${email.padEnd(28)} ${uid}`);
  }
  console.log("────────────────────────────────────────\n");
  // Admin SDK keeps open sockets; force exit so the CLI doesn't hang.
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nMega-seed failed: ${err instanceof Error ? err.message : err}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
