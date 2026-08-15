import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db, rtdb, callableOpts } from "./init";
import { headlineName, isUserApprovedForJoin, requireCaller } from "./auth";
import { notifyUser } from "./notifications";
import { chunkArray } from "./batch-utils";
import {
  computeRelationship,
  dmKeyFor,
  dmMessagingEnabledValue,
  type SocialRelationship,
} from "./social-helpers";

function otherUidFrom(request: { data?: unknown }): string {
  const raw =
    request.data && typeof request.data === "object"
      ? (request.data as Record<string, unknown>).otherUid
      : undefined;
  const otherUid = String(raw ?? "").trim();
  if (!otherUid || otherUid.length > 128) {
    throw new HttpsError("invalid-argument", "Valid member required.");
  }
  return otherUid;
}

export async function areMutualContacts(
  a: string,
  b: string,
): Promise<boolean> {
  const [ab, ba] = await db.getAll(
    db.doc(`social/${a}/contacts/${b}`),
    db.doc(`social/${b}/contacts/${a}`),
  );
  return ab.exists && ba.exists;
}

export async function isBlockedEitherWay(
  a: string,
  b: string,
): Promise<boolean> {
  const [ab, ba] = await db.getAll(
    db.doc(`social/${a}/blocks/${b}`),
    db.doc(`social/${b}/blocks/${a}`),
  );
  return ab.exists || ba.exists;
}

export async function isMutedBy(viewer: string, sender: string): Promise<boolean> {
  const snap = await db.doc(`social/${viewer}/mutes/${sender}`).get();
  return snap.exists;
}

export async function syncDmMessagingEnabled(
  a: string,
  b: string,
): Promise<void> {
  const key = dmKeyFor(a, b);
  const chatSnap = await rtdb.ref(`chats/${key}`).get();
  if (!chatSnap.exists()) return;
  const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
  if (chat.isGroup === true) return;
  const [mutual, blocked] = await Promise.all([
    areMutualContacts(a, b),
    isBlockedEitherWay(a, b),
  ]);
  const enabled = dmMessagingEnabledValue({
    isGroup: false,
    mutualContacts: mutual,
    blocked,
  });
  await rtdb.ref(`chats/${key}/dmMessagingEnabled`).set(enabled);
}

function requestDocs(a: string, b: string) {
  return [
    db.doc(`social/${a}/outgoingRequests/${b}`),
    db.doc(`social/${b}/incomingRequests/${a}`),
    db.doc(`social/${b}/outgoingRequests/${a}`),
    db.doc(`social/${a}/incomingRequests/${b}`),
  ];
}

export async function applyBlockSideEffects(
  uid: string,
  otherUid: string,
): Promise<void> {
  const batch = db.batch();
  for (const ref of requestDocs(uid, otherUid)) {
    batch.delete(ref);
  }
  batch.delete(db.doc(`social/${uid}/contacts/${otherUid}`));
  batch.delete(db.doc(`social/${otherUid}/contacts/${uid}`));
  await batch.commit();
  await Promise.all([
    dropFollowEdge(uid, otherUid),
    dropFollowEdge(otherUid, uid),
  ]);
  await syncDmMessagingEnabled(uid, otherUid);
}

async function dropFollowEdge(follower: string, followed: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const followingRef = db.doc(`social/${follower}/following/${followed}`);
    const snap = await tx.get(followingRef);
    if (!snap.exists) return;
    tx.delete(followingRef);
    tx.delete(db.doc(`social/${followed}/followers/${follower}`));
    tx.set(
      db.doc(`publicProfiles/${followed}`),
      { followerCount: FieldValue.increment(-1) },
      { merge: true },
    );
    tx.set(
      db.doc(`publicProfiles/${follower}`),
      { followingCount: FieldValue.increment(-1) },
      { merge: true },
    );
  });
}

async function setFollowEdge(
  follower: string,
  followed: string,
  follow: boolean,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const followingRef = db.doc(`social/${follower}/following/${followed}`);
    const snap = await tx.get(followingRef);
    if (follow) {
      if (snap.exists) return false;
      const now = FieldValue.serverTimestamp();
      tx.set(followingRef, { uid: followed, createdAt: now });
      tx.set(db.doc(`social/${followed}/followers/${follower}`), {
        uid: follower,
        createdAt: now,
      });
      tx.set(
        db.doc(`publicProfiles/${followed}`),
        { followerCount: FieldValue.increment(1) },
        { merge: true },
      );
      tx.set(
        db.doc(`publicProfiles/${follower}`),
        { followingCount: FieldValue.increment(1) },
        { merge: true },
      );
      return true;
    }
    if (!snap.exists) return false;
    tx.delete(followingRef);
    tx.delete(db.doc(`social/${followed}/followers/${follower}`));
    tx.set(
      db.doc(`publicProfiles/${followed}`),
      { followerCount: FieldValue.increment(-1) },
      { merge: true },
    );
    tx.set(
      db.doc(`publicProfiles/${follower}`),
      { followingCount: FieldValue.increment(-1) },
      { merge: true },
    );
    return true;
  });
}

async function acceptPair(uid: string, otherUid: string): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.doc(`social/${uid}/contacts/${otherUid}`), {
    uid: otherUid,
    since: now,
  });
  batch.set(db.doc(`social/${otherUid}/contacts/${uid}`), {
    uid,
    since: now,
  });
  for (const ref of requestDocs(uid, otherUid)) {
    batch.delete(ref);
  }
  await batch.commit();
  await syncDmMessagingEnabled(uid, otherUid);
}

async function assertApprovedMember(uid: string) {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const data = snap.data() ?? {};
  if (data.isAnonymous === true) {
    throw new HttpsError("permission-denied", "Anonymous users cannot connect.");
  }
  if (!isUserApprovedForJoin(data)) {
    throw new HttpsError("permission-denied", "User is not approved.");
  }
  return data;
}

type PublicCard = {
  uid: string;
  displayName: string | null;
  username: string | null;
  photoUrl: string | null;
  role: string;
  agency: string | null;
  bio: string | null;
};

async function cardsForUids(uids: string[]): Promise<PublicCard[]> {
  if (!uids.length) return [];
  const cards: PublicCard[] = [];
  for (const group of chunkArray(uids, 100)) {
    const snaps = await db.getAll(
      ...group.map((id) => db.doc(`publicProfiles/${id}`)),
    );
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() ?? {};
      cards.push({
        uid: snap.id,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        username: typeof data.username === "string" ? data.username : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        agency: typeof data.agency === "string" ? data.agency : null,
        bio: typeof data.bio === "string" ? data.bio : null,
      });
    }
  }
  return cards;
}

/** Uids the caller blocked, plus uids that blocked the caller. */
export async function blockedWithCaller(
  callerUid: string,
  candidateUids: string[],
): Promise<Set<string>> {
  const out = new Set<string>();
  const myBlocks = await db.collection(`social/${callerUid}/blocks`).get();
  for (const doc of myBlocks.docs) out.add(doc.id);
  const remaining = candidateUids.filter((id) => id && id !== callerUid);
  if (!remaining.length) return out;
  for (const group of chunkArray(remaining, 100)) {
    const snaps = await db.getAll(
      ...group.map((id) => db.doc(`social/${id}/blocks/${callerUid}`)),
    );
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const other = snap.ref.parent.parent?.id;
      if (other) out.add(other);
    }
  }
  return out;
}

export const sendContactRequest = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "sendContactRequest");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot connect with yourself.");
  }
  await Promise.all([assertApprovedMember(uid), assertApprovedMember(otherUid)]);
  if (await isBlockedEitherWay(uid, otherUid)) {
    throw new HttpsError("permission-denied", "Cannot send request.");
  }
  if (await areMutualContacts(uid, otherUid)) {
    return { status: "contact" as const };
  }

  const reverse = await db.doc(`social/${uid}/incomingRequests/${otherUid}`).get();
  if (reverse.exists) {
    await acceptPair(uid, otherUid);
    return { status: "contact" as const };
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.doc(`social/${uid}/outgoingRequests/${otherUid}`), {
    toUid: otherUid,
    fromUid: uid,
    createdAt: now,
  });
  batch.set(db.doc(`social/${otherUid}/incomingRequests/${uid}`), {
    toUid: otherUid,
    fromUid: uid,
    createdAt: now,
  });
  await batch.commit();

  const me = await db.doc(`users/${uid}`).get();
  const name = headlineName(me.data());
  await notifyUser(otherUid, {
    type: "contact_request",
    title: "Contact request",
    body: `${name} wants to add you as a contact`,
    href: `/members/${uid}`,
    deepLink: `pulse://members/${uid}`,
    ref: { uid },
    actorId: uid,
    actorName: name,
  });
  return { status: "outgoing" as const };
});

export const acceptContactRequest = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "acceptContactRequest");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Valid member required.");
  }
  if (await isBlockedEitherWay(uid, otherUid)) {
    throw new HttpsError("permission-denied", "Cannot accept request.");
  }
  const incoming = await db
    .doc(`social/${uid}/incomingRequests/${otherUid}`)
    .get();
  if (!incoming.exists) {
    throw new HttpsError("failed-precondition", "No pending request.");
  }
  await acceptPair(uid, otherUid);
  return { status: "contact" as const };
});

export const declineContactRequest = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "declineContactRequest");
  const otherUid = otherUidFrom(request);
  const batch = db.batch();
  for (const ref of requestDocs(uid, otherUid)) {
    batch.delete(ref);
  }
  await batch.commit();
  return { status: "none" as const };
});

export const cancelContactRequest = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "cancelContactRequest");
  const otherUid = otherUidFrom(request);
  const batch = db.batch();
  batch.delete(db.doc(`social/${uid}/outgoingRequests/${otherUid}`));
  batch.delete(db.doc(`social/${otherUid}/incomingRequests/${uid}`));
  await batch.commit();
  return { status: "none" as const };
});

export const removeContact = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "removeContact");
  const otherUid = otherUidFrom(request);
  const batch = db.batch();
  batch.delete(db.doc(`social/${uid}/contacts/${otherUid}`));
  batch.delete(db.doc(`social/${otherUid}/contacts/${uid}`));
  await batch.commit();
  await syncDmMessagingEnabled(uid, otherUid);
  return { status: "none" as const };
});

export const setBlocked = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "setBlocked");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot block yourself.");
  }
  const blocked = Boolean(
    request.data &&
      typeof request.data === "object" &&
      (request.data as Record<string, unknown>).blocked,
  );
  const ref = db.doc(`social/${uid}/blocks/${otherUid}`);
  if (blocked) {
    await ref.set({
      uid: otherUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await applyBlockSideEffects(uid, otherUid);
  } else {
    await ref.delete();
    await syncDmMessagingEnabled(uid, otherUid);
  }
  return { blocked };
});

export const setMuted = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "setMuted");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot mute yourself.");
  }
  const muted = Boolean(
    request.data &&
      typeof request.data === "object" &&
      (request.data as Record<string, unknown>).muted,
  );
  const ref = db.doc(`social/${uid}/mutes/${otherUid}`);
  if (muted) {
    await ref.set({
      uid: otherUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.delete();
  }
  return { muted };
});

export const getSocialRelationship = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "getSocialRelationship");
  const otherUid = otherUidFrom(request);
  const [
    outgoing,
    incoming,
    contact,
    blockedByMe,
    muted,
    theyBlocked,
    following,
  ] = await db.getAll(
    db.doc(`social/${uid}/outgoingRequests/${otherUid}`),
    db.doc(`social/${uid}/incomingRequests/${otherUid}`),
    db.doc(`social/${uid}/contacts/${otherUid}`),
    db.doc(`social/${uid}/blocks/${otherUid}`),
    db.doc(`social/${uid}/mutes/${otherUid}`),
    db.doc(`social/${otherUid}/blocks/${uid}`),
    db.doc(`social/${uid}/following/${otherUid}`),
  );
  const relationship: SocialRelationship = computeRelationship({
    viewerUid: uid,
    otherUid,
    theyBlockedViewer: theyBlocked.exists,
    viewerBlockedOther: blockedByMe.exists,
    muted: muted.exists,
    isContact: contact.exists,
    hasOutgoing: outgoing.exists,
    hasIncoming: incoming.exists,
    following: following.exists,
  });
  return relationship;
});

export const listContacts = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listContacts");
  const snap = await db.collection(`social/${uid}/contacts`).limit(200).get();
  const profiles = await cardsForUids(snap.docs.map((doc) => doc.id));
  profiles.sort((a, b) =>
    (a.displayName ?? "").localeCompare(b.displayName ?? ""),
  );
  return { profiles };
});

export const listIncomingContactRequests = onCall(
  callableOpts,
  async (request) => {
    const uid = await requireCaller(request, "listIncomingContactRequests");
    const snap = await db
      .collection(`social/${uid}/incomingRequests`)
      .limit(50)
      .get();
    const profiles = await cardsForUids(snap.docs.map((doc) => doc.id));
    return { profiles };
  },
);

export const followUser = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "followUser");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot follow yourself.");
  }
  await Promise.all([assertApprovedMember(uid), assertApprovedMember(otherUid)]);
  if (await isBlockedEitherWay(uid, otherUid)) {
    throw new HttpsError("permission-denied", "Cannot follow this member.");
  }
  const created = await setFollowEdge(uid, otherUid, true);
  if (created) {
    const me = await db.doc(`users/${uid}`).get();
    const name = headlineName(me.data());
    await notifyUser(otherUid, {
      type: "new_follower",
      title: "New follower",
      body: `${name} started following you`,
      href: `/members/${uid}`,
      deepLink: `pulse://members/${uid}`,
      ref: { uid },
      actorId: uid,
      actorName: name,
    });
  }
  return { following: true };
});

export const unfollowUser = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "unfollowUser");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot unfollow yourself.");
  }
  await setFollowEdge(uid, otherUid, false);
  return { following: false };
});

async function listFollowGraph(
  callerUid: string,
  targetUid: string,
  edge: "followers" | "following",
): Promise<{ profiles: PublicCard[] }> {
  if (await isBlockedEitherWay(callerUid, targetUid) && callerUid !== targetUid) {
    return { profiles: [] };
  }
  const snap = await db.collection(`social/${targetUid}/${edge}`).limit(100).get();
  const ids = snap.docs.map((doc) => doc.id);
  const blocked = await blockedWithCaller(callerUid, ids);
  const visible = ids.filter((id) => !blocked.has(id));
  const profiles = await cardsForUids(visible);
  profiles.sort((a, b) =>
    (a.displayName ?? "").localeCompare(b.displayName ?? ""),
  );
  return { profiles };
}

export const listFollowers = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listFollowers");
  const otherUid = otherUidFrom(request);
  return listFollowGraph(uid, otherUid, "followers");
});

export const listFollowing = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listFollowing");
  const otherUid = otherUidFrom(request);
  return listFollowGraph(uid, otherUid, "following");
});

const REPORT_REASONS = new Set([
  "spam",
  "harassment",
  "impersonation",
  "other",
]);

export const reportMember = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "reportMember");
  const otherUid = otherUidFrom(request);
  if (otherUid === uid) {
    throw new HttpsError("invalid-argument", "Cannot report yourself.");
  }
  const payload =
    request.data && typeof request.data === "object"
      ? (request.data as Record<string, unknown>)
      : {};
  const reason = String(payload.reason ?? "").trim();
  if (!REPORT_REASONS.has(reason)) {
    throw new HttpsError("invalid-argument", "Valid reason required.");
  }
  const details = String(payload.details ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
  await db.collection("moderationReports").add({
    reporterUid: uid,
    targetUid: otherUid,
    reason,
    details: details || null,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const onSocialBlockWritten = onDocumentWritten(
  "social/{uid}/blocks/{otherUid}",
  async (event) => {
    const uid = event.params.uid;
    const otherUid = event.params.otherUid;
    if (!event.data?.after.exists) return;
    await applyBlockSideEffects(uid, otherUid);
  },
);
