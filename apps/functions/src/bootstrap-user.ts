import { FieldValue } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { auth } from "firebase-functions/v1";
import { db } from "./init";

const DEFAULT_AGENCY = "Every Benefits";

/** Anonymous Auth users have no linked providers on the UserRecord. */
function isAnonymousUser(user: UserRecord): boolean {
  return user.providerData.length === 0;
}

/**
 * Create `users/{uid}` as soon as Auth creates the account.
 * Clients still call ensureProfile as a fallback; this covers cases where the
 * client write fails (rules, offline, project-id mismatch) so approvals and
 * gates always see a pending profile.
 *
 * Gen1 Auth triggers only — no Gen2 equivalent yet. That caps this codebase
 * runtime at nodejs20 (nodejs24 is Gen2/Cloud Run only).
 */
export const bootstrapUserProfile = auth.user().onCreate(async (user) => {
  // Mega-seed creates Auth users at *@pulse.local and writes full profiles
  // itself. Skipping the onCreate trigger avoids flooding the Functions +
  // Firestore emulators (10k × multi-second bootstraps).
  if (
    process.env.FUNCTIONS_EMULATOR === "true" &&
    typeof user.email === "string" &&
    user.email.toLowerCase().endsWith("@pulse.local")
  ) {
    return;
  }

  const ref = db.doc(`users/${user.uid}`);
  const existing = await ref.get();
  if (existing.exists) return;

  const isAnonymous = isAnonymousUser(user);
  const email = user.email ?? null;
  const displayName = user.displayName ?? null;
  const payload = {
    uid: user.uid,
    email,
    emailLower: typeof email === "string" ? email.toLowerCase() : null,
    displayName,
    displayNameLower:
      typeof displayName === "string" ? displayName.trim().toLowerCase() || null : null,
    photoUrl: user.photoURL ?? null,
    role: isAnonymous ? "guest" : "student",
    isAnonymous,
    profileCompleted: isAnonymous,
    productTourVersion: 0,
    phoneCountryCode: null,
    phoneNumber: null,
    phoneVerified: false,
    npn: null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: isAnonymous ? null : DEFAULT_AGENCY,
    approvalStatus: isAnonymous ? "approved" : "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    await ref.create(payload);
    const { bumpUserCreated, parseStoredRole } = await import(
      "./platform-stats"
    );
    await bumpUserCreated(
      parseStoredRole(payload.role),
      payload.approvalStatus === "pending",
    );
  } catch (error) {
    // Client ensureProfile won the race — leave their doc alone.
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: unknown }).code
        : undefined;
    if (code === "already-exists" || code === 6) return;
    throw error;
  }
});
