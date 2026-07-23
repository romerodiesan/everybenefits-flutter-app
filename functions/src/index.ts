import * as admin from "firebase-admin";
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
        title: "Agents",
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
      title: current.title ?? "Agents",
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
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    tx.update(targetRef, {
      score: admin.firestore.FieldValue.increment(delta),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

/**
 * Admin-only role assignment.
 * When promoting to agent, joins the default agents RTDB group.
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (role === "agent") {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  return { ok: true, uid: targetUid, role };
});

/**
 * Ensures the caller (agent) is a member of the default agents RTDB chat.
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
  if (String(target.data()?.role ?? "") !== "agent") {
    throw new HttpsError("failed-precondition", "Agents only.");
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});
