import type { Poll, PollLocalizedString, PollSurface } from "./types";
export declare function localizePollText(value: PollLocalizedString, locale: string): string;
export declare function isPollInSchedule(poll: Pick<Poll, "startsAt" | "endsAt">, nowMs?: number): boolean;
export declare function isPollOpen(poll: Pick<Poll, "active" | "startsAt" | "endsAt">, nowMs?: number): boolean;
export declare function isPollVisibleToViewer(poll: Poll, opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
}): boolean;
export declare function pickPollsForSurface(polls: Poll[], surface: PollSurface, opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
}): Poll[];
export declare function pollOptionShare(poll: Pick<Poll, "counts" | "voteCount">, optionId: string): number;
//# sourceMappingURL=match.d.ts.map