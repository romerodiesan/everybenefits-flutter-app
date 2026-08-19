import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import {
  withPollCompatDefaults,
  type Poll,
  type PollAudience,
  type PollLocalizedString,
  type PollOption,
  type PollSurface,
} from "@pulse/shared";
import { getFirebaseDb } from "./client";

function localized(value: unknown): PollLocalizedString {
  if (!value || typeof value !== "object") return { en: "", es: "" };
  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : "",
    es: typeof record.es === "string" ? record.es : "",
  };
}

function millisOrNull(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn.call(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapPoll(id: string, data: Record<string, unknown>): Poll {
  const options: PollOption[] = Array.isArray(data.options)
    ? data.options
        .map((raw, index) => {
          if (!raw || typeof raw !== "object") return null;
          const record = raw as Record<string, unknown>;
          return {
            id:
              typeof record.id === "string" && record.id.trim()
                ? record.id.trim()
                : `o${index + 1}`,
            label: localized(record.label),
          };
        })
        .filter((option): option is PollOption => Boolean(option))
    : [];
  const counts: Record<string, number> = {};
  if (data.counts && typeof data.counts === "object") {
    for (const [key, value] of Object.entries(
      data.counts as Record<string, unknown>,
    )) {
      const n = Number(value);
      if (Number.isFinite(n)) counts[key] = n;
    }
  }
  return withPollCompatDefaults({
    id,
    version: typeof data.version === "number" ? data.version : 1,
    active: data.active === true,
    surface: (data.surface as PollSurface) ?? "home",
    audiences: Array.isArray(data.audiences)
      ? (data.audiences.map(String) as PollAudience[])
      : ["all"],
    question: localized(data.question),
    options,
    allowChange: data.allowChange === true,
    showResultsBeforeVote: data.showResultsBeforeVote === true,
    dismissible: data.dismissible !== false,
    counts,
    voteCount: typeof data.voteCount === "number" ? data.voteCount : 0,
    startsAt: millisOrNull(data.startsAt),
    endsAt: millisOrNull(data.endsAt),
    createdAt: millisOrNull(data.createdAt),
    updatedAt: millisOrNull(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  });
}

/** Live tallies for the selected poll. Writes still go through callables. */
export function watchPoll(
  pollId: string,
  onChange: (poll: Poll) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "polls", pollId),
    (snap) => {
      if (!snap.exists()) return;
      onChange(mapPoll(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => {
      onError?.(error);
    },
  );
}
