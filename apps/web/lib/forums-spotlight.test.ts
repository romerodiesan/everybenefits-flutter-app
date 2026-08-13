import { describe, expect, it } from "vitest";
import {
  FORUM_HOT,
  FORUM_SPOTLIGHT,
  forumReachShare,
  isForumHotThread,
  isForumSpotlightCandidate,
  pickForumSpotlight,
} from "./forums-spotlight";
import type { ForumThread } from "@/lib/types";

function thread(
  partial: Partial<ForumThread> & Pick<ForumThread, "id">,
): ForumThread {
  return {
    tags: ["general"],
    title: "Title",
    body: "Body",
    authorId: "u1",
    authorName: "Agent",
    authorPhotoUrl: null,
    authorRole: "agent",
    replyCount: 0,
    score: 0,
    interactorCount: 0,
    acceptedReplyId: null,
    createdAt: new Date(1),
    updatedAt: new Date(1),
    lastReplyAt: new Date(1),
    ...partial,
  };
}

describe("forum spotlight / hot prominence", () => {
  it("does not spotlight weak threads on a tiny emulator audience", () => {
    const weak = thread({
      id: "a",
      replyCount: 4,
      score: 2,
      interactorCount: 5,
    });
    // 5/5 = 100% but audience too small + absolute floors fail
    expect(isForumSpotlightCandidate(weak, 5)).toBe(false);
    expect(pickForumSpotlight([weak], 5)).toBeNull();
  });

  it("does not mark 4-comment threads as Hot", () => {
    const mild = thread({
      id: "a",
      replyCount: 4,
      score: 3,
      interactorCount: 4,
    });
    expect(isForumHotThread(mild, 100)).toBe(false);
    expect(isForumHotThread(mild, 5)).toBe(false);
  });

  it("requires 80% reach and absolute floors for Spotlight", () => {
    const almostReach = thread({
      id: "a",
      replyCount: 20,
      score: 30,
      interactorCount: 79,
    });
    const enough = thread({
      id: "b",
      replyCount: 20,
      score: 30,
      interactorCount: 80,
    });
    expect(forumReachShare(almostReach, 100)).toBe(0.79);
    expect(isForumSpotlightCandidate(almostReach, 100)).toBe(false);
    expect(isForumSpotlightCandidate(enough, 100)).toBe(true);
    expect(FORUM_SPOTLIGHT.minAudienceShare).toBe(0.8);
    expect(FORUM_SPOTLIGHT.minAudienceSize).toBeGreaterThanOrEqual(25);
  });

  it("Hot needs ~35% reach plus floors, and never overlaps Spotlight", () => {
    const hot = thread({
      id: "h",
      replyCount: 8,
      score: 12,
      interactorCount: 40,
    });
    const spotlight = thread({
      id: "s",
      replyCount: 20,
      score: 30,
      interactorCount: 85,
    });
    expect(isForumHotThread(hot, 100)).toBe(true);
    expect(isForumSpotlightCandidate(spotlight, 100)).toBe(true);
    expect(isForumHotThread(spotlight, 100)).toBe(false);
    expect(FORUM_HOT.minAudienceShare).toBe(0.35);
  });

  it("hides Spotlight when audience is unknown", () => {
    const t = thread({
      id: "a",
      replyCount: 50,
      score: 50,
      interactorCount: 100,
    });
    expect(isForumSpotlightCandidate(t, 0)).toBe(false);
  });
});
