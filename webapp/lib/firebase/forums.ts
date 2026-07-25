import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./client";
import type { ForumReply, ForumThread, UserProfile, UserRole } from "../types";
import { normalizeForumTags, parseRole } from "../roles";
import { headlineName } from "./users";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function threadFrom(id: string, data: Record<string, unknown>): ForumThread {
  let tags: string[] = [];
  if (Array.isArray(data.tags)) {
    tags = normalizeForumTags(data.tags.map(String));
  } else if (typeof data.categoryId === "string") {
    tags = normalizeForumTags([data.categoryId]);
  }
  return {
    id,
    tags,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    authorId: String(data.authorId ?? ""),
    authorName: String(data.authorName ?? ""),
    authorPhotoUrl: (data.authorPhotoUrl as string) ?? null,
    authorRole: parseRole(data.authorRole),
    replyCount: Number(data.replyCount ?? 0),
    score: Number(data.score ?? 0),
    acceptedReplyId: (data.acceptedReplyId as string) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastReplyAt: toDate(data.lastReplyAt),
  };
}

function replyFrom(
  threadId: string,
  id: string,
  data: Record<string, unknown>,
): ForumReply {
  return {
    id,
    threadId,
    body: String(data.body ?? ""),
    authorId: String(data.authorId ?? ""),
    authorName: String(data.authorName ?? ""),
    authorPhotoUrl: (data.authorPhotoUrl as string) ?? null,
    authorRole: parseRole(data.authorRole) as UserRole,
    score: Number(data.score ?? 0),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function queryThreads(options: {
  sort?: "recent" | "relevant";
  tag?: string;
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
}) {
  const pageSize = options.pageSize ?? 20;
  const orderField = options.sort === "relevant" ? "score" : "lastReplyAt";
  const constraints: QueryConstraint[] = [];
  if (options.tag) constraints.push(where("tags", "array-contains", options.tag));
  constraints.push(orderBy(orderField, "desc"), limit(pageSize + 1));
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(getFirebaseDb(), "threads"), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    threads: pageDocs.map((d) =>
      threadFrom(d.id, d.data() as Record<string, unknown>),
    ),
    nextCursor: hasMore ? pageDocs[pageDocs.length - 1] : null,
  };
}

export function watchThread(
  threadId: string,
  onChange: (thread: ForumThread | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "threads", threadId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(threadFrom(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
}

export function watchReplies(
  threadId: string,
  onChange: (replies: ForumReply[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "threads", threadId, "replies"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) =>
          replyFrom(threadId, d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export async function createThread(input: {
  title: string;
  body: string;
  tags: string[];
  author: UserProfile;
}) {
  const tags = normalizeForumTags(input.tags);
  const ref = doc(collection(getFirebaseDb(), "threads"));
  await setDoc(ref, {
    tags,
    title: input.title.trim(),
    body: input.body.trim(),
    authorId: input.author.uid,
    authorName: headlineName(input.author),
    authorPhotoUrl: input.author.photoUrl,
    authorRole: input.author.role,
    replyCount: 0,
    score: 0,
    acceptedReplyId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastReplyAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addReply(input: {
  threadId: string;
  body: string;
  author: UserProfile;
}) {
  const replies = collection(
    getFirebaseDb(),
    "threads",
    input.threadId,
    "replies",
  );
  await addDoc(replies, {
    body: input.body.trim(),
    authorId: input.author.uid,
    authorName: headlineName(input.author),
    authorPhotoUrl: input.author.photoUrl,
    authorRole: input.author.role,
    score: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(getFirebaseDb(), "threads", input.threadId), {
    replyCount: increment(1),
    lastReplyAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function castForumVote(input: {
  threadId: string;
  replyId?: string;
  vote: -1 | 0 | 1;
}) {
  // Client path (same as Flutter fallback): no Cloud Functions in this project;
  // Firestore rules allow vote docs + score deltas of ±2.
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Sign in required.");

  const db = getFirebaseDb();
  const targetRef = input.replyId
    ? doc(db, "threads", input.threadId, "replies", input.replyId)
    : doc(db, "threads", input.threadId);
  const voteRef = input.replyId
    ? doc(
        db,
        "threads",
        input.threadId,
        "replies",
        input.replyId,
        "votes",
        uid,
      )
    : doc(db, "threads", input.threadId, "votes", uid);

  const next = input.vote;
  await runTransaction(db, async (tx) => {
    const voteSnap = await tx.get(voteRef);
    const previous = Number(voteSnap.data()?.value ?? 0);
    const delta = next - previous;
    if (delta === 0) return;

    if (next === 0) {
      tx.delete(voteRef);
    } else {
      tx.set(
        voteRef,
        { value: next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
    tx.update(targetRef, {
      score: increment(delta),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function setAcceptedReply(
  threadId: string,
  replyId: string | null,
) {
  await updateDoc(doc(getFirebaseDb(), "threads", threadId), {
    acceptedReplyId: replyId,
    updatedAt: serverTimestamp(),
  });
}

export async function getThread(threadId: string) {
  const snap = await getDoc(doc(getFirebaseDb(), "threads", threadId));
  if (!snap.exists()) return null;
  return threadFrom(snap.id, snap.data() as Record<string, unknown>);
}

export function watchThreadVote(
  threadId: string,
  uid: string,
  onChange: (vote: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "threads", threadId, "votes", uid),
    (snap) => {
      onChange(Number(snap.data()?.value ?? 0));
    },
    (error) => onError?.(error),
  );
}

export function watchReplyVote(
  threadId: string,
  replyId: string,
  uid: string,
  onChange: (vote: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "threads", threadId, "replies", replyId, "votes", uid),
    (snap) => {
      onChange(Number(snap.data()?.value ?? 0));
    },
    (error) => onError?.(error),
  );
}

export async function fetchThreadVotes(input: {
  uid: string;
  threadIds: string[];
}) {
  if (!input.threadIds.length) return {} as Record<string, number>;
  const snaps = await Promise.all(
    input.threadIds.map((id) =>
      getDoc(
        doc(getFirebaseDb(), "threads", id, "votes", input.uid),
      ).catch(() => null),
    ),
  );
  const out: Record<string, number> = {};
  input.threadIds.forEach((id, i) => {
    const snap = snaps[i];
    out[id] = snap ? Number(snap.data()?.value ?? 0) : 0;
  });
  return out;
}

export async function fetchReplyVotes(input: {
  threadId: string;
  uid: string;
  replyIds: string[];
}) {
  if (!input.replyIds.length) return {} as Record<string, number>;
  const snaps = await Promise.all(
    input.replyIds.map((id) =>
      getDoc(
        doc(
          getFirebaseDb(),
          "threads",
          input.threadId,
          "replies",
          id,
          "votes",
          input.uid,
        ),
      ).catch(() => null),
    ),
  );
  const out: Record<string, number> = {};
  input.replyIds.forEach((id, i) => {
    const snap = snaps[i];
    out[id] = snap ? Number(snap.data()?.value ?? 0) : 0;
  });
  return out;
}
