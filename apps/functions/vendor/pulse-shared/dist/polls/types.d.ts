import { type PromoBannerAudience, type PromoBannerLocalizedString, type PromoBannerSurface } from "../banners/types";
export declare const POLL_SURFACES: readonly ["home", "rail", "academy"];
export type PollSurface = PromoBannerSurface;
export declare const POLL_AUDIENCES: readonly ["all", "student", "agent", "agency_owner", "instructor", "manager", "admin"];
export type PollAudience = PromoBannerAudience;
export type PollLocalizedString = PromoBannerLocalizedString;
export declare const POLL_LIMITS: {
    readonly question: 140;
    readonly option: 48;
    readonly minOptions: 2;
    readonly maxOptions: 6;
};
export type PollOption = {
    id: string;
    label: PollLocalizedString;
};
export type Poll = {
    id: string;
    version: number;
    active: boolean;
    surface: PollSurface;
    audiences: PollAudience[];
    question: PollLocalizedString;
    options: PollOption[];
    /** Allow changing a vote while the poll is still open. */
    allowChange: boolean;
    /** Show live tallies before the viewer has voted. */
    showResultsBeforeVote: boolean;
    dismissible: boolean;
    counts: Record<string, number>;
    voteCount: number;
    startsAt: number | null;
    endsAt: number | null;
    createdAt: number | null;
    updatedAt: number | null;
    updatedBy: string | null;
};
export type PollVote = {
    pollId: string;
    uid: string;
    optionId: string;
    createdAt: number | null;
    updatedAt: number | null;
};
export declare function emptyPollCounts(options: PollOption[]): Record<string, number>;
export declare function withPollCompatDefaults(partial: Partial<Poll> & Pick<Poll, "id" | "surface" | "question" | "options">): Poll;
//# sourceMappingURL=types.d.ts.map