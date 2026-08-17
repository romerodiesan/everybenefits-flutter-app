"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pickPollsForSurface, type Poll, type PollSurface } from "@pulse/shared";
import { useAuth } from "@/lib/providers/auth-provider";
import { watchActivePolls, watchMyPollVotes, votePoll } from "@/lib/firebase/polls";
import { dismissPoll, isPollDismissed } from "@/lib/poll-dismiss";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";

export function usePolls(surface: PollSurface) {
  const { profile } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [dismissTick, setDismissTick] = useState(0);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useVisibleSubscription(true, () => {
    return watchActivePolls(setPolls, () => setPolls([]));
  }, []);

  const visible = useMemo(() => {
    void dismissTick;
    return pickPollsForSurface(polls, surface, {
      role: profile?.role ?? null,
      isAnonymous: profile?.isAnonymous === true,
    }).filter((poll) => {
      if (poll.dismissible === false) return true;
      return !isPollDismissed(poll.id, poll.version);
    });
  }, [polls, surface, profile?.role, profile?.isAnonymous, dismissTick]);

  const visibleIds = useMemo(
    () => visible.map((poll) => poll.id).join("|"),
    [visible],
  );
  const uid = profile?.uid ?? "";

  useVisibleSubscription(Boolean(uid && visibleIds), () => {
    const ids = visibleIds ? visibleIds.split("|") : [];
    return watchMyPollVotes(ids, uid, setVotes, () => setVotes({}));
  }, [uid, visibleIds]);

  const count = visible.length;

  useEffect(() => {
    setIndex((current) => {
      if (count === 0) return 0;
      return Math.min(current, count - 1);
    });
  }, [count]);

  const poll = visible[index] ?? null;
  const myOptionId = poll ? (votes[poll.id] ?? null) : null;

  const dismiss = useCallback(() => {
    if (!poll || poll.dismissible === false) return;
    dismissPoll(poll.id, poll.version);
    setDismissTick((n) => n + 1);
  }, [poll]);

  const vote = useCallback(
    async (optionId: string) => {
      if (!poll || profile?.isAnonymous) return;
      setBusy(true);
      setError(null);
      try {
        await votePoll(poll.id, optionId);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String(err.message)
            : "";
        setError(message || "vote-failed");
      } finally {
        setBusy(false);
      }
    },
    [poll, profile?.isAnonymous],
  );

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count === 0) return;
      setIndex(((nextIndex % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => {
    setIndex((current) => (count === 0 ? 0 : (current + 1) % count));
  }, [count]);

  const prev = useCallback(() => {
    setIndex((current) => (count === 0 ? 0 : (current - 1 + count) % count));
  }, [count]);

  return {
    polls: visible,
    poll,
    myOptionId,
    index,
    count,
    busy,
    error,
    dismiss,
    vote,
    goTo,
    next,
    prev,
    canVote: Boolean(profile && !profile.isAnonymous),
  };
}
