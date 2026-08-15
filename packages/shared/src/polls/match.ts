import {
  bannerAudienceMatches,
  isBannerInSchedule,
} from "../banners/match";
import type { Poll, PollLocalizedString, PollSurface } from "./types";

export function localizePollText(
  value: PollLocalizedString,
  locale: string,
): string {
  const key = locale === "es" ? "es" : "en";
  const primary = value[key]?.trim();
  if (primary) return primary;
  return value.en?.trim() || value.es?.trim() || "";
}

export function isPollInSchedule(
  poll: Pick<Poll, "startsAt" | "endsAt">,
  nowMs: number = Date.now(),
): boolean {
  return isBannerInSchedule(poll, nowMs);
}

export function isPollOpen(
  poll: Pick<Poll, "active" | "startsAt" | "endsAt">,
  nowMs: number = Date.now(),
): boolean {
  return poll.active === true && isPollInSchedule(poll, nowMs);
}

export function isPollVisibleToViewer(
  poll: Poll,
  opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
  },
): boolean {
  if (!poll.active) return false;
  if (!isPollInSchedule(poll, opts.nowMs)) return false;
  return bannerAudienceMatches(poll.audiences, opts.role, opts.isAnonymous);
}

export function pickPollsForSurface(
  polls: Poll[],
  surface: PollSurface,
  opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
  },
): Poll[] {
  return polls
    .filter((poll) => poll.surface === surface)
    .filter((poll) => isPollVisibleToViewer(poll, opts))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function pollOptionShare(
  poll: Pick<Poll, "counts" | "voteCount">,
  optionId: string,
): number {
  if (poll.voteCount <= 0) return 0;
  return Math.max(0, Number(poll.counts[optionId] ?? 0)) / poll.voteCount;
}
