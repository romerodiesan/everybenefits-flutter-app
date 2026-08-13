import type { ForumThread } from "@/lib/types";

/**
 * Feed prominence is proportional to the active platform audience.
 * Tiny audiences (dev/emulator) must not light up every thread.
 */
export const FORUM_SPOTLIGHT = {
  /** Share of active users who must have interacted. */
  minAudienceShare: 0.8,
  /**
   * Spotlight is disabled until the platform has a real audience.
   * Prevents 1–5 seeded users from making every post a hero.
   */
  minAudienceSize: 25,
  /** Absolute floor even on large platforms (never “4 comments”). */
  minInteractors: 20,
  minReplyCount: 8,
  minScore: 10,
} as const;

/**
 * “Hot” is below Spotlight but still rare — not every 3-reply thread.
 */
export const FORUM_HOT = {
  minAudienceShare: 0.35,
  minAudienceSize: 15,
  minInteractors: 10,
  minReplyCount: 6,
  minScore: 8,
} as const;

export type ForumEngagementThread = Pick<
  ForumThread,
  | "id"
  | "interactorCount"
  | "acceptedReplyId"
  | "lastReplyAt"
  | "score"
  | "replyCount"
>;

/** Unique interactors ÷ active audience (clamped). */
export function forumReachShare(
  thread: Pick<ForumThread, "interactorCount">,
  audienceSize: number,
): number {
  const audience = Math.max(0, audienceSize);
  if (audience <= 0) return 0;
  return Math.min(1, Math.max(0, thread.interactorCount) / audience);
}

function clearsAbsoluteFloor(
  thread: Pick<ForumThread, "interactorCount" | "replyCount" | "score">,
  floors: {
    minInteractors: number;
    minReplyCount: number;
    minScore: number;
  },
): boolean {
  return (
    thread.interactorCount >= floors.minInteractors &&
    thread.replyCount >= floors.minReplyCount &&
    thread.score >= floors.minScore
  );
}

/**
 * True Spotlight: ≥80% audience reach AND absolute discussion floors.
 * Returns false on small/unknown audiences.
 */
export function isForumSpotlightCandidate(
  thread: Pick<ForumThread, "interactorCount" | "replyCount" | "score">,
  audienceSize: number,
): boolean {
  if (audienceSize < FORUM_SPOTLIGHT.minAudienceSize) return false;
  if (!clearsAbsoluteFloor(thread, FORUM_SPOTLIGHT)) return false;
  return (
    forumReachShare(thread, audienceSize) >= FORUM_SPOTLIGHT.minAudienceShare
  );
}

/**
 * Hot badge: meaningful proportional reach + absolute floors (stricter than old 3/3).
 */
export function isForumHotThread(
  thread: Pick<ForumThread, "interactorCount" | "replyCount" | "score">,
  audienceSize: number,
): boolean {
  if (isForumSpotlightCandidate(thread, audienceSize)) return false;
  if (audienceSize < FORUM_HOT.minAudienceSize) {
    // Without a reliable audience, only hard absolute floors (never soft 3/3).
    return clearsAbsoluteFloor(thread, {
      minInteractors: FORUM_HOT.minInteractors,
      minReplyCount: FORUM_HOT.minReplyCount,
      minScore: FORUM_HOT.minScore,
    });
  }
  if (!clearsAbsoluteFloor(thread, FORUM_HOT)) return false;
  return forumReachShare(thread, audienceSize) >= FORUM_HOT.minAudienceShare;
}

/** @deprecated Use {@link forumReachShare}. */
export function forumSpotlightReachShare(
  thread: Pick<ForumThread, "interactorCount">,
  audienceSize: number,
): number {
  return forumReachShare(thread, audienceSize);
}

/**
 * Pick at most one Spotlight from the loaded feed.
 */
export function pickForumSpotlight(
  threads: ForumThread[],
  audienceSize: number,
): ForumThread | null {
  const candidates = threads.filter((thread) =>
    isForumSpotlightCandidate(thread, audienceSize),
  );
  if (!candidates.length) return null;

  return (
    [...candidates].sort((a, b) => {
      const byReach =
        forumReachShare(b, audienceSize) - forumReachShare(a, audienceSize);
      if (byReach !== 0) return byReach;
      const byInteractors = b.interactorCount - a.interactorCount;
      if (byInteractors !== 0) return byInteractors;
      const aAccepted = a.acceptedReplyId ? 1 : 0;
      const bAccepted = b.acceptedReplyId ? 1 : 0;
      if (bAccepted !== aAccepted) return bAccepted - aAccepted;
      return (
        (b.lastReplyAt?.getTime?.() ?? 0) - (a.lastReplyAt?.getTime?.() ?? 0)
      );
    })[0] ?? null
  );
}
