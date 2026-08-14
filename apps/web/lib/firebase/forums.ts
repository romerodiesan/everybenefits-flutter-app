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
import { parsePublicProfileBadge } from "@pulse/shared";
import { mapForumReply, mapForumThread } from "@pulse/firebase-web";
import { getFirebaseDb } from "./client";
import { callCloudFunction } from "./call-function";
import type { ForumReply, ForumThread, UserProfile } from "../types";
import { headlineName } from "../display-name";
import { normalizeForumTags } from "../forum-tags";

const authorBadgeCache = new Map<
  string,
  NonNullable<ForumThread["authorBadge"]> | null
>();

async function fetchAuthorBadges(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))];
  const missing = unique.filter((id) => !authorBadgeCache.has(id));
  const db = getFirebaseDb();
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await getDocs(
      query(collection(db, "publicProfiles"), where("__name__", "in", chunk)),
    );
    const found = new Set<string>();
    for (const d of snap.docs) {
      found.add(d.id);
      authorBadgeCache.set(
        d.id,
        parsePublicProfileBadge(
          (d.data() as { profileBadge?: unknown }).profileBadge,
        ),
      );
    }
    for (const id of chunk) {
      if (!found.has(id)) authorBadgeCache.set(id, null);
    }
  }
  return authorBadgeCache;
}

async function hydrateThreads(threads: ForumThread[]): Promise<ForumThread[]> {
  if (!threads.length) return threads;
  await fetchAuthorBadges(threads.map((t) => t.authorId));
  return threads.map((thread) => ({
    ...thread,
    authorBadge:
      authorBadgeCache.get(thread.authorId) ?? thread.authorBadge ?? null,
  }));
}

async function hydrateReplies(replies: ForumReply[]): Promise<ForumReply[]> {
  if (!replies.length) return replies;
  await fetchAuthorBadges(replies.map((r) => r.authorId));
  return replies.map((reply) => ({
    ...reply,
    authorBadge:
      authorBadgeCache.get(reply.authorId) ?? reply.authorBadge ?? null,
  }));
}

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
  authorId?: string;
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
}) {
  const pageSize = options.pageSize ?? 20;
  const orderField = options.sort === "relevant" ? "score" : "lastReplyAt";
  const constraints: QueryConstraint[] = [];
  if (options.authorId) {
    constraints.push(where("authorId", "==", options.authorId));
  }
  if (options.tag) constraints.push(where("tags", "array-contains", options.tag));
  constraints.push(orderBy(orderField, "desc"), limit(pageSize + 1));
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(getFirebaseDb(), "threads"), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    threads: await hydrateThreads(
      pageDocs.map((d) => threadFrom(d.id, d.data() as Record<string, unknown>)),
    ),
    nextCursor: hasMore ? pageDocs[pageDocs.length - 1] : null,
  };
}

export function watchThreads(
  options: {
    sort?: "recent" | "relevant";
    tag?: string;
    pageSize?: number;
  },
  onChange: (page: {
    threads: ForumThread[];
    nextCursor: DocumentSnapshot | null;
  }) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const pageSize = options.pageSize ?? 20;
  const orderField = options.sort === "relevant" ? "score" : "lastReplyAt";
  const constraints: QueryConstraint[] = [];
  if (options.tag) constraints.push(where("tags", "array-contains", options.tag));
  constraints.push(orderBy(orderField, "desc"), limit(pageSize + 1));
  let gen = 0;
  return onSnapshot(
    query(collection(getFirebaseDb(), "threads"), ...constraints),
    (snap) => {
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const page = {
        threads: pageDocs.map((d) =>
          threadFrom(d.id, d.data() as Record<string, unknown>),
        ),
        nextCursor: hasMore ? pageDocs[pageDocs.length - 1] : null,
      };
      onChange(page);
      const my = ++gen;
      void hydrateThreads(page.threads).then((threads) => {
        if (my !== gen) return;
        onChange({ ...page, threads });
      });
    },
    (error) => onError?.(error),
  );
}

export function watchThread(
  threadId: string,
  onChange: (thread: ForumThread | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let gen = 0;
  return onSnapshot(
    doc(getFirebaseDb(), "threads", threadId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const thread = threadFrom(snap.id, snap.data() as Record<string, unknown>);
      onChange(thread);
      const my = ++gen;
      void hydrateThreads([thread]).then((threads) => {
        if (my !== gen) return;
        onChange(threads[0] ?? null);
      });
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
  let gen = 0;
  return onSnapshot(
    q,
    (snap) => {
      const replies = snap.docs.map((d) =>
        replyFrom(threadId, d.id, d.data() as Record<string, unknown>),
      );
      onChange(replies);
      const my = ++gen;
      void hydrateReplies(replies).then((hydrated) => {
        if (my !== gen) return;
        onChange(hydrated);
      });
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
  const thread = threadFrom(snap.id, snap.data() as Record<string, unknown>);
  return (await hydrateThreads([thread]))[0] ?? thread;
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
  return hydrateThreads(
    unique.map((id) => byId.get(id)).filter(Boolean) as ForumThread[],
  );
}
