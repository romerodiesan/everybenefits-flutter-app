import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { canParticipateInChats, parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { isUserApprovedForJoin, requireCaller } from "./auth";

export const syncPublicProfile = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    const ref = db.doc(`publicProfiles/${uid}`);
    if (!after?.exists) {
      await ref.delete();
      return;
    }
    const data = after.data() ?? {};
    await ref.set({
      uid,
      displayName:
        typeof data.displayName === "string" ? data.displayName.slice(0, 120) : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
      role: String(data.role ?? "student"),
      agency: typeof data.agency === "string" ? data.agency.slice(0, 120) : null,
      isAnonymous: data.isAnonymous === true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

export const listPublicProfiles = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listPublicProfiles");
  const requestedLimit = Math.round(Number(request.data?.limit ?? 80));
  const max = Math.max(1, Math.min(100, requestedLimit));
  const snap = await db
    .collection("users")
    .where("isAnonymous", "==", false)
    .limit(max + 1)
    .get();
  const profiles = snap.docs
    .filter((profile) => profile.id !== uid)
    .slice(0, max)
    .map((profile) => {
      const data = profile.data();
      return {
        uid: profile.id,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        agency: typeof data.agency === "string" ? data.agency : null,
        isAnonymous: false,
        profileCompleted: data.profileCompleted !== false,
      };
    });
  return { profiles };
});

/**
 * Directory search for chats (name, email, NPN). Returns PII for org members
 * who can participate in chats.
 */
export const searchDirectory = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "searchDirectory");
  const caller = await db.doc(`users/${uid}`).get();
  const callerData = caller.data();
  if (
    !canParticipateInChats(
      parseRole(callerData?.role),
      callerData?.isAnonymous === true,
    )
  ) {
    throw new HttpsError("permission-denied", "Chats not available.");
  }

  const rawQuery = String(request.data?.query ?? "").trim();
  if (rawQuery.length < 2) {
    return { profiles: [] };
  }
  const limit = Math.max(
    1,
    Math.min(40, Math.round(Number(request.data?.limit ?? 40))),
  );
  const q = rawQuery.toLowerCase();
  const npnDigits = rawQuery.replace(/\D/g, "");
  const looksEmail = q.includes("@");
  const looksNpn = npnDigits.length >= 5 && /^\d[\d\s-]*$/.test(rawQuery);

  const matched = new Map<string, Record<string, unknown>>();

  const pushDoc = (doc: {
    id: string;
    data: () => DocumentData;
  }) => {
    if (doc.id === uid || matched.has(doc.id)) return;
    if (matched.size >= limit) return;
    const data = doc.data();
    if (data.isAnonymous === true) return;
    const role = parseRole(data.role);
    if (role === "guest") return;
    if (!isUserApprovedForJoin(data) && String(data.approvalStatus ?? "") === "rejected") {
      return;
    }
    if (!isUserApprovedForJoin(data)) return;
    matched.set(doc.id, data);
  };

  if (looksEmail) {
    const exact = await db
      .collection("users")
      .where("email", "==", q)
      .limit(limit)
      .get();
    exact.docs.forEach(pushDoc);
  }

  if (looksNpn && matched.size < limit) {
    const exact = await db
      .collection("users")
      .where("npn", "==", npnDigits)
      .limit(limit)
      .get();
    exact.docs.forEach(pushDoc);
  }

  if (matched.size < limit) {
    const pool = await db
      .collection("users")
      .where("isAnonymous", "==", false)
      .limit(200)
      .get();
    for (const doc of pool.docs) {
      if (matched.size >= limit) break;
      const data = doc.data();
      const name = String(data.displayName ?? "").toLowerCase();
      const email = String(data.email ?? "").toLowerCase();
      const npn = String(data.npn ?? "").replace(/\D/g, "");
      if (
        name.includes(q) ||
        email.includes(q) ||
        (npnDigits.length >= 2 && npn.includes(npnDigits))
      ) {
        pushDoc(doc);
      }
    }
  }

  const profiles = [...matched.entries()].map(([id, data]) => ({
    uid: id,
    displayName:
      typeof data.displayName === "string" ? data.displayName : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    role: String(data.role ?? "student"),
    agency: typeof data.agency === "string" ? data.agency : null,
    email: typeof data.email === "string" ? data.email : null,
    npn: typeof data.npn === "string" ? data.npn : null,
    isAnonymous: false,
    profileCompleted: data.profileCompleted !== false,
  }));

  return { profiles };
});
