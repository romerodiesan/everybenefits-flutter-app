import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { mapForumReply, mapForumThread } from "@pulse/firebase-web";
import { getFirebaseDb } from "./client";
import { callCloudFunction } from "./call-function";
import type { ForumReply, ForumThread, UserProfile } from "../types";
import { headlineName } from "../display-name";
import { normalizeForumTags } from "../forum-tags";

function threadFrom(id: string, data: Record<string, unknown>): ForumThread {
  let tags: string[] = [];
  if (Array.isArray(data.tags)) {
    tags = normalizeForumTags(data.tags.map(String));
  } else if (typeof data.categoryId === "string") {
    tags = normalizeForumTags([data.categoryId]);
  }
  return { ...mapForumThread(id, data), tags };
}

function replyFrom(
  threadId: string,
  id: string,
  data: Record<string, unknown>,
): ForumReply {
  return mapForumReply(id, threadId, data);
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
    interactorCount: 0,
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
  void input.author;
  await callCloudFunction("addForumReply", {
    threadId: input.threadId,
    body: input.body.trim(),
  });
}

export async function castForumVote(input: {
  threadId: string;
  replyId?: string;
  vote: -1 | 0 | 1;
}) {
  await callCloudFunction("castForumVote", input);
}

export async function updateThread(input: {
  threadId: string;
  title: string;
  body: string;
  tags: string[];
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error("Title and body are required");
  await updateDoc(doc(getFirebaseDb(), "threads", input.threadId), {
    title,
    body,
    tags: normalizeForumTags(input.tags),
    updatedAt: serverTimestamp(),
  });
}

export async function updateReply(input: {
  threadId: string;
  replyId: string;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("Reply body is required");
  await updateDoc(
    doc(getFirebaseDb(), "threads", input.threadId, "replies", input.replyId),
    {
      body,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function deleteReply(input: {
  threadId: string;
  replyId: string;
}) {
  await callCloudFunction("deleteForumReply", input);
}

export async function deleteThread(threadId: string) {
  await callCloudFunction("deleteForumThread", { threadId });
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
  const out = Object.fromEntries(input.threadIds.map((id) => [id, 0]));
  // Vote docs are keyed by threadId (see castForumVote) — point reads, not full scan.
  await Promise.all(
    input.threadIds.map(async (threadId) => {
      const snap = await getDoc(
        doc(getFirebaseDb(), "users", input.uid, "forumVotes", threadId),
      );
      if (snap.exists() && snap.data()?.replyId == null) {
        out[threadId] = Number(snap.data()?.value ?? 0);
      }
    }),
  );
  return out;
}

export async function fetchReplyVotes(input: {
  threadId: string;
  uid: string;
  replyIds: string[];
}) {
  if (!input.replyIds.length) return {} as Record<string, number>;
  const out = Object.fromEntries(input.replyIds.map((id) => [id, 0]));
  await Promise.all(
    input.replyIds.map(async (replyId) => {
      const voteId = `${input.threadId}_${replyId}`;
      const snap = await getDoc(
        doc(getFirebaseDb(), "users", input.uid, "forumVotes", voteId),
      );
      if (snap.exists()) {
        out[replyId] = Number(snap.data()?.value ?? 0);
      }
    }),
  );
  return out;
}

/** Batch-get threads by id (chunks of 10 for `in` queries). */
export async function getThreadsByIds(ids: string[]): Promise<ForumThread[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const db = getFirebaseDb();
  const threads: ForumThread[] = [];
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, "threads"), where("__name__", "in", chunk)),
    );
    for (const d of snap.docs) {
      threads.push(threadFrom(d.id, d.data() as Record<string, unknown>));
    }
  }
  // Preserve caller order when possible.
  const byId = new Map(threads.map((t) => [t.id, t]));
  return unique.map((id) => byId.get(id)).filter(Boolean) as ForumThread[];
}
