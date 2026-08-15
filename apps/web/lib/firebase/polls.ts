import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  withPollCompatDefaults,
  type Poll,
  type PollAudience,
  type PollLocalizedString,
  type PollOption,
  type PollSurface,
} from "@pulse/shared";
import { getFirebaseDb } from "./client";
import { callCloudFunction } from "./call-function";

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

/** Watch active polls (one query; client filters by surface/audience). */
export function watchActivePolls(
  onChange: (polls: Poll[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "polls"),
    where("active", "==", true),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((entry) =>
          mapPoll(entry.id, entry.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => {
      onError?.(error);
      onChange([]);
    },
  );
}

/** Own vote docs only — rules deny reading other users' votes. */
export function watchMyPollVotes(
  pollIds: string[],
  uid: string,
  onChange: (votes: Record<string, string>) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const ids = [...new Set(pollIds.filter(Boolean))];
  if (!uid || ids.length === 0) {
    onChange({});
    return () => undefined;
  }
  const votes: Record<string, string> = {};
  const unsubs = ids.map((pollId) =>
    onSnapshot(
      doc(getFirebaseDb(), "polls", pollId, "votes", uid),
      (snap) => {
        const optionId = snap.data()?.optionId;
        if (typeof optionId === "string" && optionId) {
          votes[pollId] = optionId;
        } else {
          delete votes[pollId];
        }
        onChange({ ...votes });
      },
      (error) => {
        onError?.(error);
        delete votes[pollId];
        onChange({ ...votes });
      },
    ),
  );
  return () => {
    for (const stop of unsubs) stop();
  };
}

export async function votePoll(
  pollId: string,
  optionId: string,
): Promise<{ optionId: string; poll: Poll | null }> {
  const data = await callCloudFunction<{
    optionId?: string;
    poll?: Record<string, unknown>;
  }>("votePoll", { pollId, optionId });
  return {
    optionId: String(data?.optionId ?? optionId),
    poll: data?.poll ? mapPoll(String(data.poll.id ?? pollId), data.poll) : null,
  };
}
