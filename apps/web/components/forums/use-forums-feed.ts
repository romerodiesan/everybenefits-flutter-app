"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { DocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  castForumVote,
  fetchThreadVotes,
  getThreads,
  queryThreads,
} from "@/lib/firebase/forums";
import { canParticipateInForums, headlineName } from "@/lib/roles";
import type { ForumThread } from "@/lib/types";
import {
  toggleSavedThread,
  removeSavedThread,
  useSavedThreadIds,
} from "@/lib/saved-threads";

const SAVED_CHUNK = 10;

export type FeedMode = "fresh" | "pulse" | "saved";

export function useForumsFeed() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [mode, setMode] = useState<FeedMode>("fresh");
  const [tag, setTag] = useState(() => searchParams.get("tag") ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [savedOffset, setSavedOffset] = useState(0);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [burstId, setBurstId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<ForumThread | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const saved = useSavedThreadIds();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });

  const canPost = Boolean(
    profile && canParticipateInForums(profile.role, profile.isAnonymous),
  );
  const sort = mode === "pulse" ? "relevant" : "recent";

  const loadVotes = useCallback(
    async (ids: string[]) => {
      if (!profile || !ids.length) return;
      try {
        const map = await fetchThreadVotes({ uid: profile.uid, threadIds: ids });
        setLikes((prev) => ({ ...prev, ...map }));
      } catch {
        // Non-fatal
      }
    },
    [profile],
  );

  const queryKey = `${mode}:${sort}:${tag}`;
  const [activeQuery, setActiveQuery] = useState(queryKey);
  if (activeQuery !== queryKey) {
    setActiveQuery(queryKey);
    if (mode !== "saved") {
      setLoading(true);
      setCursor(null);
    }
  }

  useEffect(() => {
    if (mode !== "saved") return;
    let cancelled = false;
    setLoading(true);
    setSavedOffset(0);
    const ids = [...saved];
    if (!ids.length) {
      setThreads([]);
      setHasMore(false);
      setCursor(null);
      setLoading(false);
      return;
    }
    const first = ids.slice(0, SAVED_CHUNK);
    void getThreads(first)
      .then((found) => {
        if (cancelled) return;
        const foundIds = new Set(found.map((thread) => thread.id));
        for (const id of first) {
          if (!foundIds.has(id)) removeSavedThread(id);
        }
        setThreads(found);
        setSavedOffset(first.length);
        setHasMore(ids.length > first.length);
        setCursor(null);
        setLoading(false);
        void loadVotes(found.map((thread) => thread.id));
      })
      .catch(() => {
        if (cancelled) return;
        setThreads([]);
        setHasMore(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Only reload when entering saved mode or saved set identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, saved.size, loadVotes]);

  useEffect(() => {
    if (mode === "saved") return;
    let cancelled = false;
    queryThreads({ sort, tag: tag || undefined })
      .then((page) => {
        if (cancelled) return;
        setThreads(page.threads);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
        void loadVotes(page.threads.map((thread) => thread.id));
      })
      .catch(() => {
        if (!cancelled) {
          setThreads([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, tag, mode, loadVotes]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (mode === "saved") {
      const ids = [...saved];
      const next = ids.slice(savedOffset, savedOffset + SAVED_CHUNK);
      if (!next.length) {
        setHasMore(false);
        return;
      }
      setLoadingMore(true);
      try {
        const found = await getThreads(next);
        const foundIds = new Set(found.map((thread) => thread.id));
        for (const id of next) {
          if (!foundIds.has(id)) removeSavedThread(id);
        }
        setThreads((prev) => [...prev, ...found]);
        const nextOffset = savedOffset + next.length;
        setSavedOffset(nextOffset);
        setHasMore(nextOffset < ids.length);
        void loadVotes(found.map((thread) => thread.id));
      } finally {
        setLoadingMore(false);
      }
      return;
    }
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await queryThreads({
        sort,
        tag: tag || undefined,
        cursor,
      });
      setThreads((prev) => [...prev, ...page.threads]);
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
      void loadVotes(page.threads.map((thread) => thread.id));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, mode, sort, tag, loadVotes, saved, savedOffset]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadMore, threads.length]);

  async function toggleLike(thread: ForumThread, withBurst = false) {
    if (!profile || !canPost || thread.authorId === profile.uid) return;
    const current = likes[thread.id] === 1 ? 1 : 0;
    const next = current === 1 ? 0 : 1;
    if (next === 1 && withBurst) {
      setBurstId(thread.id);
      window.setTimeout(() => setBurstId((id) => (id === thread.id ? null : id)), 600);
    }
    setLikes((prev) => ({ ...prev, [thread.id]: next }));
    setThreads((prev) =>
      prev.map((item) =>
        item.id === thread.id
          ? { ...item, score: item.score + (next - current) }
          : item,
      ),
    );
    try {
      await castForumVote({ threadId: thread.id, vote: next });
    } catch {
      setLikes((prev) => ({ ...prev, [thread.id]: current }));
      setThreads((prev) =>
        prev.map((item) =>
          item.id === thread.id
            ? { ...item, score: item.score - (next - current) }
            : item,
        ),
      );
    }
  }

  function onCardPointer(thread: ForumThread, timeStamp: number) {
    const last = lastTapRef.current;
    if (last.id === thread.id && timeStamp - last.at < 320) {
      lastTapRef.current = { id: "", at: 0 };
      if (likes[thread.id] !== 1) void toggleLike(thread, true);
      return;
    }
    lastTapRef.current = { id: thread.id, at: timeStamp };
  }

  function toggleSave(id: string) {
    toggleSavedThread(id);
  }

  async function copyLink(thread: ForumThread) {
    try {
      const url = `${window.location.origin}/home/${thread.id}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(thread.id);
      window.setTimeout(() => setCopiedId((id) => (id === thread.id ? null : id)), 1600);
    } catch {
      setSharing(thread);
    }
  }

  const topicStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const thread of threads) {
      for (const item of thread.tags) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [threads]);

  const [onlineCount, setOnlineCount] = useState(0);
  useEffect(() => {
    let stop: (() => void) | undefined;
    void import("@/lib/firebase/presence").then(({ watchOnlineCount }) => {
      stop = watchOnlineCount(setOnlineCount, () => setOnlineCount(0));
    });
    return () => stop?.();
  }, []);

  const spotlight = useMemo(() => {
    if (mode === "saved" || !threads.length) return null;
    return [...threads].sort(
      (a, b) =>
        b.score + b.replyCount * 2 - (a.score + a.replyCount * 2),
    )[0];
  }, [threads, mode]);

  const visibleThreads = useMemo(() => {
    if (mode !== "saved") return threads;
    return threads.filter((thread) => saved.has(thread.id));
  }, [mode, threads, saved]);

  // Saved mode filters the loaded list; refresh recent so bookmarks outside
  // the previous sort/tag page can still appear.
  useEffect(() => {
    if (mode !== "saved") return;
    let cancelled = false;
    queryThreads({ sort: "recent" })
      .then((page) => {
        if (cancelled) return;
        setThreads(page.threads);
        void loadVotes(page.threads.map((thread) => thread.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, loadVotes]);

  const greetingName = profile ? headlineName(profile).split(" ")[0] : "";
  const dayPart = useSyncExternalStore(
    () => () => {},
    () => {
      const hour = new Date().getHours();
      if (hour < 12) return "morning" as const;
      if (hour < 18) return "afternoon" as const;
      return "evening" as const;
    },
    () => "afternoon" as const,
  );
  const helloKey =
    dayPart === "morning"
      ? "forumsHelloMorning"
      : dayPart === "evening"
        ? "forumsHelloEvening"
        : "forumsHelloAfternoon";

  const modes: { id: FeedMode; label: string }[] = [
    { id: "fresh", label: t("forumsModeFresh") },
    { id: "pulse", label: t("forumsModePulse") },
    { id: "saved", label: t("forumsModeSaved") },
  ];

  return {
    profile,
    threads,
    mode,
    setMode,
    tag,
    setTag,
    loading,
    loadingMore,
    hasMore,
    likes,
    burstId,
    sharing,
    setSharing,
    copiedId,
    saved,
    sentinelRef,
    canPost,
    topicStats,
    onlineCount,
    spotlight,
    visibleThreads,
    greetingName,
    helloKey,
    modes,
    toggleLike,
    onCardPointer,
    toggleSave,
    copyLink,
  };
}
