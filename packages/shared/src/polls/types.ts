import {
  PROMO_BANNER_AUDIENCES,
  PROMO_BANNER_SURFACES,
  type PromoBannerAudience,
  type PromoBannerLocalizedString,
  type PromoBannerSurface,
} from "../banners/types";

export const POLL_SURFACES = PROMO_BANNER_SURFACES;
export type PollSurface = PromoBannerSurface;

export const POLL_AUDIENCES = PROMO_BANNER_AUDIENCES;
export type PollAudience = PromoBannerAudience;

export type PollLocalizedString = PromoBannerLocalizedString;

export const POLL_LIMITS = {
  question: 140,
  option: 48,
  minOptions: 2,
  maxOptions: 6,
} as const;

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

export function emptyPollCounts(options: PollOption[]): Record<string, number> {
  return Object.fromEntries(options.map((option) => [option.id, 0]));
}

export function withPollCompatDefaults(
  partial: Partial<Poll> &
    Pick<Poll, "id" | "surface" | "question" | "options">,
): Poll {
  const options = partial.options?.length
    ? partial.options
    : [
        { id: "o1", label: { en: "", es: "" } },
        { id: "o2", label: { en: "", es: "" } },
      ];
  const counts = { ...emptyPollCounts(options), ...(partial.counts ?? {}) };
  for (const option of options) {
    counts[option.id] = Math.max(0, Number(counts[option.id] ?? 0));
  }
  return {
    id: partial.id,
    version: partial.version ?? 1,
    active: partial.active === true,
    surface: partial.surface ?? "home",
    audiences: partial.audiences?.length ? partial.audiences : ["all"],
    question: partial.question,
    options,
    allowChange: partial.allowChange === true,
    showResultsBeforeVote: partial.showResultsBeforeVote === true,
    dismissible: partial.dismissible !== false,
    counts,
    voteCount: Math.max(0, Number(partial.voteCount ?? 0)),
    startsAt: partial.startsAt ?? null,
    endsAt: partial.endsAt ?? null,
    createdAt: partial.createdAt ?? null,
    updatedAt: partial.updatedAt ?? null,
    updatedBy: partial.updatedBy ?? null,
  };
}
