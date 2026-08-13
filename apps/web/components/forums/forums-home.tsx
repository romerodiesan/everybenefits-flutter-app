"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { DocumentSnapshot } from "firebase/firestore";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import {
  castForumVote,
  createThread,
  fetchThreadVotes,
  getThreadsByIds,
  queryThreads,
} from "@/lib/firebase/forums";
import { headlineName } from "@/lib/display-name";
import { canParticipateInForums } from "@/lib/roles";
import { FORUM_TAGS, type ForumThread } from "@/lib/types";
import {
  removeSavedThread,
  toggleSavedThread,
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
import { HomePromoBanner } from "@/components/promo/promo-banner";
import { fetchForumAudienceSize } from "@/lib/firebase/forum-audience";
import { isForumHotThread, pickForumSpotlight } from "@/lib/forums-spotlight";
import {
  ActionButton,
  FeedSkeleton,
  formatRelative,
  IconBookmark,
  IconComment,
  IconHeart,
  IconShare,
  IconSpark,
  LikeBurst,
} from "@/components/forums/forum-ui";
export { ThreadDetail } from "@/components/forums/thread-detail";

type FeedMode = "fresh" | "pulse" | "saved";

export function ForumsHome() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const access = useAccess();
  const reduceMotion = useSafeReducedMotion();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [mode, setMode] = useState<FeedMode>("fresh");
  const [tag, setTag] = useState(() => searchParams.get("tag") ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
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
  const [audienceSize, setAudienceSize] = useState(0);
  const saved = useSavedThreadIds();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });

  const canPost =
    profile && canParticipateInForums(access, profile.isAnonymous);
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

  const savedKey = [...saved].slice().sort().join(",");

  useEffect(() => {
    if (mode !== "saved") return;
    let cancelled = false;
    setLoading(true);
    setFeedError(null);
    const ids = [...saved];
    void getThreadsByIds(ids)
      .then((found) => {
        if (cancelled) return;
        const foundIds = new Set(found.map((thread) => thread.id));
        for (const id of ids) {
          if (!foundIds.has(id)) removeSavedThread(id);
        }
        setThreads(found);
        setHasMore(false);
        setCursor(null);
        setFeedError(null);
        setLoading(false);
        void loadVotes(found.map((thread) => thread.id));
      })
      .catch(() => {
        if (!cancelled) {
          setThreads([]);
          setFeedError(t("errorGeneric"));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // savedKey captures membership identity (not only size).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saved is read via savedKey
  }, [mode, savedKey, loadVotes, t]);

  useEffect(() => {
    if (mode === "saved") return;
    let cancelled = false;
    setLoading(true);
    setFeedError(null);
    setCursor(null);
    queryThreads({ sort, tag: tag || undefined })
      .then((page) => {
        if (cancelled) return;
        setThreads(page.threads);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
        setFeedError(null);
        void loadVotes(page.threads.map((thread) => thread.id));
      })
      .catch(() => {
        if (!cancelled) {
          setThreads([]);
          setHasMore(false);
          setFeedError(t("errorGeneric"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, tag, mode, loadVotes, t]);

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

  useEffect(() => {
    let cancelled = false;
    void fetchForumAudienceSize()
      .then((size) => {
        if (!cancelled) setAudienceSize(size);
      })
      .catch(() => {
        if (!cancelled) setAudienceSize(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const spotlight = useMemo(() => {
    if (mode === "saved") return null;
    return pickForumSpotlight(threads, audienceSize);
  }, [threads, mode, audienceSize]);

  const visibleThreads = useMemo(() => {
    if (mode === "saved") return threads;
    // Don't duplicate the hero Spotlight in the list.
    if (!spotlight) return threads;
    return threads.filter((thread) => thread.id !== spotlight.id);
  }, [mode, threads, spotlight]);

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
        <header className="pt-2 lg:pt-5">
          <div className="flex items-start justify-between gap-3 pr-2 sm:pr-14 lg:pr-0">
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
                  {t("forumsOnlineCount", { count: onlineCount })}
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
                    size="sm"
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
                    size="sm"
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

        <HomePromoBanner />

        {feedError && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {feedError}
          </p>
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
            const isHot = isForumHotThread(thread, audienceSize);
            const liked = likes[thread.id] === 1;
            const isOwn = profile?.uid === thread.authorId;
            const likeCount = Math.max(0, thread.score);
            const isSaved = saved.has(thread.id);

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
                              : "text-muted opacity-100 hover:bg-brand/8 hover:text-ink lg:opacity-0 lg:group-hover:opacity-100"
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

                <div className="flex items-center justify-end border-t border-dashed border-glass-border/70 px-4 py-2 md:px-5">
                  <Link
                    href={`/home/${thread.id}`}
                    className="text-[11px] font-bold text-brand opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100"
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
              <div className="w-full max-w-xl px-2" aria-busy="true">
                <div className="feed-card space-y-2 p-4">
                  <div className="feed-shimmer h-3 w-1/3 rounded-full" />
                  <div className="feed-shimmer h-3 w-full rounded-full" />
                  <div className="feed-shimmer h-3 w-2/3 rounded-full" />
                </div>
              </div>
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
