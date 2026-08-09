import { config } from "./config.mjs";
import { commitInBatches, db, log } from "./admin.mjs";

const TYPES = [
  "chat_message",
  "support_message",
  "forum_reply",
  "forum_vote",
  "forum_new_thread",
  "course_published",
];

/**
 * @param {{ users: Array<{uid:string,approvalStatus:string,email:string}>, fixtures: Record<string,string> }} userCtx
 * @param {{ courses: Array<{id:string}> }} academy
 */
export async function seedNotifications(userCtx, academy) {
  const targets = [];
  // Always seed fixture accounts heavily
  for (const email of Object.keys(userCtx.fixtures)) {
    targets.push(userCtx.fixtures[email]);
  }
  const approved = userCtx.users.filter((u) => u.approvalStatus === "approved");
  for (let i = 0; i < Math.min(config.notifUsers, approved.length); i++) {
    const uid = approved[i * 3 % approved.length].uid;
    if (!targets.includes(uid)) targets.push(uid);
  }

  log("notifications", `${targets.length} users × ~${config.notifsPerUser}`);
  const firestore = db();
  const ops = [];
  const now = Date.now();
  const courseId = academy.courses[0]?.id ?? "course-000";

  for (const uid of targets) {
    let unread = 0;
    let unreadForum = 0;
    for (let n = 0; n < config.notifsPerUser; n++) {
      const type = TYPES[n % TYPES.length];
      const read = n % 3 === 0;
      if (!read) {
        unread++;
        if (type.startsWith("forum_")) unreadForum++;
      }
      const id = `n-${String(n).padStart(3, "0")}`;
      const createdAt = new Date(now - n * 3_600_000 - (n % 47) * 1_000);
      const ref =
        type.startsWith("forum_")
          ? { threadId: `thread-${String(n).padStart(5, "0")}` }
          : type === "course_published"
            ? { courseId }
            : { chatId: n % 2 === 0 ? `group-${String(n).padStart(4, "0")}` : `dm-seed` };

      ops.push({
        type: "set",
        ref: firestore.doc(`users/${uid}/notifications/${id}`),
        data: {
          type,
          title: `Mega ${type.replaceAll("_", " ")}`,
          body: `Load-test notification ${n + 1} for inbox / badge stress.`,
          href: "/notifications",
          deepLink: "pulse://notifications",
          ref,
          read,
          createdAt,
        },
      });
    }
    ops.push({
      type: "set",
      ref: firestore.doc(`users/${uid}/notificationState/default`),
      data: {
        unreadCount: unread,
        unreadForumCount: unreadForum,
        lastFeedSeenAt: new Date(now - 86_400_000),
        prefs: {
          pushChats: true,
          pushForums: true,
          pushAcademy: true,
          pushSupport: true,
        },
        updatedAt: new Date(now),
      },
    });
  }

  await commitInBatches(ops);
  log("notifications", `${ops.length} docs`);
}
