import { config } from "./config.mjs";
import { commitInBatches, db, log } from "./admin.mjs";

const TAGS = [
  "npn",
  "onboarding",
  "medicare",
  "aca",
  "life",
  "compliance",
  "closing",
  "underwriting",
];

/**
 * @param {{ users: Array<{uid:string,displayName:string,role:string,approvalStatus:string}> }} userCtx
 */
export async function seedForums(userCtx) {
  log("forums", `${config.threads} threads`);
  const authors = userCtx.users.filter((u) => u.approvalStatus === "approved");
  if (authors.length === 0) throw new Error("No approved users for forum seed");

  const firestore = db();
  const ops = [];
  const base = Date.now();

  for (let t = 0; t < config.threads; t++) {
    const author = authors[t % authors.length];
    const threadId = `thread-${String(t).padStart(5, "0")}`;
    const created = new Date(base - t * 60_000);
    const replyCount = config.repliesPerThread;
    const lastReplyAt = new Date(created.getTime() + replyCount * 30_000);
    const tags = [TAGS[t % TAGS.length], TAGS[(t + 3) % TAGS.length]].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const acceptedReplyId = t % 7 === 0 ? `reply-000` : null;

    ops.push({
      type: "set",
      ref: firestore.doc(`threads/${threadId}`),
      data: {
        tags,
        title: `Load thread ${t + 1}: ${tags[0]} question`,
        body: `Looking for practical guidance on ${tags.join(" / ")}. Mega-seed body #${t}.`,
        authorId: author.uid,
        authorName: author.displayName,
        authorPhotoUrl: null,
        authorRole: author.role,
        replyCount,
        score: (t % 40) - 5,
        acceptedReplyId,
        createdAt: created,
        updatedAt: lastReplyAt,
        lastReplyAt,
      },
    });

    ops.push({
      type: "set",
      ref: firestore.doc(`threads/${threadId}/participants/${author.uid}`),
      data: { uid: author.uid, joinedAt: created },
    });

    for (let r = 0; r < replyCount; r++) {
      const replyAuthor = authors[(t + r + 1) % authors.length];
      const replyId = `reply-${String(r).padStart(3, "0")}`;
      const replyAt = new Date(created.getTime() + (r + 1) * 30_000);
      ops.push({
        type: "set",
        ref: firestore.doc(`threads/${threadId}/replies/${replyId}`),
        data: {
          body: `Reply ${r + 1} on thread ${t + 1}. Helpful tip for load testing.`,
          authorId: replyAuthor.uid,
          authorName: replyAuthor.displayName,
          authorPhotoUrl: null,
          authorRole: replyAuthor.role,
          score: (r + t) % 12,
          createdAt: replyAt,
          updatedAt: replyAt,
        },
      });
      ops.push({
        type: "set",
        ref: firestore.doc(`threads/${threadId}/participants/${replyAuthor.uid}`),
        data: { uid: replyAuthor.uid, joinedAt: replyAt },
      });
    }

    // A few votes for score realism
    const voter = authors[(t + 2) % authors.length];
    ops.push({
      type: "set",
      ref: firestore.doc(`threads/${threadId}/votes/${voter.uid}`),
      data: { value: 1, createdAt: created },
    });
    ops.push({
      type: "set",
      ref: firestore.doc(`users/${voter.uid}/forumVotes/${threadId}`),
      data: { threadId, value: 1, createdAt: created },
    });
  }

  await commitInBatches(ops);
  log("forums", `${config.threads} threads · ~${config.threads * config.repliesPerThread} replies`);
}
