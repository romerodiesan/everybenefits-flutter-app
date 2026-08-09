/**
 * Mega-seed sizing. Override via env or CLI flags on seed-mega.mjs.
 *
 * Defaults target a heavy local load test (~10k users, ~2k agencies).
 * Use SEED_PROFILE=quick for a smaller smoke run.
 */

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const PROFILE = (process.env.SEED_PROFILE || "full").toLowerCase();

const QUICK = {
  users: 200,
  agencies: 40,
  divisions: 2,
  regions: 4,
  courses: 8,
  paths: 3,
  threads: 80,
  repliesPerThread: 4,
  dmChats: 120,
  groupChats: 30,
  messagesPerChat: 12,
  notifUsers: 40,
  notifsPerUser: 6,
  enrollRate: 0.5,
  presenceRate: 0.2,
  analyticsDays: 30,
};

const FULL = {
  users: 10_000,
  agencies: 2_000,
  divisions: 5,
  regions: 40,
  courses: 40,
  paths: 8,
  threads: 1_500,
  repliesPerThread: 5,
  dmChats: 3_000,
  groupChats: 400,
  messagesPerChat: 20,
  notifUsers: 800,
  notifsPerUser: 8,
  enrollRate: 0.4,
  presenceRate: 0.12,
  analyticsDays: 60,
};

const base = PROFILE === "quick" ? QUICK : FULL;

export const config = {
  profile: PROFILE === "quick" ? "quick" : "full",
  project: process.env.GCLOUD_PROJECT ?? "every-benefits-us",
  firestoreHost: process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080",
  authHost: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
  databaseHost: process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000",
  password: process.env.SEED_USER_PASSWORD ?? "PulseSeed1!",
  // Keep Auth traffic modest so the emulator stays responsive under full load.
  authConcurrency: intEnv("SEED_AUTH_CONCURRENCY", PROFILE === "quick" ? 16 : 8),
  batchSize: intEnv("SEED_BATCH_SIZE", 400),

  users: intEnv("SEED_USERS", base.users),
  agencies: intEnv("SEED_AGENCIES", base.agencies),
  divisions: intEnv("SEED_DIVISIONS", base.divisions),
  regions: intEnv("SEED_REGIONS", base.regions),
  courses: intEnv("SEED_COURSES", base.courses),
  paths: intEnv("SEED_PATHS", base.paths),
  threads: intEnv("SEED_THREADS", base.threads),
  repliesPerThread: intEnv("SEED_REPLIES_PER_THREAD", base.repliesPerThread),
  dmChats: intEnv("SEED_DM_CHATS", base.dmChats),
  groupChats: intEnv("SEED_GROUP_CHATS", base.groupChats),
  messagesPerChat: intEnv("SEED_MESSAGES_PER_CHAT", base.messagesPerChat),
  notifUsers: intEnv("SEED_NOTIF_USERS", base.notifUsers),
  notifsPerUser: intEnv("SEED_NOTIFS_PER_USER", base.notifsPerUser),
  enrollRate: Number(process.env.SEED_ENROLL_RATE ?? base.enrollRate),
  presenceRate: Number(process.env.SEED_PRESENCE_RATE ?? base.presenceRate),
  analyticsDays: intEnv("SEED_ANALYTICS_DAYS", base.analyticsDays),
};

/** Always-created accounts for manual QA (password = config.password). */
export const FIXTURE_USERS = [
  {
    email: "admin@pulse.local",
    displayName: "Ada Admin",
    role: "admin",
    approvalStatus: "approved",
  },
  {
    email: "manager@pulse.local",
    displayName: "Morgan Manager",
    role: "manager",
    approvalStatus: "approved",
  },
  {
    email: "agent@pulse.local",
    displayName: "Alex Rivera",
    role: "agent",
    approvalStatus: "approved",
  },
  {
    email: "student@pulse.local",
    displayName: "Sam Student",
    role: "student",
    approvalStatus: "approved",
  },
  {
    email: "instructor@pulse.local",
    displayName: "Ira Instructor",
    role: "instructor",
    approvalStatus: "approved",
  },
  {
    email: "pending@pulse.local",
    displayName: "Pat Pending",
    role: "student",
    approvalStatus: "pending",
  },
];

export const LICENSE_ROLES = new Set([
  "agent",
  "instructor",
  "manager",
  "admin",
]);
