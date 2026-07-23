import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp({
  databaseURL: "https://every-insurance-default-rtdb.firebaseio.com",
});
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

const db = admin.firestore();
const rtdb = admin.database();

const DEFAULT_AGENT_GROUP_ID = "agents-default";
const FORUM_ROLES = ["student", "agent", "instructor", "manager", "admin"];
/** Roles that belong in the default staff community chat. */
const DEFAULT_GROUP_ROLES = ["agent", "instructor", "manager", "admin"];

type VoteValue = -1 | 0 | 1;

function parseVote(raw: unknown): VoteValue {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === -1 || n === 0 || n === 1) return n as VoteValue;
  throw new HttpsError("invalid-argument", "vote must be -1, 0, or 1");
}

function headlineName(data: admin.firestore.DocumentData | undefined): string {
  const display =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  if (display) return display;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email) return email;
  return "Usuario";
}

function belongsInDefaultGroup(role: string): boolean {
  return DEFAULT_GROUP_ROLES.includes(role);
}

async function addAgentToDefaultGroup(uid: string, displayName: string) {
  const chatRef = rtdb.ref(`chats/${DEFAULT_AGENT_GROUP_ID}`);
  const now = Date.now();

  await chatRef.transaction((current) => {
    if (current === null) {
      return {
        members: { [uid]: true },
        memberNames: { [uid]: displayName },
        isGroup: true,
        isDefaultAgentGroup: true,
        title: "Team",
        dmKey: null,
        lastMessage: "",
        lastMessageAt: now,
        lastMessageSenderId: null,
        unreadCounts: { [uid]: 0 },
        pinnedBy: {},
        createdAt: now,
        createdBy: "system",
      };
    }

    const members =
      current.members && typeof current.members === "object"
        ? { ...current.members }
        : {};
    if (members[uid] === true) {
      return; // abort — already a member
    }
    members[uid] = true;
    const memberNames =
      current.memberNames && typeof current.memberNames === "object"
        ? { ...current.memberNames, [uid]: displayName }
        : { [uid]: displayName };
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };

    return {
      ...current,
      members,
      memberNames,
      unreadCounts,
      isGroup: true,
      isDefaultAgentGroup: true,
      // Keep existing custom title; migrate legacy "Agents" label.
      title:
        current.title === "Agents" || current.title == null
          ? "Team"
          : current.title,
      createdBy: current.createdBy ?? "system",
    };
  });

  await rtdb.ref(`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`).set({
    lastMessageAt: now,
  });
}

/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
export const castForumVote = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const threadId = String(request.data?.threadId ?? "");
  const replyId =
    request.data?.replyId == null ? null : String(request.data.replyId);
  const next = parseVote(request.data?.vote);

  if (!threadId) {
    throw new HttpsError("invalid-argument", "threadId required");
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data();
  if (!user || user.isAnonymous === true) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  if (!FORUM_ROLES.includes(String(user.role))) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }

  const targetRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}`)
    : db.doc(`threads/${threadId}`);
  const voteRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}/votes/${uid}`)
    : db.doc(`threads/${threadId}/votes/${uid}`);

  await db.runTransaction(async (tx) => {
    const target = await tx.get(targetRef);
    if (!target.exists) {
      throw new HttpsError("not-found", "Target not found.");
    }
    if (target.data()?.authorId === uid) {
      throw new HttpsError("failed-precondition", "Cannot vote on own content.");
    }

    const voteSnap = await tx.get(voteRef);
    const previous = (voteSnap.data()?.value as number | undefined) ?? 0;
    const delta = next - previous;
    if (delta === 0) return;

    if (next === 0) {
      tx.delete(voteRef);
    } else {
      tx.set(
        voteRef,
        {
          value: next,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    tx.update(targetRef, {
      score: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const actorUid = request.auth.uid;
  const targetUid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  const allowed = [
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
  ];
  if (!targetUid || !allowed.includes(role)) {
    throw new HttpsError("invalid-argument", "uid and valid role required");
  }

  const actor = await db.doc(`users/${actorUid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const currentRole = String(target.data()?.role ?? "");
  if (currentRole === "agent" && (role === "student" || role === "guest")) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot downgrade an agent to student or guest.",
    );
  }

  await db.doc(`users/${targetUid}`).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (belongsInDefaultGroup(role)) {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  return { ok: true, uid: targetUid, role };
});

/**
 * Admin-only directory of students awaiting promotion.
 * Uses Admin SDK so the client does not need a fragile users list rule.
 */
export const listStudentsForPromotion = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const actor = await db.doc(`users/${request.auth.uid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .limit(120)
    .get();

  const students = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: "student",
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
      };
    })
    .filter((row) => row.isAnonymous !== true);

  return { students };
});

/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const callerUid = request.auth.uid;
  const targetUid = String(request.data?.uid ?? callerUid);

  const caller = await db.doc(`users/${callerUid}`).get();
  const callerRole = String(caller.data()?.role ?? "");
  if (targetUid !== callerUid && callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admins only for other users.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const targetRole = String(target.data()?.role ?? "");
  if (!belongsInDefaultGroup(targetRole)) {
    throw new HttpsError(
      "failed-precondition",
      "Agents, instructors, managers, and admins only.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});
