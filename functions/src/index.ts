import * as admin from "firebase-admin";
import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  ALL_ROLES,
  FORUM_ROLES,
  GROUP_CREATOR_ROLES,
  GROUP_SEED_ROLES,
  belongsInDefaultAgentGroup,
  canAuthorCourses,
  canConfigureGroupAutoJoin,
  canParticipateInChats,
  parseRole,
  type UserRole,
} from "@pulse/shared";
import {
  ensureThreadParticipant,
  listThreadNotifyTargets,
  markNotificationsRead,
  notifyUser,
} from "./notifications";

admin.initializeApp({
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://every-benefits-us-default-rtdb.firebaseio.com",
});
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
/** Opt-in: set FUNCTIONS_ENFORCE_APP_CHECK=true once Pulse/Studio site keys are live. */
const enforceAppCheck =
  !usingFunctionsEmulator &&
  process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";
const callableOpts = {
  // Emulator Gen2 often drops Access-Control headers on preflight when cors is
  // an allow-list; open it fully locally. Production keeps an explicit list.
  cors: usingFunctionsEmulator
    ? true
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://every-insurance.web.app",
        "https://every-insurance.firebaseapp.com",
        "https://pulse.everybenefits.us",
        "https://studio.everybenefits.us",
        "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
        "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
        ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ],
  // Emulator clients skip App Check. Production stays off until site keys are
  // configured on pulse.everybenefits.us / studio.everybenefits.us, then set
  // FUNCTIONS_ENFORCE_APP_CHECK=true.
  enforceAppCheck,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

const db = admin.firestore();
const rtdb = admin.database();

const DEFAULT_AGENT_GROUP_ID = "agents-default";
/** Synthetic sender for automated support replies; never a real account. */
const SUPPORT_AI_UID = "support-ai";
const MAX_SUPPORT_MESSAGE_CHARS = 2000;
/** Mirrors QUIZ_DEFAULT_PASS_PERCENT / kQuizDefaultPassPercent in the clients. */
const DEFAULT_QUIZ_PASS_PERCENT = 70;
/** Upper bound on option indexes, so a hostile payload can't balloon a set. */
const MAX_QUIZ_OPTIONS = 20;
const MAX_GROUP_MEMBERS = 20;
const MAX_ROLE_SEED_MEMBERS = 200;
const MAX_FUNCTION_CALLS_PER_MINUTE = 30;

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

async function consumeFunctionQuota(uid: string, operation: string) {
  const minute = Math.floor(Date.now() / 60_000);
  const ref = db.doc(`functionUsage/${uid}_${minute}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0);
    if (count >= MAX_FUNCTION_CALLS_PER_MINUTE) {
      throw new HttpsError("resource-exhausted", "Too many requests.");
    }
    tx.set(
      ref,
      {
        uid,
        minute,
        count: count + 1,
        operations: FieldValue.arrayUnion(operation),
        expiresAt: Timestamp.fromMillis((minute + 2) * 60_000),
      },
      { merge: true },
    );
  });
}

async function requireActiveAccount(uid: string): Promise<void> {
  const snap = await db.doc(`users/${uid}`).get();
  const status = String(snap.data()?.accountStatus ?? "active");
  if (status === "deactivated" || status === "pendingDeletion") {
    throw new HttpsError(
      "failed-precondition",
      "Account is deactivated or pending deletion.",
    );
  }
}

async function requireCaller(
  request: { auth?: { uid: string } },
  operation: string,
  options?: { allowInactive?: boolean },
): Promise<string> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await consumeFunctionQuota(uid, operation);
  if (!options?.allowInactive) {
    await requireActiveAccount(uid);
  }
  return uid;
}

function chatInboxRow(
  chatId: string,
  chat: Record<string, unknown>,
  uid: string,
) {
  const members = Object.keys((chat.members ?? {}) as Record<string, unknown>)
    .filter((memberId) => memberId !== SUPPORT_AI_UID);
  const unreadCounts =
    (chat.unreadCounts ?? {}) as Record<string, unknown>;
  const pinnedBy = (chat.pinnedBy ?? {}) as Record<string, unknown>;
  const autoJoinRoles =
    (chat.autoJoinRoles ?? {}) as Record<string, unknown>;
  return {
    chatId,
    memberIds: members,
    memberNames: (chat.memberNames ?? {}) as Record<string, unknown>,
    isGroup: chat.isGroup === true,
    title: chat.title ?? null,
    dmKey: chat.dmKey ?? null,
    lastMessage: String(chat.lastMessage ?? "").slice(0, 4000),
    lastMessageAt: Number(chat.lastMessageAt ?? 0),
    lastMessageSenderId: chat.lastMessageSenderId ?? null,
    unreadCount: Number(unreadCounts[uid] ?? 0),
    pinned: pinnedBy[uid] === true,
    createdAt: Number(chat.createdAt ?? 0),
    createdBy: String(chat.createdBy ?? ""),
    isDefaultAgentGroup: chat.isDefaultAgentGroup === true,
    isSupportChat: chat.isSupportChat === true,
    autoJoinRoles,
  };
}

function isUserApprovedForJoin(data: admin.firestore.DocumentData | undefined) {
  if (!data || data.isAnonymous === true) return false;
  const status = String(data.approvalStatus ?? "approved");
  return status === "approved";
}

async function addMemberToChat(
  chatId: string,
  uid: string,
  displayName: string,
) {
  const chatRef = rtdb.ref(`chats/${chatId}`);
  let joinedChat: Record<string, unknown> | null = null;
  await chatRef.transaction((current) => {
    if (current === null || typeof current !== "object") {
      return; // abort — chat gone
    }
    const members =
      current.members && typeof current.members === "object"
        ? { ...current.members }
        : {};
    if (members[uid] === true) {
      joinedChat = current as Record<string, unknown>;
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
    joinedChat = {
      ...current,
      members,
      memberCount: Object.keys(members).length,
      memberNames,
      unreadCounts,
    };
    return joinedChat;
  });
  if (!joinedChat) {
    const snap = await chatRef.get();
    joinedChat = (snap.val() as Record<string, unknown> | null) ?? null;
  }
  if (joinedChat?.members &&
      (joinedChat.members as Record<string, unknown>)[uid] === true) {
    await rtdb
      .ref(`userChats/${uid}/${chatId}`)
      .set(chatInboxRow(chatId, joinedChat, uid));
  }
}

async function ensureAutoJoinMemberships(
  uid: string,
  role: UserRole,
  approvalStatus: string,
  displayName: string,
  isAnonymous: boolean,
) {
  if (isAnonymous || role === "guest") return;
  if (approvalStatus !== "approved") return;
  const indexSnap = await rtdb.ref(`autoJoinGroups/${role}`).get();
  const chatIds = Object.keys(
    (indexSnap.val() ?? {}) as Record<string, unknown>,
  ).filter((chatId) => chatId && chatId !== DEFAULT_AGENT_GROUP_ID);
  await Promise.all(
    chatIds.map((chatId) => addMemberToChat(chatId, uid, displayName)),
  );
}

async function collectUsersByRoles(
  roles: UserRole[],
  cap: number,
): Promise<Map<string, admin.firestore.DocumentData>> {
  const byUid = new Map<string, admin.firestore.DocumentData>();
  if (!roles.length) return byUid;
  // Query per role (avoids composite index); filter approval in memory.
  await Promise.all(
    roles.map(async (role) => {
      const snap = await db
        .collection("users")
        .where("role", "==", role)
        .limit(cap)
        .get();
      for (const doc of snap.docs) {
        if (byUid.size >= cap) break;
        const data = doc.data();
        if (!isUserApprovedForJoin(data)) continue;
        if (parseRole(data.role) === "guest") continue;
        byUid.set(doc.id, data);
      }
    }),
  );
  return byUid;
}

async function addAgentToDefaultGroup(uid: string, displayName: string) {
  const chatRef = rtdb.ref(`chats/${DEFAULT_AGENT_GROUP_ID}`);
  const now = Date.now();

  await chatRef.transaction((current) => {
    if (current === null) {
      return {
        members: { [uid]: true },
        memberCount: 1,
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
      memberCount: Object.keys(members).length,
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

/** Join auto-join groups when role or approvalStatus changes. */
export const syncUserAutoJoinGroups = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists) return;
    const beforeData = before?.exists ? before.data() : undefined;
    const afterData = after.data() ?? {};
    const beforeRole = beforeData ? parseRole(beforeData.role) : null;
    const afterRole = parseRole(afterData.role);
    const beforeApproval = String(beforeData?.approvalStatus ?? "approved");
    const afterApproval = String(afterData.approvalStatus ?? "approved");
    if (
      before?.exists &&
      beforeRole === afterRole &&
      beforeApproval === afterApproval
    ) {
      return;
    }
    await ensureAutoJoinMemberships(
      uid,
      afterRole,
      afterApproval,
      headlineName(afterData),
      afterData.isAnonymous === true,
    );
  },
);

export const syncChatInbox = onValueWritten(
  { ref: "/chats/{chatId}", region: "us-central1" },
  async (event) => {
    const chatId = event.params.chatId;
    const before = (event.data.before.val() ?? {}) as Record<string, unknown>;
    const after = (event.data.after.val() ?? {}) as Record<string, unknown>;
    const beforeMembers = Object.keys(
      (before.members ?? {}) as Record<string, unknown>,
    );
    const members = Object.keys((after.members ?? {}) as Record<string, unknown>)
      .filter((uid) => uid !== SUPPORT_AI_UID);
    const removed = beforeMembers.filter(
      (uid) => uid !== SUPPORT_AI_UID && !members.includes(uid),
    );
    const updates: Record<string, unknown> = {};

    for (const uid of removed) updates[`userChats/${uid}/${chatId}`] = null;
    if (event.data.after.exists()) {
      for (const uid of members) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, after, uid);
      }
    }
    if (Object.keys(updates).length) await rtdb.ref().update(updates);

    // Push + inbox when a new message bumps unread for recipients.
    const beforeAt = Number(before.lastMessageAt ?? 0);
    const afterAt = Number(after.lastMessageAt ?? 0);
    const senderId = String(after.lastMessageSenderId ?? "");
    if (!event.data.after.exists() || afterAt <= beforeAt || !senderId) {
      return;
    }
    const preview = String(after.lastMessage ?? "").slice(0, 120);
    const isSupport = after.isSupportChat === true;
    const beforeUnread =
      (before.unreadCounts ?? {}) as Record<string, unknown>;
    const afterUnread =
      (after.unreadCounts ?? {}) as Record<string, unknown>;
    const memberNames =
      (after.memberNames ?? {}) as Record<string, unknown>;
    const senderName = String(memberNames[senderId] ?? "").trim() || "Someone";

    await Promise.all(
      members.map(async (uid) => {
        if (uid === senderId) return;
        const prev = Number(beforeUnread[uid] ?? 0);
        const next = Number(afterUnread[uid] ?? 0);
        if (next <= prev) return;
        await notifyUser(
          uid,
          {
            type: isSupport ? "support_message" : "chat_message",
            title: isSupport ? "Support" : "New message",
            body: preview || "You have a new message",
            href: `/chats/${chatId}`,
            deepLink: `pulse://chats/${chatId}`,
            ref: { chatId },
            actorId: senderId,
            actorName: senderName,
          },
          { chatIdForDebounce: chatId },
        );
      }),
    );
  },
);

export const rebuildChatInbox = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "rebuildChatInbox");
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  await Promise.all(
    chatIds.slice(0, 100).map(async (chatId) => {
      const chat = await rtdb.ref(`chats/${chatId}`).get();
      const value = chat.val() as Record<string, unknown> | null;
      if (value?.members &&
          (value.members as Record<string, unknown>)[uid] === true) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, value, uid);
      }
    }),
  );
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
  return { ok: true };
});

export const createGroupChat = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "createGroupChat");
  const title = String(request.data?.title ?? "").trim();
  const requested = Array.isArray(request.data?.memberIds)
    ? request.data.memberIds.map(String)
    : [];
  const rawSeedRoles = Array.isArray(request.data?.seedRoles)
    ? request.data.seedRoles.map(String)
    : [];
  const wantAutoJoin = request.data?.autoJoin === true;

  const seedRoles = [
    ...new Set(
      rawSeedRoles
        .map((role: string) => parseRole(role))
        .filter((role: UserRole) =>
          (GROUP_SEED_ROLES as readonly string[]).includes(role),
        ),
    ),
  ] as UserRole[];

  if (!title || title.length > 120) {
    throw new HttpsError("invalid-argument", "Valid group title required.");
  }

  const creator = await db.doc(`users/${uid}`).get();
  const creatorRole = parseRole(creator.data()?.role);
  if (!(GROUP_CREATOR_ROLES as readonly string[]).includes(creatorRole)) {
    throw new HttpsError("permission-denied", "Not allowed to create groups.");
  }

  const persistAutoJoin =
    wantAutoJoin &&
    seedRoles.length > 0 &&
    canConfigureGroupAutoJoin(creatorRole);
  if (wantAutoJoin && seedRoles.length > 0 && !persistAutoJoin) {
    throw new HttpsError(
      "permission-denied",
      "Only admins and managers can enable auto-join.",
    );
  }

  const explicitIds = [...new Set([uid, ...requested])]
    .filter((id) => id && id !== SUPPORT_AI_UID);

  const roleUsers = await collectUsersByRoles(seedRoles, MAX_ROLE_SEED_MEMBERS);
  const truncated =
    seedRoles.length > 0 && roleUsers.size >= MAX_ROLE_SEED_MEMBERS;

  const memberIdSet = new Set<string>(explicitIds);
  for (const memberId of roleUsers.keys()) {
    if (memberIdSet.size >= MAX_ROLE_SEED_MEMBERS) {
      break;
    }
    memberIdSet.add(memberId);
  }
  const memberIds = [...memberIdSet];

  const maxAllowed =
    seedRoles.length > 0 ? MAX_ROLE_SEED_MEMBERS : MAX_GROUP_MEMBERS;
  if (memberIds.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Group must include the creator and at least one other member or matching role.",
    );
  }
  if (memberIds.length > maxAllowed) {
    throw new HttpsError(
      "invalid-argument",
      `Group cannot exceed ${maxAllowed} members.`,
    );
  }

  // Fetch any explicit members not already loaded via role query.
  const missing = memberIds.filter((id) => !roleUsers.has(id));
  const fetched =
    missing.length > 0
      ? await db.getAll(...missing.map((id) => db.doc(`users/${id}`)))
      : [];
  if (fetched.some((profile) => !profile.exists)) {
    throw new HttpsError("failed-precondition", "Unknown group member.");
  }
  for (const profile of fetched) {
    roleUsers.set(profile.id, profile.data() ?? {});
  }

  const memberNames = Object.fromEntries(
    memberIds.map((id) => [id, headlineName(roleUsers.get(id))]),
  );
  const autoJoinRolesMap = persistAutoJoin
    ? Object.fromEntries(seedRoles.map((role) => [role, true]))
    : {};

  const now = Date.now();
  const chatRef = rtdb.ref("chats").push();
  const chatId = chatRef.key!;
  const chat = {
    members: Object.fromEntries(memberIds.map((id) => [id, true])),
    memberCount: memberIds.length,
    memberNames,
    isGroup: true,
    title,
    dmKey: null,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt: now,
    createdBy: uid,
    isDefaultAgentGroup: false,
    isSupportChat: false,
    autoJoinRoles: autoJoinRolesMap,
  };

  const updates: Record<string, unknown> = {
    [`chats/${chatId}`]: chat,
  };
  for (const memberId of memberIds) {
    updates[`userChats/${memberId}/${chatId}`] = chatInboxRow(
      chatId,
      chat,
      memberId,
    );
  }
  if (persistAutoJoin) {
    for (const role of seedRoles) {
      updates[`autoJoinGroups/${role}/${chatId}`] = true;
    }
  }
  await rtdb.ref().update(updates);
  return {
    chatId,
    createdAt: now,
    memberCount: memberIds.length,
    truncated,
    autoJoinRoles: persistAutoJoin ? seedRoles : [],
  };
});

export const enrollInCourse = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "enrollInCourse");
  const courseId = String(request.data?.courseId ?? "");
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");

  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data();
  if (!user || user.isAnonymous === true || user.role === "guest") {
    throw new HttpsError("permission-denied", "Sign in required.");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const [course, enrollment] = await Promise.all([
      tx.get(courseRef),
      tx.get(enrollmentRef),
    ]);
    if (!course.exists || course.data()?.status !== "published") {
      throw new HttpsError("not-found", "Published course not found.");
    }
    if (enrollment.exists) return;
    tx.set(enrollmentRef, {
      courseId,
      completedLessonIds: [],
      lastLessonId: null,
      lastPositionSeconds: 0,
      quizAttempts: {},
      enrolledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });
    tx.update(courseRef, {
      studentCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const saveCourseProgress = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "saveCourseProgress");
  const courseId = String(request.data?.courseId ?? "");
  const lessonId = String(request.data?.lessonId ?? "");
  const positionSeconds = Math.max(
    0,
    Math.min(86_400, Math.round(Number(request.data?.positionSeconds ?? 0))),
  );
  const completed = request.data?.completed === true;
  if (!courseId || !lessonId || !Number.isFinite(positionSeconds)) {
    throw new HttpsError("invalid-argument", "Invalid course progress.");
  }
  const courseRef = db.doc(`courses/${courseId}`);
  const lessonRef = courseRef.collection("lessons").doc(lessonId);
  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const [course, lesson, enrollment] = await Promise.all([
      tx.get(courseRef),
      tx.get(lessonRef),
      tx.get(enrollmentRef),
    ]);
    if (!course.exists || !lesson.exists || !enrollment.exists) {
      throw new HttpsError("failed-precondition", "Enrollment or lesson missing.");
    }
    if (completed && lesson.data()?.type === "quiz") {
      throw new HttpsError("failed-precondition", "Submit quizzes for grading.");
    }
    const data = enrollment.data() ?? {};
    const completedLessonIds = Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.map(String)
      : [];
    if (completed && !completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId);
    }
    const lessonCount = Number(course.data()?.lessonCount ?? 0);
    const allDone =
      lessonCount > 0 && completedLessonIds.length >= lessonCount;
    tx.set(
      enrollmentRef,
      {
        completedLessonIds,
        lastLessonId: lessonId,
        lastPositionSeconds: positionSeconds,
        completedAt: allDone
          ? (data.completedAt ?? FieldValue.serverTimestamp())
          : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  return { ok: true };
});

/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
export const castForumVote = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "castForumVote");
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
  if (!(FORUM_ROLES as readonly string[]).includes(String(user.role))) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }

  const targetRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}`)
    : db.doc(`threads/${threadId}`);
  const voteRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}/votes/${uid}`)
    : db.doc(`threads/${threadId}/votes/${uid}`);
  const inboxVoteRef = db.doc(
    `users/${uid}/forumVotes/${replyId ? `${threadId}_${replyId}` : threadId}`,
  );

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
      tx.delete(inboxVoteRef);
    } else {
      tx.set(
        voteRef,
        {
          value: next,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(inboxVoteRef, {
        threadId,
        replyId,
        value: next,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(targetRef, {
      score: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Notify content author on upvote (not clear / downvote). Never fail the
  // vote itself if the inbox/push side effect errors.
  if (next === 1) {
    try {
      const target = await (
        replyId
          ? db.doc(`threads/${threadId}/replies/${replyId}`)
          : db.doc(`threads/${threadId}`)
      ).get();
      const authorId = String(target.data()?.authorId ?? "");
      if (authorId && authorId !== uid) {
        const voterName = headlineName(user);
        await notifyUser(authorId, {
          type: "forum_vote",
          title: "New upvote",
          body: `${voterName} upvoted your ${replyId ? "reply" : "question"}`,
          href: `/home/${threadId}`,
          deepLink: `pulse://forums/${threadId}`,
          ref: { threadId, ...(replyId ? { replyId } : {}) },
          actorId: uid,
          actorName: voterName,
        });
      }
    } catch (error) {
      console.error("castForumVote notify failed", error);
    }
  }

  return { ok: true };
});

export const addForumReply = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "addForumReply");
  const threadId = String(request.data?.threadId ?? "");
  const body = String(request.data?.body ?? "").trim();
  if (!threadId || !body || body.length > 20_000) {
    throw new HttpsError("invalid-argument", "Valid reply required.");
  }
  const [user, thread] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`threads/${threadId}`).get(),
  ]);
  const profile = user.data();
  if (
    !thread.exists ||
    !profile ||
    profile.isAnonymous === true ||
    !(FORUM_ROLES as readonly string[]).includes(String(profile.role))
  ) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  const replyRef = db.collection(`threads/${threadId}/replies`).doc();
  const batch = db.batch();
  batch.set(replyRef, {
    body,
    authorId: uid,
    authorName: headlineName(profile),
    authorPhotoUrl:
      typeof profile.photoUrl === "string" ? profile.photoUrl : null,
    authorRole: String(profile.role),
    score: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(thread.ref, {
    replyCount: FieldValue.increment(1),
    lastReplyAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await ensureThreadParticipant(threadId, uid);
  const authorId = String(thread.data()?.authorId ?? "");
  if (authorId && authorId !== uid) {
    await ensureThreadParticipant(threadId, authorId);
  }
  const targets = await listThreadNotifyTargets(threadId, uid);
  const actorName = headlineName(profile);
  await Promise.all(
    targets.map((targetUid) =>
      notifyUser(targetUid, {
        type: "forum_reply",
        title: "New reply",
        body: `${actorName}: ${body.slice(0, 100)}`,
        href: `/home/${threadId}`,
        deepLink: `pulse://forums/${threadId}`,
        ref: { threadId, replyId: replyRef.id },
        actorId: uid,
        actorName: actorName,
      }),
    ),
  );

  return { replyId: replyRef.id };
});

export const deleteForumReply = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deleteForumReply");
  const threadId = String(request.data?.threadId ?? "");
  const replyId = String(request.data?.replyId ?? "");
  const threadRef = db.doc(`threads/${threadId}`);
  const replyRef = db.doc(`threads/${threadId}/replies/${replyId}`);
  const [actor, thread, reply] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    threadRef.get(),
    replyRef.get(),
  ]);
  if (!thread.exists || !reply.exists) {
    throw new HttpsError("not-found", "Reply not found.");
  }
  if (parseRole(actor.data()?.role) !== "admin" && reply.data()?.authorId !== uid) {
    throw new HttpsError("permission-denied", "Not allowed to delete this reply.");
  }
  const remaining = await db
    .collection(`threads/${threadId}/replies`)
    .orderBy("createdAt", "desc")
    .limit(2)
    .get();
  const latest = remaining.docs.find((doc) => doc.id !== replyId);
  const replyVotes = await replyRef.collection("votes").get();
  const batch = db.batch();
  for (const vote of replyVotes.docs) batch.delete(vote.ref);
  batch.delete(replyRef);
  batch.update(threadRef, {
    replyCount: FieldValue.increment(-1),
    lastReplyAt:
      latest?.get("createdAt") ?? thread.get("createdAt") ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(thread.get("acceptedReplyId") === replyId
      ? { acceptedReplyId: null }
      : {}),
  });
  await batch.commit();
  return { ok: true };
});

export const deleteForumThread = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deleteForumThread");
  const threadId = String(request.data?.threadId ?? "");
  if (!threadId) {
    throw new HttpsError("invalid-argument", "threadId required");
  }
  const threadRef = db.doc(`threads/${threadId}`);
  const [actor, thread] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    threadRef.get(),
  ]);
  if (!thread.exists) {
    throw new HttpsError("not-found", "Thread not found.");
  }
  const isAdmin = parseRole(actor.data()?.role) === "admin";
  if (!isAdmin && thread.data()?.authorId !== uid) {
    throw new HttpsError("permission-denied", "Not allowed to delete this thread.");
  }

  const [repliesSnap, threadVotesSnap, participantsSnap] = await Promise.all([
    threadRef.collection("replies").get(),
    threadRef.collection("votes").get(),
    threadRef.collection("participants").get(),
  ]);

  // Firestore batches cap at 500 ops; chunk if a thread is unusually large.
  const refsToDelete: DocumentReference[] = [];
  for (const reply of repliesSnap.docs) {
    const voteSnap = await reply.ref.collection("votes").get();
    for (const vote of voteSnap.docs) refsToDelete.push(vote.ref);
    refsToDelete.push(reply.ref);
  }
  for (const vote of threadVotesSnap.docs) refsToDelete.push(vote.ref);
  for (const participant of participantsSnap.docs) {
    refsToDelete.push(participant.ref);
  }
  refsToDelete.push(threadRef);

  for (let i = 0; i < refsToDelete.length; i += 450) {
    const batch = db.batch();
    for (const ref of refsToDelete.slice(i, i + 450)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
  return { ok: true };
});

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserRole");
  const targetUid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  if (!targetUid || !(ALL_ROLES as readonly string[]).includes(role)) {
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

  if (belongsInDefaultAgentGroup(parseRole(role))) {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  const approvalStatus = String(target.data()?.approvalStatus ?? "approved");
  await ensureAutoJoinMemberships(
    targetUid,
    parseRole(role),
    approvalStatus,
    headlineName({ ...target.data(), role }),
    target.data()?.isAnonymous === true,
  );

  return { ok: true, uid: targetUid, role };
});

/**
 * Admin or manager: approve / reject newly registered accounts.
 * Legacy users without approvalStatus are already treated as approved.
 */
export const setUserApproval = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserApproval");
  const targetUid = String(request.data?.uid ?? "");
  const status = String(request.data?.status ?? "");
  if (!targetUid || (status !== "approved" && status !== "rejected")) {
    throw new HttpsError("invalid-argument", "uid and status required");
  }
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  await db.doc(`users/${targetUid}`).update({
    approvalStatus: status,
    approvedBy: actorUid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (status === "approved") {
    const data = target.data();
    await ensureAutoJoinMemberships(
      targetUid,
      parseRole(data?.role),
      "approved",
      headlineName(data),
      data?.isAnonymous === true,
    );
  }
  return { ok: true, uid: targetUid, status };
});

/** Admin/manager directory of users awaiting approval. */
export const listPendingApprovals = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listPendingApprovals");
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const snap = await db
    .collection("users")
    .where("approvalStatus", "==", "pending")
    .limit(100)
    .get();
  const users = snap.docs
    .filter((doc) => doc.id !== actorUid && doc.data()?.isAnonymous !== true)
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        profileCompleted: data.profileCompleted !== false,
        agency: typeof data.agency === "string" ? data.agency : null,
        approvalStatus: "pending",
      };
    });
  return { users };
});

/**
 * Admin-only directory of students awaiting promotion.
 * Uses Admin SDK so the client does not need a fragile users list rule.
 */
export const listStudentsForPromotion = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listStudentsForPromotion");

  const actor = await db.doc(`users/${actorUid}`).get();
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
    data: () => admin.firestore.DocumentData;
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
    // Allow pending for search so admins can still DM? Plan says approved.
    // Stick to approved (legacy missing = approved).
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
    // Prefix range on displayName (case-sensitive Firestore limitation —
    // also scan a pool and filter case-insensitively).
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

/** Normalizes a submitted answer into a sorted, deduped list of option indexes. */
function parseSelectedOptions(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const indexes = new Set<number>();
  for (const entry of list) {
    const n = typeof entry === "number" ? entry : Number(entry);
    if (Number.isInteger(n) && n >= 0 && n < MAX_QUIZ_OPTIONS) {
      indexes.add(n);
    }
  }
  return [...indexes].sort((a, b) => a - b);
}

function sameOptionSet(expected: number[], given: number[]): boolean {
  if (expected.length !== given.length) return false;
  return expected.every((value, index) => value === given[index]);
}

/**
 * Grades a quiz lesson server-side.
 *
 * The answer key lives in `courses/{id}/lessons/{id}/secure/answerKey`, which
 * learners cannot read, and this callable is the only writer of
 * `quizAttempts` / quiz completion on an enrollment.
 */
export const submitQuizAttempt = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "submitQuizAttempt");
  const courseId = String(request.data?.courseId ?? "");
  const lessonId = String(request.data?.lessonId ?? "");
  const rawAnswers = request.data?.answers;

  if (!courseId || !lessonId) {
    throw new HttpsError("invalid-argument", "courseId and lessonId required");
  }
  if (typeof rawAnswers !== "object" || rawAnswers === null) {
    throw new HttpsError("invalid-argument", "answers must be an object");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const lessonRef = courseRef.collection("lessons").doc(lessonId);
  const [courseSnap, lessonSnap, keySnap] = await Promise.all([
    courseRef.get(),
    lessonRef.get(),
    lessonRef.collection("secure").doc("answerKey").get(),
  ]);

  if (!courseSnap.exists || !lessonSnap.exists) {
    throw new HttpsError("not-found", "Lesson not found.");
  }

  const course = courseSnap.data() ?? {};
  const lesson = lessonSnap.data() ?? {};
  if (lesson.type !== "quiz") {
    throw new HttpsError("failed-precondition", "Lesson is not a quiz.");
  }

  // Drafts are only answerable by their author or an admin (Studio preview).
  if (course.status !== "published") {
    const actor = await db.doc(`users/${uid}`).get();
    const role = parseRole(actor.data()?.role);
    const owns = String(course.createdBy ?? "") === uid;
    if (role !== "admin" && !(owns && canAuthorCourses(role))) {
      throw new HttpsError("permission-denied", "Course is not published.");
    }
  }

  const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
  if (questions.length === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no questions.");
  }
  const key = keySnap.exists
    ? ((keySnap.data()?.answers ?? {}) as Record<string, unknown>)
    : {};
  if (Object.keys(key).length === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no answer key.");
  }

  const correctByQuestion: Record<string, boolean> = {};
  for (const raw of questions) {
    if (typeof raw !== "object" || raw === null) continue;
    const question = raw as Record<string, unknown>;
    const questionId = String(question.id ?? "");
    if (!questionId) continue;
    const expected = parseSelectedOptions(key[questionId]);
    const given = parseSelectedOptions(
      (rawAnswers as Record<string, unknown>)[questionId],
    );
    correctByQuestion[questionId] =
      expected.length > 0 && sameOptionSet(expected, given);
  }

  const total = Object.keys(correctByQuestion).length;
  if (total === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no gradable questions.");
  }
  const correct = Object.values(correctByQuestion).filter(Boolean).length;
  const score = Math.round((correct / total) * 100);
  const rawPass = Number(lesson.passPercent);
  const passPercent = Number.isFinite(rawPass)
    ? Math.min(100, Math.max(0, Math.round(rawPass)))
    : DEFAULT_QUIZ_PASS_PERCENT;
  const passed = score >= passPercent;

  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(enrollmentRef);
    if (!snap.exists) {
      throw new HttpsError("failed-precondition", "Enroll in the course first.");
    }
    const data = snap.data() ?? {};
    const completed: string[] = Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.map(String)
      : [];
    if (passed && !completed.includes(lessonId)) {
      completed.push(lessonId);
    }
    const lessonCount = Number(course.lessonCount ?? 0);
    const allDone = lessonCount > 0 && completed.length >= lessonCount;

    tx.set(
      enrollmentRef,
      {
        completedLessonIds: completed,
        lastLessonId: lessonId,
        // Nested map + merge keeps attempts for the other lessons intact.
        quizAttempts: {
          [lessonId]: {
            score,
            passed,
            at: FieldValue.serverTimestamp(),
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: allDone
          ? (data.completedAt ?? FieldValue.serverTimestamp())
          : null,
      },
      { merge: true },
    );
  });

  return { score, passed, passPercent, correctByQuestion };
});

/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(callableOpts, async (request) => {
  const callerUid = await requireCaller(request, "ensureDefaultAgentGroup");
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
  if (!belongsInDefaultAgentGroup(parseRole(targetRole))) {
    throw new HttpsError(
      "failed-precondition",
      "Agents, instructors, managers, and admins only.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});

/**
 * Writes an automated reply from the support bot.
 *
 * RTDB rules deny clients any write whose `senderId` is not their own uid, so
 * this callable is the only path that can post as `support-ai`. A caller may
 * only trigger it inside their own support thread.
 */
export const postSupportAiMessage = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "postSupportAiMessage");
  const chatId = String(request.data?.chatId ?? "");
  const body = String(request.data?.body ?? "").trim();
  const senderName = "Pulse Support";

  if (chatId !== `support_${uid}`) {
    throw new HttpsError("permission-denied", "Not your support chat.");
  }
  if (!body) {
    throw new HttpsError("invalid-argument", "Message body is required.");
  }
  if (body.length > MAX_SUPPORT_MESSAGE_CHARS) {
    throw new HttpsError("invalid-argument", "Message is too long.");
  }

  const chatRef = rtdb.ref(`chats/${chatId}`);
  const chatSnap = await chatRef.get();
  const chat = chatSnap.val();
  if (!chat || chat.isSupportChat !== true) {
    throw new HttpsError("not-found", "Support chat not found.");
  }
  if (chat.members?.[uid] !== true) {
    throw new HttpsError("permission-denied", "Not a member of this chat.");
  }

  const now = Date.now();
  const messageRef = rtdb.ref(`messages/${chatId}`).push();
  await messageRef.set({
    body,
    senderId: SUPPORT_AI_UID,
    senderName: senderName || "Support",
    createdAt: now,
    sharedPost: null,
    isAi: true,
  });

  const unreadCounts: Record<string, number> = {
    ...(chat.unreadCounts ?? {}),
  };
  for (const memberId of Object.keys(chat.members ?? {})) {
    unreadCounts[memberId] =
      memberId === SUPPORT_AI_UID ? 0 : (unreadCounts[memberId] ?? 0) + 1;
  }

  await rtdb.ref().update({
    [`chats/${chatId}/lastMessage`]: body,
    [`chats/${chatId}/lastMessageAt`]: now,
    [`chats/${chatId}/lastMessageSenderId`]: SUPPORT_AI_UID,
    [`chats/${chatId}/unreadCounts`]: unreadCounts,
    [`chats/${chatId}/memberNames/${SUPPORT_AI_UID}`]: senderName || "Support",
    [`userChats/${uid}/${chatId}/lastMessageAt`]: now,
  });

  return { id: messageRef.key, createdAt: now };
});

export const markNotificationRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markNotificationRead");
  const ids = Array.isArray(request.data?.notificationIds)
    ? request.data.notificationIds.map(String).filter(Boolean)
    : [];
  const notificationId = String(request.data?.notificationId ?? "");
  const all = ids.length
    ? ids
    : notificationId
      ? [notificationId]
      : [];
  if (!all.length) {
    throw new HttpsError("invalid-argument", "notificationId required");
  }
  return markNotificationsRead(uid, all);
});

export const markAllNotificationsRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markAllNotificationsRead");
  return markNotificationsRead(uid, "all");
});

/** When a course flips to published, notify enrolled learners. */
export const onCoursePublished = onDocumentWritten(
  { document: "courses/{courseId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || after.status !== "published") return;
    if (before?.status === "published") return;
    const courseId = event.params.courseId;
    const title = String(after.title ?? "Course");
    const enrollments = await db
      .collectionGroup("enrollments")
      .where("courseId", "==", courseId)
      .limit(200)
      .get();

    const uids = new Set<string>();
    for (const doc of enrollments.docs) {
      const parent = doc.ref.parent.parent;
      if (parent) uids.add(parent.id);
    }

    await Promise.all(
      [...uids].map((uid) =>
        notifyUser(uid, {
          type: "course_published",
          title: "Course published",
          body: title.slice(0, 120),
          href: `/academy/${courseId}`,
          deepLink: `pulse://academy/${courseId}`,
          ref: { courseId },
        }),
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Account lifecycle
//
// Deactivation is user-reversible (sign in again and reactivate). Deletion
// starts a 90-day grace period: shared content is anonymized immediately,
// personal data is purged by the daily cron once the grace period ends.
// ---------------------------------------------------------------------------

const ACCOUNT_DELETION_GRACE_DAYS = 90;

async function clearFcmTokens(uid: string): Promise<void> {
  const tokens = await db.collection(`users/${uid}/fcmTokens`).limit(50).get();
  await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
}

/** Sequential anonimo1 / anonimo2 / … labels, allocated transactionally. */
async function nextAnonymousLabel(): Promise<string> {
  const ref = db.doc("system/anonCounter");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0) + 1;
    tx.set(ref, { count }, { merge: true });
    return `anonimo${count}`;
  });
}

/** Rewrites author identity on the user's forum threads and replies. */
async function renameForumContent(
  uid: string,
  authorName: string,
  authorPhotoUrl: string | null,
): Promise<void> {
  const [threads, replies] = await Promise.all([
    db.collection("threads").where("authorId", "==", uid).limit(500).get(),
    db.collectionGroup("replies").where("authorId", "==", uid).limit(500).get(),
  ]);
  const docs = [...threads.docs, ...replies.docs];
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) {
      batch.update(doc.ref, { authorName, authorPhotoUrl });
    }
    await batch.commit();
  }
}

/** Rewrites the user's display name inside their RTDB chats. */
async function renameChatMemberships(
  uid: string,
  name: string,
): Promise<void> {
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  for (const chatId of chatIds.slice(0, 200)) {
    updates[`chats/${chatId}/memberNames/${uid}`] = name;
  }
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
}

export const deactivateAccount = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deactivateAccount", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus === "pendingDeletion") {
    throw new HttpsError("failed-precondition", "Deletion already requested.");
  }
  await userRef.update({
    accountStatus: "deactivated",
    deactivatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await clearFcmTokens(uid);
  return { ok: true };
});

export const reactivateAccount = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "reactivateAccount", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus !== "deactivated") {
    throw new HttpsError("failed-precondition", "Account is not deactivated.");
  }
  await userRef.update({
    accountStatus: "active",
    deactivatedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const requestAccountDeletion = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "requestAccountDeletion", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const data = snap.data() ?? {};
  if (data.accountStatus === "pendingDeletion") {
    throw new HttpsError("failed-precondition", "Deletion already requested.");
  }

  const label = await nextAnonymousLabel();
  const scheduledMs =
    Date.now() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

  // Snapshot the identity so a cancel inside the grace period can restore it.
  await userRef.update({
    accountStatus: "pendingDeletion",
    deletionRequestedAt: FieldValue.serverTimestamp(),
    deletionScheduledAt: Timestamp.fromMillis(scheduledMs),
    anonymousLabel: label,
    deletionSnapshot: {
      displayName: typeof data.displayName === "string" ? data.displayName : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    },
    displayName: label,
    photoUrl: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Shared content stays but under the anonymous identity, effective now.
  await renameForumContent(uid, label, null);
  await renameChatMemberships(uid, label);
  await clearFcmTokens(uid);

  return { deletionScheduledAt: scheduledMs };
});

export const cancelAccountDeletion = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "cancelAccountDeletion", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const data = snap.data() ?? {};
  if (data.accountStatus !== "pendingDeletion") {
    throw new HttpsError("failed-precondition", "No pending deletion.");
  }

  const snapshot = (data.deletionSnapshot ?? {}) as Record<string, unknown>;
  const displayName =
    typeof snapshot.displayName === "string" ? snapshot.displayName : null;
  const photoUrl =
    typeof snapshot.photoUrl === "string" ? snapshot.photoUrl : null;

  await userRef.update({
    accountStatus: "active",
    deletionRequestedAt: FieldValue.delete(),
    deletionScheduledAt: FieldValue.delete(),
    anonymousLabel: FieldValue.delete(),
    deletionSnapshot: FieldValue.delete(),
    displayName,
    photoUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await renameForumContent(uid, displayName ?? "Usuario", photoUrl);
  await renameChatMemberships(uid, displayName ?? "Usuario");

  return { ok: true };
});

/**
 * Daily purge of accounts whose 90-day grace period expired. Removes personal
 * data (profile + subcollections, avatar, chat index, Auth user); forum and
 * chat content stays under the anonymous label assigned at request time.
 */
export const purgeDeletedAccounts = onSchedule("every 24 hours", async () => {
  const pending = await db
    .collection("users")
    .where("accountStatus", "==", "pendingDeletion")
    .limit(100)
    .get();
  const now = Date.now();
  const due = pending.docs.filter((doc) => {
    const scheduled = doc.data().deletionScheduledAt;
    const ms =
      scheduled instanceof Timestamp
        ? scheduled.toMillis()
        : Number(scheduled ?? Number.POSITIVE_INFINITY);
    return ms <= now;
  });

  for (const doc of due.slice(0, 20)) {
    const uid = doc.id;
    await db.recursiveDelete(doc.ref);
    await rtdb.ref(`userChats/${uid}`).remove().catch(() => undefined);
    await admin
      .storage()
      .bucket()
      .file(`avatars/${uid}.jpg`)
      .delete()
      .catch(() => undefined);
    await admin.auth().deleteUser(uid).catch(() => undefined);
  }
});

/** Seed thread author as participant when a question is posted. */
export const onThreadCreated = onDocumentWritten(
  { document: "threads/{threadId}", region: "us-central1" },
  async (event) => {
    if (!event.data?.after.exists || event.data.before.exists) return;
    const threadId = event.params.threadId;
    const authorId = String(event.data.after.data()?.authorId ?? "");
    if (authorId) await ensureThreadParticipant(threadId, authorId);
  },
);

/**
 * Cross-app SSO for Pulse ↔ Studio (different origins / ports).
 *
 * Preferred: createSsoHandoff (authenticated) → opaque code → exchangeSsoToken({ code }).
 * Direct idToken exchange is rejected to avoid JWT-in-URL style misuse of this API.
 */
export const createSsoHandoff = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "createSsoHandoff");
  const code = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.collection("ssoHandoffs").doc(code).set({
    uid,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + 60_000),
  });
  return { code };
});

export const exchangeSsoToken = onCall(callableOpts, async (request) => {
  const code = String(request.data?.code ?? "").trim();
  if (code.length < 32) {
    throw new HttpsError(
      "invalid-argument",
      "Opaque handoff code required. Use createSsoHandoff first.",
    );
  }

  const ref = db.collection("ssoHandoffs").doc(code);
  const uid = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const data = snap.data() ?? {};
    if (data.used === true) {
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const expiresAt = data.expiresAt as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      tx.delete(ref);
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const handoffUid = String(data.uid ?? "");
    if (!handoffUid) {
      tx.delete(ref);
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    tx.update(ref, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
    });
    return handoffUid;
  });

  await consumeFunctionQuota(uid, "exchangeSsoToken");
  const customToken = await admin.auth().createCustomToken(uid, { sso: true });
  void ref.delete().catch(() => undefined);
  return { customToken, uid };
});
