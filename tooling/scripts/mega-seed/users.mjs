import { config, FIXTURE_USERS, LICENSE_ROLES } from "./config.mjs";
import { commitInBatches, db, log, mapPool } from "./admin.mjs";

const FIRST = [
  "Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Quinn",
  "Avery", "Jamie", "Cameron", "Drew", "Harper", "Reese", "Skyler", "Blake",
  "Dana", "Elliot", "Finley", "Gray", "Hayden", "Indigo", "Jules", "Kai",
];
const LAST = [
  "Rivera", "Chen", "Patel", "Nguyen", "Garcia", "Kim", "Lopez", "Brown",
  "Wilson", "Martinez", "Anderson", "Thomas", "Jackson", "White", "Harris",
  "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
];

function pickRole(i) {
  // Weighted mix for a realistic directory under load.
  const r = i % 100;
  if (r < 2) return "admin";
  if (r < 8) return "manager";
  if (r < 14) return "instructor";
  if (r < 30) return "student";
  return "agent";
}

function pickApproval(i, role) {
  if (role === "admin") return "approved";
  const r = i % 97;
  if (r === 0) return "pending";
  if (r === 1) return "rejected";
  return "approved";
}

function displayNameFor(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
}

async function ensureAuthUser(email, displayName) {
  const authHost = config.authHost;
  const signUp = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: config.password,
        displayName,
        returnSecureToken: true,
      }),
    },
  );
  if (signUp.ok) {
    const body = await signUp.json();
    return { uid: String(body.localId), created: true };
  }
  const errText = await signUp.text();
  const alreadyExists =
    signUp.status === 400 && /EMAIL_EXISTS|email.*exist/i.test(errText);
  if (!alreadyExists) {
    throw new Error(`Auth signUp ${email}: ${signUp.status} ${errText}`);
  }
  const signIn = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: config.password,
        returnSecureToken: true,
      }),
    },
  );
  if (!signIn.ok) {
    throw new Error(
      `Auth signIn ${email}: ${signIn.status} ${await signIn.text()}`,
    );
  }
  const body = await signIn.json();
  return { uid: String(body.localId), created: false };
}

function profileDoc(uid, def, orgNodeId, now) {
  const licensed = LICENSE_ROLES.has(def.role);
  const privacy = {
    discoverableInDirectory: def.approvalStatus === "approved",
    searchableByEmail: true,
    searchableByNpn: licensed,
    showEmailInSearch: true,
    showNpnInSearch: licensed,
    allowDirectMessages: true,
  };
  return {
    uid,
    email: def.email,
    displayName: def.displayName,
    photoUrl: null,
    role: def.role,
    isAnonymous: false,
    profileCompleted: true,
    productTourVersion: 1,
    phoneCountryCode: def.phoneCountryCode ?? (licensed ? "+1" : null),
    phoneNumber:
      def.phoneNumber ??
      (licensed
        ? `555${String(Math.abs(hash(def.email)) % 10_000_000).padStart(7, "0")}`
        : null),
    phoneVerified: licensed,
    npn: def.npn ?? (licensed ? String(10_000_000 + (Math.abs(hash(def.email)) % 89_000_000)) : null),
    address: licensed ? "100 Main St\nMiami, FL 33101" : null,
    addressStreet: licensed ? "100 Main St" : null,
    addressApt: null,
    addressCity: licensed ? "Miami" : null,
    addressState: licensed ? "FL" : null,
    addressZip: licensed ? "33101" : null,
    agency: def.agency ?? "Every Benefits",
    orgNodeId,
    accountStatus: def.approvalStatus === "rejected" ? "suspended" : "active",
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
    discoverableInDirectory: def.approvalStatus === "approved",
    allowDirectMessages: true,
    updatedAt: now,
  };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * @param {{ agencyIds: string[] }} org
 * @returns {Promise<{ users: Array<{uid:string,email:string,role:string,displayName:string,approvalStatus:string}>, byRole: Record<string,string[]>, fixtures: Record<string,string> }>}
 */
export async function seedUsers(org) {
  log("users", `creating ${config.users} Auth+Firestore profiles (profile=${config.profile})`);
  await assertAuthUp();
  await assertFirestoreUp();

  const defs = [];
  for (const fix of FIXTURE_USERS) {
    defs.push({
      ...fix,
      profileCompleted: true,
      npn: LICENSE_ROLES.has(fix.role)
        ? fix.email.startsWith("admin")
          ? "100000001"
          : fix.email.startsWith("manager")
            ? "100000002"
            : fix.email.startsWith("instructor")
              ? "100000003"
              : "12345678"
        : null,
      phoneCountryCode: LICENSE_ROLES.has(fix.role) ? "+1" : null,
      phoneNumber: LICENSE_ROLES.has(fix.role)
        ? fix.email.startsWith("admin")
          ? "5550000001"
          : fix.email.startsWith("manager")
            ? "5550000002"
            : fix.email.startsWith("instructor")
              ? "5550000003"
              : "5551234567"
        : null,
      agency: "Every Benefits",
      orgNodeId: "root",
    });
  }

  const bulkCount = Math.max(0, config.users - FIXTURE_USERS.length);
  for (let i = 0; i < bulkCount; i++) {
    const role = pickRole(i);
    const approvalStatus = pickApproval(i, role);
    const displayName = displayNameFor(i);
    const agencyId = org.agencyIds[i % org.agencyIds.length];
    defs.push({
      email: `user${String(i).padStart(5, "0")}@pulse.local`,
      displayName,
      role,
      approvalStatus,
      profileCompleted: true,
      agency: `Agency ${(i % org.agencyIds.length) + 1}`,
      orgNodeId: agencyId,
      npn: null,
      phoneCountryCode: null,
      phoneNumber: null,
    });
  }

  const now = new Date();
  let authDone = 0;
  const authStarted = Date.now();
  log(
    "users",
    `Auth signUp × ${defs.length} (concurrency=${config.authConcurrency})`,
  );
  const authResults = await mapPool(
    defs,
    config.authConcurrency,
    async (def) => {
      const { uid, created } = await ensureAuthUser(def.email, def.displayName);
      authDone += 1;
      if (authDone === 1 || authDone % 100 === 0 || authDone === defs.length) {
        const secs = ((Date.now() - authStarted) / 1000).toFixed(1);
        log("users", `Auth ${authDone}/${defs.length} (${secs}s)`);
      }
      return { def, uid, created };
    },
  );

  const firestore = db();
  const ops = [];
  const users = [];
  const byRole = {
    admin: [],
    manager: [],
    instructor: [],
    agent: [],
    student: [],
  };
  const fixtures = {};

  for (const { def, uid } of authResults) {
    const orgNodeId = def.orgNodeId ?? "root";
    ops.push({
      type: "set",
      ref: firestore.doc(`users/${uid}`),
      data: profileDoc(uid, def, orgNodeId, now),
    });
    ops.push({
      type: "set",
      ref: firestore.doc(`publicProfiles/${uid}`),
      data: publicProfileDoc(uid, def, now),
    });
    const row = {
      uid,
      email: def.email,
      role: def.role,
      displayName: def.displayName,
      approvalStatus: def.approvalStatus,
    };
    users.push(row);
    if (byRole[def.role]) byRole[def.role].push(uid);
    if (FIXTURE_USERS.some((f) => f.email === def.email)) {
      fixtures[def.email] = uid;
    }
  }

  log("users", `Firestore profile writes × ${ops.length} docs`);
  await commitInBatches(ops);
  log(
    "users",
    `${users.length} profiles · fixtures: ${Object.keys(fixtures).join(", ")}`,
  );
  return { users, byRole, fixtures };
}

async function assertAuthUp() {
  try {
    await fetch(`http://${config.authHost}/`, { method: "GET" });
  } catch (err) {
    throw new Error(
      `Auth emulator not reachable at ${config.authHost}. Start with \`pnpm emulators\`.\n${err instanceof Error ? err.message : err}`,
    );
  }
}

async function assertFirestoreUp() {
  const firestore = db();
  try {
    await Promise.race([
      firestore.collection("orgNodes").limit(1).get(),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Firestore emulator not responding at ${config.firestoreHost} within 5s`,
              ),
            ),
          5_000,
        ),
      ),
    ]);
  } catch (err) {
    throw new Error(
      `Firestore emulator not reachable at ${config.firestoreHost}. Start with \`pnpm emulators\` and wait until it is healthy.\n${err instanceof Error ? err.message : err}`,
    );
  }
}
