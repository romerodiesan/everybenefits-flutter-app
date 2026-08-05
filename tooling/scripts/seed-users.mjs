#!/usr/bin/env node
/**
 * Seeds Auth + Firestore user profiles into the Firebase emulators.
 *
 * Usage: node tooling/scripts/seed-users.mjs
 * Env:   FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8080)
 *        FIREBASE_AUTH_EMULATOR_HOST (default 127.0.0.1:9099)
 *        GCLOUD_PROJECT (default every-insurance)
 *
 * All seeded accounts share password: PulseSeed1!
 */

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const PROJECT = process.env.GCLOUD_PROJECT ?? "every-insurance";
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "PulseSeed1!";
const FIRESTORE_BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_SIGN_UP = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
const AUTH_SIGN_IN = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;

/** @typedef {{
 *   email: string;
 *   displayName: string;
 *   role: string;
 *   approvalStatus: "approved" | "pending" | "rejected";
 *   profileCompleted: boolean;
 *   npn?: string | null;
 *   phoneCountryCode?: string | null;
 *   phoneNumber?: string | null;
 *   agency?: string | null;
 * }} SeedUserDef
 */

/** @type {SeedUserDef[]} */
const USERS = [
  {
    email: "admin@pulse.local",
    displayName: "Ada Admin",
    role: "admin",
    approvalStatus: "approved",
    profileCompleted: true,
    npn: null,
    agency: "Every Benefits",
  },
  {
    email: "manager@pulse.local",
    displayName: "Morgan Manager",
    role: "manager",
    approvalStatus: "approved",
    profileCompleted: true,
    npn: null,
    agency: "Every Benefits",
  },
  {
    email: "agent@pulse.local",
    displayName: "Alex Rivera",
    role: "agent",
    approvalStatus: "approved",
    profileCompleted: true,
    npn: "12345678",
    phoneCountryCode: "+1",
    phoneNumber: "5551234567",
    agency: "Every Benefits",
  },
  {
    email: "student@pulse.local",
    displayName: "Sam Student",
    role: "student",
    approvalStatus: "approved",
    profileCompleted: true,
    npn: null,
    agency: "Every Benefits",
  },
  {
    email: "pending@pulse.local",
    displayName: "Pat Pending",
    role: "student",
    approvalStatus: "pending",
    profileCompleted: true,
    npn: null,
    agency: "Every Benefits",
  },
  {
    email: "instructor@pulse.local",
    displayName: "Ira Instructor",
    role: "instructor",
    approvalStatus: "approved",
    profileCompleted: true,
    npn: null,
    agency: "Every Benefits",
  },
];

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encode) } };
  }
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "boolean":
      return { booleanValue: value };
    case "number":
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case "object":
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, encode(v)]),
          ),
        },
      };
    default:
      throw new Error(`Unsupported seed value: ${typeof value}`);
  }
}

async function setDoc(path, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner",
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, encode(v)]),
      ),
    }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${await res.text()}`);
  }
}

async function ensureAuthUser(email, displayName) {
  const signUp = await fetch(AUTH_SIGN_UP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      displayName,
      returnSecureToken: true,
    }),
  });
  if (signUp.ok) {
    const body = await signUp.json();
    return { uid: String(body.localId), created: true };
  }

  const errText = await signUp.text();
  const alreadyExists =
    signUp.status === 400 &&
    /EMAIL_EXISTS|email.*exist/i.test(errText);

  if (!alreadyExists) {
    throw new Error(`Auth signUp ${email}: ${signUp.status} ${errText}`);
  }

  const signIn = await fetch(AUTH_SIGN_IN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      returnSecureToken: true,
    }),
  });
  if (!signIn.ok) {
    throw new Error(
      `Auth signIn ${email}: ${signIn.status} ${await signIn.text()} (user exists but password may differ from ${PASSWORD})`,
    );
  }
  const body = await signIn.json();
  return { uid: String(body.localId), created: false };
}

function profileDoc(uid, def, now) {
  const privacy = {
    discoverableInDirectory: true,
    searchableByEmail: true,
    searchableByNpn: true,
    showEmailInSearch: true,
    showNpnInSearch: true,
    allowDirectMessages: true,
  };

  return {
    uid,
    email: def.email,
    displayName: def.displayName,
    photoUrl: null,
    role: def.role,
    isAnonymous: false,
    profileCompleted: def.profileCompleted,
    productTourVersion: 1,
    phoneCountryCode: def.phoneCountryCode ?? null,
    phoneNumber: def.phoneNumber ?? null,
    phoneVerified: Boolean(def.phoneNumber),
    npn: def.npn ?? null,
    address: def.role === "agent" ? "100 Main St\nMiami, FL 33101" : null,
    addressStreet: def.role === "agent" ? "100 Main St" : null,
    addressApt: null,
    addressCity: def.role === "agent" ? "Miami" : null,
    addressState: def.role === "agent" ? "FL" : null,
    addressZip: def.role === "agent" ? "33101" : null,
    agency: def.agency ?? "Every Benefits",
    orgNodeId: "root",
    accountStatus: "active",
    approvalStatus: def.approvalStatus,
    privacy,
    createdAt: now,
    updatedAt: now,
  };
}

function publicProfileDoc(uid, def, now) {
  return {
    uid,
    displayName: def.displayName,
    photoUrl: null,
    role: def.role,
    agency: def.agency ?? "Every Benefits",
    isAnonymous: false,
    discoverableInDirectory: true,
    allowDirectMessages: true,
    updatedAt: now,
  };
}

async function assertAuthUp() {
  try {
    await fetch(`http://${AUTH_HOST}/`, { method: "GET" });
  } catch (err) {
    throw new Error(
      `Auth emulator not reachable at ${AUTH_HOST}. Start with \`pnpm emulators\`.\n${err instanceof Error ? err.message : err}`,
    );
  }
}

async function main() {
  await assertAuthUp();
  const now = new Date();
  const seeded = [];

  for (const def of USERS) {
    const { uid, created } = await ensureAuthUser(def.email, def.displayName);
    await setDoc(`users/${uid}`, profileDoc(uid, def, now));
    await setDoc(`publicProfiles/${uid}`, publicProfileDoc(uid, def, now));
    seeded.push({ uid, email: def.email, role: def.role, created });
    console.log(
      `${created ? "created" : "updated"} ${def.role.padEnd(10)} ${def.email} → ${uid}`,
    );
  }

  console.log(`\nDone. ${seeded.length} users at Auth ${AUTH_HOST} / Firestore ${FIRESTORE_HOST}.`);
  console.log(`Password for all: ${PASSWORD}`);
  const agent = seeded.find((u) => u.email === "agent@pulse.local");
  if (agent) {
    console.log(`Default SEED_USER_UID candidate: ${agent.uid}`);
  }
}

main().catch((error) => {
  console.error(`\nUser seed failed: ${error.message}`);
  process.exit(1);
});
