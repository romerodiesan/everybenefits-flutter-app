"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SVGProps,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { DocumentSnapshot } from "firebase/firestore";
import { Link, useRouter } from "@/i18n/navigation";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  addReply,
  castForumVote,
  createThread,
  fetchReplyVotes,
  fetchThreadVotes,
  queryThreads,
  setAcceptedReply,
  watchReplies,
  watchThread,
  watchThreadVote,
} from "@/lib/firebase/forums";
import { canParticipateInForums, headlineName } from "@/lib/roles";
import { FORUM_TAGS, type ForumReply, type ForumThread } from "@/lib/types";
import {
  toggleSavedThread,
  useSavedThread,
  useSavedThreadIds,
} from "@/lib/saved-threads";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import {
  Avatar,
  Button,
  Input,
  Label,
  TextArea,
} from "@/components/ui/primitives";
import { ShareToChatDialog } from "@/components/forums/share-to-chat-dialog";
import { TagEditor } from "@/components/forums/tag-controls";
import { FeedSideRail } from "@/components/forums/feed-side-rail";

function formatRelative(
  date: Date | null | undefined,
  justNow: string,
  locale?: string,
) {
  if (!date) return justNow;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return justNow;
  }
}

function IconHeart({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComment(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v6A2.5 2.5 0 0 1 17.5 16H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-6A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M4 12v6.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V12M12 3.5v11M8 7l4-3.5L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBookmark({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14.2l-7-3.6-7 3.6V6A1.5 1.5 0 0 1 6.5 4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ActionButton({
  children,
  onClick,
  href,
  active,
  disabled,
  className = "",
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const base = `group/act relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition disabled:opacity-40 ${
    active ? "text-brand" : "text-muted hover:bg-brand/[0.06] hover:text-ink"
  } ${className}`;
  if (href) {
    return (
      <Link href={href} className={base} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={base}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="feed-card overflow-hidden p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="feed-shimmer h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="feed-shimmer h-3 w-28 rounded-full" />
              <div className="feed-shimmer h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="feed-shimmer h-4 w-[88%] rounded-full" />
            <div className="feed-shimmer h-3 w-full rounded-full" />
            <div className="feed-shimmer h-3 w-[72%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LikeBurst({ active }: { active: boolean }) {
  const reduce = useSafeReducedMotion();
  if (!active || reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute text-brand"
          initial={{ opacity: 1, scale: 0.4, y: 0, x: 0 }}
          animate={{
            opacity: 0,
            scale: 1.1,
            y: -28 - (i % 3) * 8,
            x: (i - 2) * 14,
          }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <IconHeart filled width={10} height={10} />
        </motion.span>
      ))}
    </span>
  );
}

type FeedMode = "fresh" | "pulse" | "saved";

export function ForumsHome() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const pulseAiEnabled = usePulseAiEnabled();
  const reduceMotion = useSafeReducedMotion();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [mode, setMode] = useState<FeedMode>("fresh");
  const [tag, setTag] = useState(() => searchParams.get("tag") ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["general"]);
  const [busy, setBusy] = useState(false);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [burstId, setBurstId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<ForumThread | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const saved = useSavedThreadIds();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });

  const canPost =
    profile && canParticipateInForums(profile.role, profile.isAnonymous);
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
    if (mode === "saved" || !cursor || loadingMore) return;
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
  }, [cursor, loadingMore, mode, sort, tag, loadVotes]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || mode === "saved") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadMore, mode, threads.length]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!profile || !canPost) return;
    setBusy(true);
    try {
      const id = await createThread({ title, body, tags, author: profile });
      setShowCreate(false);
      setTitle("");
      setBody("");
      setTags(["general"]);
      router.push(`/home/${id}`);
    } finally {
      setBusy(false);
    }
  }

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
    const fromFeed = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (fromFeed.length) return fromFeed.slice(0, 10);
    return FORUM_TAGS.slice(0, 8).map((item) => [item, 0] as [string, number]);
  }, [threads]);

  const liveVoices = useMemo(() => {
    const authors = new Set(threads.map((t) => t.authorId));
    return Math.max(authors.size, threads.length ? 1 : 0);
  }, [threads]);

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

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-6 px-3 md:px-4 xl:grid-cols-[minmax(0,680px)_280px] xl:justify-center">
      <div className="relative flex w-full max-w-[680px] flex-col xl:max-w-none">
        <header className="pt-5">
          <div className="flex items-start justify-between gap-3 pr-14 lg:pr-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                Pulse
              </p>
              <h1 className="font-display text-[1.65rem] font-bold leading-tight tracking-tight">
                {greetingName
                  ? t(helloKey, { name: greetingName })
                  : t("forumsTitle")}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/50 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                <span>
                  {t("forumsLiveVoices", { count: liveVoices || 3 })}
                </span>
              </div>
            </div>
            {canPost && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-sm font-bold text-on-brand shadow-[0_10px_28px_-12px] shadow-brand transition hover:brightness-110"
              >
                <span className="text-lg leading-none">+</span>
                {t("forumsAsk")}
              </button>
            )}
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-1 flex py-3">
          <div className="feed-segment">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`relative h-8 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                  mode === item.id ? "text-brand" : "text-muted hover:text-ink"
                }`}
              >
                {mode === item.id && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "feed-mode-pill"}
                    className="absolute inset-0 rounded-full bg-brand/14"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex-1 space-y-4 pb-4">
        {/* Trending topics rail — the side rail covers this on xl */}
        <section aria-label={t("forumsTrending")} className="xl:hidden">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {t("forumsTrending")}
            </h2>
            {tag && (
              <button
                type="button"
                onClick={() => setTag("")}
                className="text-[11px] font-semibold text-brand"
              >
                {t("forumsClearFilter")}
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setTag("")}
              className={`feed-topic shrink-0 ${!tag ? "feed-topic-active" : ""}`}
            >
              {t("forumsAllTags")}
            </button>
            {topicStats.map(([item, count]) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTag(item === tag ? "" : item);
                  if (mode === "saved") setMode("fresh");
                }}
                className={`feed-topic shrink-0 ${tag === item ? "feed-topic-active" : ""}`}
              >
                <span>#{item}</span>
                {count > 0 && (
                  <span className="ml-1.5 rounded-full bg-ink/8 px-1.5 py-px text-[10px] font-bold tabular-nums dark:bg-white/10">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Composer */}
        {canPost && (
          <AnimatePresence mode="wait">
            {!showCreate ? (
              <motion.button
                key="composer-idle"
                type="button"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                onClick={() => setShowCreate(true)}
                className="feed-card flex w-full items-center gap-3 p-3.5 text-left transition hover:ring-1 hover:ring-brand/25"
              >
                <Avatar
                  name={headlineName(profile)}
                  photoUrl={profile.photoUrl}
                  size={42}
                />
                <span className="flex h-11 flex-1 items-center rounded-2xl border border-dashed border-glass-border bg-mesh/60 px-4 text-sm text-muted">
                  {t("forumsComposerPrompt")}
                </span>
                <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-brand/12 text-brand sm:inline-flex">
                  <IconSpark />
                </span>
              </motion.button>
            ) : (
              <motion.form
                key="composer-open"
                onSubmit={onCreate}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                className="feed-card space-y-3 p-4 ring-1 ring-brand/20"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={headlineName(profile)}
                    photoUrl={profile.photoUrl}
                    size={36}
                  />
                  <div>
                    <p className="font-display text-sm font-bold">
                      {t("createThreadTitle")}
                    </p>
                    <p className="text-[11px] text-muted">
                      {t("forumsComposerHint")}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>{t("createThreadTitle")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    required
                    placeholder={t("forumsComposerTitleHint")}
                  />
                </div>
                <div>
                  <Label>{t("createThreadBody")}</Label>
                  <TextArea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    placeholder={t("forumsComposerBodyHint")}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FORUM_TAGS.slice(0, 6).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setTags((prev) =>
                          prev.includes(item)
                            ? prev
                            : [...prev.slice(0, 4), item],
                        )
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        tags.includes(item)
                          ? "bg-brand text-on-brand"
                          : "bg-brand/10 text-brand hover:bg-brand/16"
                      }`}
                    >
                      #{item}
                    </button>
                  ))}
                </div>
                <TagEditor value={tags} onChange={setTags} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreate(false)}
                  >
                    {t("forumsComposerCancel")}
                  </Button>
                  <Button type="submit" disabled={busy || !tags.length}>
                    {t("createThreadSubmit")}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        )}

        {/* Spotlight */}
        {spotlight && mode !== "saved" && !loading && (
          <Link
            href={`/home/${spotlight.id}`}
            className="feed-spotlight group relative block overflow-hidden rounded-2xl p-4 md:p-5"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                <IconSpark width={14} height={14} />
                {t("forumsSpotlight")}
              </div>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight md:text-2xl">
                {spotlight.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                {spotlight.body}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar
                    name={spotlight.authorName}
                    photoUrl={spotlight.authorPhotoUrl}
                    size={22}
                  />
                  {spotlight.authorName}
                </span>
                <span>
                  {t("forumsCommentsCount", { count: spotlight.replyCount })}
                </span>
                <span className="text-brand group-hover:underline">
                  {t("forumsJoinThread")} →
                </span>
              </div>
            </div>
          </Link>
        )}

        {loading && <FeedSkeleton />}

        {!loading && visibleThreads.length === 0 && (
          <div className="feed-card px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/12 text-brand">
              <IconSpark width={22} height={22} />
            </div>
            <p className="font-display text-lg font-bold">
              {mode === "saved"
                ? t("forumsSavedEmptyTitle")
                : t("forumsEmptyTitle")}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {mode === "saved" ? t("forumsSavedEmpty") : t("forumsEmpty")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {visibleThreads.map((thread, index) => {
            const isHot = thread.score >= 3 || thread.replyCount >= 3;
            const liked = likes[thread.id] === 1;
            const isOwn = profile?.uid === thread.authorId;
            const likeCount = Math.max(0, thread.score);
            const isSaved = saved.has(thread.id);
            const isSpotlightCard = spotlight?.id === thread.id && index === 0;

            if (isSpotlightCard && mode !== "saved") {
              // Already featured above — keep in list but softer.
            }

            return (
              <motion.article
                key={thread.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: reduceMotion ? 0 : Math.min(index, 6) * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`feed-card group relative overflow-hidden ${
                  isHot ? "feed-card-hot" : ""
                }`}
              >
                <div
                  onClick={(e) => onCardPointer(thread, e.timeStamp)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (likes[thread.id] !== 1) void toggleLike(thread, true);
                  }}
                  className="px-4 pb-2 pt-4 md:px-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative ${
                        isHot
                          ? "rounded-full ring-2 ring-brand/35 ring-offset-2 ring-offset-[var(--mesh-deep)]"
                          : ""
                      }`}
                    >
                      <Avatar
                        name={thread.authorName}
                        photoUrl={thread.authorPhotoUrl}
                        size={44}
                      />
                      {isHot && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] text-on-brand">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">
                          {thread.authorName}
                        </span>
                        <span className="text-muted/50">·</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {formatRelative(thread.createdAt, t("forumsJustNow"))}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(thread.id);
                          }}
                          className={`ml-auto rounded-lg p-1.5 transition ${
                            isSaved
                              ? "text-brand"
                              : "text-muted opacity-0 hover:bg-brand/8 hover:text-ink group-hover:opacity-100"
                          }`}
                          aria-label={t("forumsSave")}
                        >
                          <IconBookmark filled={isSaved} />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {isHot && (
                          <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                            {t("forumsHot")}
                          </span>
                        )}
                        {thread.acceptedReplyId && (
                          <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                            {t("threadAccepted")}
                          </span>
                        )}
                        {thread.tags.slice(0, 3).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTag(item);
                              setMode("fresh");
                            }}
                            className="rounded-md px-1 py-0.5 text-[11px] font-medium text-muted transition hover:bg-brand/10 hover:text-brand"
                          >
                            #{item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/home/${thread.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 block"
                  >
                    <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight transition group-hover:text-brand md:text-[18px]">
                      {thread.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-[14px] leading-relaxed text-muted">
                      {thread.body}
                    </p>
                  </Link>

                  {(likeCount > 0 || thread.replyCount > 0) && (
                    <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-muted">
                      {likeCount > 0 && (
                        <span>{t("forumsLikesCount", { count: likeCount })}</span>
                      )}
                      {thread.replyCount > 0 && (
                        <Link
                          href={`/home/${thread.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-ink"
                        >
                          {t("forumsCommentsCount", {
                            count: thread.replyCount,
                          })}
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div className="mx-3 mb-2 flex items-center gap-0.5 border-t border-glass-border/80 pt-1 md:mx-4">
                  <ActionButton
                    onClick={() => toggleLike(thread, !liked)}
                    active={liked}
                    disabled={!canPost || isOwn}
                    label={t("forumsLike")}
                    className="relative"
                  >
                    <motion.span
                      key={liked ? "on" : "off"}
                      initial={reduceMotion ? false : { scale: 0.7 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="inline-flex"
                    >
                      <IconHeart filled={liked} />
                    </motion.span>
                    {likeCount > 0 ? likeCount : t("forumsLike")}
                    <LikeBurst active={burstId === thread.id} />
                  </ActionButton>
                  <ActionButton
                    href={`/home/${thread.id}`}
                    label={t("forumsComment")}
                  >
                    <IconComment />
                    {thread.replyCount > 0
                      ? thread.replyCount
                      : t("forumsComment")}
                  </ActionButton>
                  <ActionButton
                    onClick={() => setSharing(thread)}
                    disabled={!canPost}
                    label={t("forumsShare")}
                  >
                    <IconShare />
                    {t("forumsShare")}
                  </ActionButton>
                  <ActionButton
                    onClick={() => copyLink(thread)}
                    label={t("forumsCopyLink")}
                    className="max-sm:hidden"
                  >
                    {copiedId === thread.id
                      ? t("forumsCopied")
                      : t("forumsCopyLink")}
                  </ActionButton>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-glass-border/70 px-4 py-2 md:px-5">
                  {pulseAiEnabled ? (
                    <Link
                      href="/ai"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-brand"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconSpark width={12} height={12} />
                      {t("forumsAskAi")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/home/${thread.id}`}
                    className="text-[11px] font-bold text-brand opacity-0 transition group-hover:opacity-100"
                  >
                    {t("forumsOpenThread")}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        {hasMore && mode !== "saved" && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && (
              <p className="text-xs font-semibold text-muted">{t("loading")}</p>
            )}
          </div>
        )}
        </div>

        {sharing && (
          <ShareToChatDialog
            thread={sharing}
            onClose={() => setSharing(null)}
          />
        )}
      </div>

      <FeedSideRail
        topics={topicStats}
        activeTag={tag}
        onSelectTag={(next) => {
          setTag(next);
          if (mode === "saved") setMode("fresh");
        }}
        threads={threads}
        onOpenSaved={() => setMode("saved")}
      />
    </div>
  );
}

export function ThreadDetail({ threadId }: { threadId: string }) {
  const t = useTranslations();
  const { profile } = useAuth();
  const pulseAiEnabled = usePulseAiEnabled();
  const reduceMotion = useSafeReducedMotion();
  const { isSaved: saved, toggle: toggleSave } = useSavedThread(threadId);
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [vote, setVote] = useState(0);
  const [replyVotes, setReplyVotes] = useState<Record<string, number>>({});
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const replyIdsKey = useRef("");
  const repliesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const onErr = (error: Error) => {
      console.error(error);
      setActionError(t("errorGeneric"));
    };
    unsubs.push(watchThread(threadId, setThread, onErr));
    unsubs.push(watchReplies(threadId, setReplies, onErr));
    if (profile) {
      unsubs.push(watchThreadVote(threadId, profile.uid, setVote, onErr));
    }
    return () => unsubs.forEach((u) => u());
  }, [threadId, profile, t]);

  useEffect(() => {
    if (!profile || !replies.length) return;
    const key = replies.map((r) => r.id).join(",");
    if (key === replyIdsKey.current) return;
    replyIdsKey.current = key;
    let cancelled = false;
    fetchReplyVotes({
      threadId,
      uid: profile.uid,
      replyIds: replies.map((r) => r.id),
    })
      .then((votes) => {
        if (!cancelled) setReplyVotes(votes);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setActionError(t("errorGeneric"));
      });
    return () => {
      cancelled = true;
    };
  }, [replies, profile, threadId, t]);

  const canPost =
    profile && canParticipateInForums(profile.role, profile.isAnonymous);
  const isAuthor = Boolean(profile && thread && profile.uid === thread.authorId);
  const effectiveReplyVotes =
    profile && replies.length ? replyVotes : ({} as Record<string, number>);

  async function toggleThreadLike() {
    if (!thread || !canPost || isAuthor) return;
    const next = vote === 1 ? 0 : 1;
    if (next === 1) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
    }
    setActionError(null);
    try {
      await castForumVote({ threadId, vote: next });
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    }
  }

  async function toggleReplyLike(reply: ForumReply) {
    if (!canPost || reply.authorId === profile?.uid) return;
    const current = replyVotes[reply.id] === 1 ? 1 : 0;
    const next = (current === 1 ? 0 : 1) as 0 | 1;
    setReplyVotes((prev) => ({ ...prev, [reply.id]: next }));
    setActionError(null);
    try {
      await castForumVote({ threadId, replyId: reply.id, vote: next });
    } catch (error) {
      console.error(error);
      setReplyVotes((prev) => ({ ...prev, [reply.id]: current }));
      setActionError(t("errorGeneric"));
    }
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!profile || !canPost) return;
    setBusy(true);
    setActionError(null);
    try {
      await addReply({ threadId, body: replyBody, author: profile });
      setReplyBody("");
      window.setTimeout(() => {
        repliesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 80);
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccept(replyId: string) {
    if (!thread) return;
    const next = thread.acceptedReplyId === replyId ? null : replyId;
    setActionError(null);
    try {
      await setAcceptedReply(threadId, next);
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    }
  }

  if (!thread) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
        <FeedSkeleton />
      </div>
    );
  }

  const ordered = [...replies].sort((a, b) => {
    if (thread.acceptedReplyId === a.id) return -1;
    if (thread.acceptedReplyId === b.id) return 1;
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });

  const liked = vote === 1;
  const likeCount = Math.max(0, thread.score);

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-6 px-3 py-4 md:px-4 md:py-5 xl:grid-cols-[minmax(0,680px)_280px] xl:justify-center">
      <div className="relative w-full max-w-[680px] xl:max-w-none">
        <Link
          href="/home"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
        >
          ← {t("forumsBackToFeed")}
        </Link>

        <motion.article
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="feed-card relative z-10 overflow-hidden"
        >
          <div className="px-4 pt-5 md:px-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full ring-2 ring-brand/20 ring-offset-2 ring-offset-[var(--mesh-deep)]">
                <Avatar
                  name={thread.authorName}
                  photoUrl={thread.authorPhotoUrl}
                  size={48}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{thread.authorName}</p>
                <p className="text-xs text-muted">
                  {formatRelative(thread.createdAt, t("forumsJustNow"))}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSave}
                className={`rounded-xl p-2 transition ${
                  saved ? "bg-brand/12 text-brand" : "text-muted hover:bg-brand/8"
                }`}
                aria-label={t("forumsSave")}
              >
                <IconBookmark filled={saved} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {thread.tags.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-brand/12 px-2.5 py-1 text-[11px] font-bold text-brand"
                >
                  #{item}
                </span>
              ))}
            </div>

            <h1 className="mt-4 font-display text-[1.7rem] font-bold leading-[1.15] tracking-tight md:text-[2rem]">
              {thread.title}
            </h1>
            <p className="mt-3 whitespace-pre-wrap pb-4 text-[15px] leading-relaxed text-ink/95">
              {thread.body}
            </p>

            {(likeCount > 0 || thread.replyCount > 0) && (
              <div className="flex items-center gap-3 border-t border-glass-border py-2.5 text-xs font-semibold text-muted">
                {likeCount > 0 && (
                  <span>{t("forumsLikesCount", { count: likeCount })}</span>
                )}
                {thread.replyCount > 0 && (
                  <span>
                    {t("forumsCommentsCount", { count: thread.replyCount })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mx-3 mb-2 flex items-center gap-0.5 border-t border-glass-border pt-1 md:mx-4">
            <ActionButton
              onClick={toggleThreadLike}
              active={liked}
              disabled={!canPost || isAuthor}
              className="relative"
            >
              <motion.span
                key={liked ? "on" : "off"}
                initial={reduceMotion ? false : { scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="inline-flex"
              >
                <IconHeart filled={liked} />
              </motion.span>
              {liked ? t("forumsLiked") : t("forumsLike")}
              <LikeBurst active={burst} />
            </ActionButton>
            <ActionButton
              onClick={() =>
                repliesRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <IconComment />
              {t("forumsComment")}
            </ActionButton>
            {canPost && (
              <ActionButton onClick={() => setShowShare(true)}>
                <IconShare />
                {t("forumsShare")}
              </ActionButton>
            )}
            {pulseAiEnabled && (
              <Link
                href="/ai"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold text-muted transition hover:bg-brand/[0.06] hover:text-brand"
              >
                <IconSpark />
                AI
              </Link>
            )}
          </div>
        </motion.article>

        {actionError && (
          <p className="relative z-10 mt-3 text-sm text-red-400">{actionError}</p>
        )}

        <section ref={repliesRef} className="relative z-10 mt-7 scroll-mt-4 pb-4">
          <h2 className="mb-3 font-display text-lg font-bold">
            {t("forumsCommentsCount", { count: replies.length })}
          </h2>

          <div className={`space-y-3 ${canPost ? "pb-10" : "pb-4"}`}>
            {ordered.map((reply, index) => {
              const rLiked = effectiveReplyVotes[reply.id] === 1;
              const accepted = thread.acceptedReplyId === reply.id;
              const rLikeCount = Math.max(0, reply.score);
              return (
                <motion.div
                  key={reply.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03,
                  }}
                  className="flex items-start gap-2.5"
                >
                  <Avatar
                    name={reply.authorName}
                    photoUrl={reply.authorPhotoUrl}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`rounded-2xl rounded-tl-md border px-3.5 py-2.5 ${
                        accepted
                          ? "border-brand/35 bg-brand/[0.08] shadow-[0_0_0_1px] shadow-brand/10"
                          : "border-glass-border bg-sheet"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">
                          {reply.authorName}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatRelative(reply.createdAt, t("forumsJustNow"))}
                        </span>
                        {accepted && (
                          <span className="rounded-md bg-brand/14 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                            {t("threadAccepted")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">
                        {reply.body}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 pl-1.5 text-xs font-semibold text-muted">
                      <button
                        type="button"
                        onClick={() => toggleReplyLike(reply)}
                        disabled={!canPost || reply.authorId === profile?.uid}
                        className={`inline-flex items-center gap-1 transition disabled:opacity-40 ${
                          rLiked ? "text-brand" : "hover:text-ink"
                        }`}
                      >
                        <IconHeart filled={rLiked} width={15} height={15} />
                        {rLikeCount > 0 ? rLikeCount : t("forumsLike")}
                      </button>
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => toggleAccept(reply.id)}
                          className="transition hover:text-brand"
                        >
                          {accepted ? t("threadUnaccept") : t("threadAccept")}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {!ordered.length && (
              <p className="py-8 text-center text-sm text-muted">
                {t("forumsNoReplies")}
              </p>
            )}
          </div>
        </section>

        {canPost && (
          <form
            onSubmit={onReply}
            className="feed-composer-dock"
          >
            <div className="feed-card flex items-start gap-2.5 p-3.5">
              <Avatar
                name={headlineName(profile)}
                photoUrl={profile.photoUrl}
                size={36}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <TextArea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t("threadReplyPlaceholder")}
                  className="min-h-14"
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={busy}>
                    {t("threadReply")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        {showShare && (
          <ShareToChatDialog
            thread={thread}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>

      <ThreadDetailRail thread={thread} />
    </div>
  );
}

function ThreadDetailRail({ thread }: { thread: ForumThread }) {
  const router = useRouter();
  const [related, setRelated] = useState<ForumThread[]>([]);
  const [topics, setTopics] = useState<[string, number][]>([]);

  useEffect(() => {
    let cancelled = false;
    const primaryTag = thread.tags[0];
    queryThreads({ sort: "relevant", tag: primaryTag })
      .then((page) => {
        if (cancelled) return;
        const others = page.threads.filter((item) => item.id !== thread.id);
        setRelated(others.slice(0, 4));
        const counts = new Map<string, number>();
        for (const item of page.threads) {
          for (const tag of item.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
        setTopics(
          [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thread.id, thread.tags]);

  return (
    <FeedSideRail
      topics={topics}
      activeTag={thread.tags[0] ?? ""}
      onSelectTag={(tag) => {
        if (tag) router.push(`/home?tag=${encodeURIComponent(tag)}`);
        else router.push("/home");
      }}
      threads={related}
      related={related}
    />
  );
}
