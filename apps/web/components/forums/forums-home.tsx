"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  addReply,
  castForumVote,
  deleteReply,
  deleteThread,
  fetchReplyVotes,
  queryThreads,
  setAcceptedReply,
  setThreadClosed,
  updateReply,
  updateThread,
  watchReplies,
  watchThread,
  watchThreadVote,
} from "@/lib/firebase/forums";
import {
  canParticipateInForums,
  headlineName,
  parseRole,
} from "@/lib/roles";
import type { ForumReply, ForumThread } from "@/lib/types";
import { removeSavedThread, useSavedThread } from "@/lib/saved-threads";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import {
  Avatar,
  Button,
  Input,
  Label,
  TextArea,
} from "@pulse/ui";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { ShareToChatDialog } from "@/components/forums/share-to-chat-dialog";
import { TagEditor } from "@/components/forums/tag-controls";
import { FeedSideRail } from "@/components/forums/feed-side-rail";
import { ForumComposer } from "@/components/forums/forum-composer";
import {
  ActionButton,
  ForumThreadList,
  IconBookmark,
  IconComment,
  IconHeart,
  IconShare,
  IconSpark,
  LikeBurst,
  formatRelative,
} from "@/components/forums/forum-thread-list";
import { useForumsFeed } from "@/components/forums/use-forums-feed";

export function ForumsHome() {
  const t = useTranslations();
  const pulseAiEnabled = usePulseAiEnabled();
  const reduceMotion = useSafeReducedMotion();
  const [showCreate, setShowCreate] = useState(false);
  const feed = useForumsFeed();
  const {
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
  } = feed;

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

        {profile && canPost ? (
          <ForumComposer
            profile={profile}
            canPost={canPost}
            reduceMotion={reduceMotion}
            open={showCreate}
            onOpenChange={setShowCreate}
          />
        ) : null}

        <ForumThreadList
          mode={mode}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          visibleThreads={visibleThreads}
          spotlight={spotlight}
          likes={likes}
          burstId={burstId}
          copiedId={copiedId}
          saved={saved}
          profile={profile}
          canPost={canPost}
          pulseAiEnabled={pulseAiEnabled}
          sentinelRef={sentinelRef}
          onCardPointer={onCardPointer}
          toggleLike={toggleLike}
          toggleSave={toggleSave}
          copyLink={copyLink}
          setSharing={setSharing}
          setTag={setTag}
          setMode={setMode}
        />
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
  const router = useRouter();
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
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");
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
    Boolean(
      profile && canParticipateInForums(profile.role, profile.isAnonymous),
    ) &&
    Boolean(thread) &&
    !thread!.closed;
  const isAdmin = parseRole(profile?.role) === "admin";
  const isAuthor = Boolean(profile && thread && profile.uid === thread.authorId);
  const canManageThread = Boolean(isAuthor || isAdmin);
  const canAccept = canManageThread;
  const effectiveReplyVotes =
    profile && replies.length ? replyVotes : ({} as Record<string, number>);

  function startEditThread() {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditBody(thread.body);
    setEditTags(thread.tags.length ? [...thread.tags] : ["general"]);
    setEditingThread(true);
    setEditingReplyId(null);
    setActionError(null);
  }

  function startEditReply(reply: ForumReply) {
    setEditingReplyId(reply.id);
    setEditReplyBody(reply.body);
    setEditingThread(false);
    setActionError(null);
  }

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

  async function toggleClosed() {
    if (!thread || !canManageThread) return;
    setBusy(true);
    setActionError(null);
    try {
      await setThreadClosed(threadId, !thread.closed);
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveThread(e: FormEvent) {
    e.preventDefault();
    if (!canManageThread) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateThread({
        threadId,
        title: editTitle,
        body: editBody,
        tags: editTags,
      });
      setEditingThread(false);
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteThread() {
    if (!canManageThread) return;
    if (!window.confirm(t("threadDeleteConfirm"))) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteThread(threadId);
      removeSavedThread(threadId);
      router.replace("/home");
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
      setBusy(false);
    }
  }

  async function onSaveReply(e: FormEvent) {
    e.preventDefault();
    if (!editingReplyId) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateReply({
        threadId,
        replyId: editingReplyId,
        body: editReplyBody,
      });
      setEditingReplyId(null);
      setEditReplyBody("");
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteReply(reply: ForumReply) {
    if (!window.confirm(t("replyDeleteConfirm"))) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteReply({ threadId, replyId: reply.id });
      if (editingReplyId === reply.id) {
        setEditingReplyId(null);
        setEditReplyBody("");
      }
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    } finally {
      setBusy(false);
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
              {canManageThread && !editingThread && (
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleClosed()}
                    disabled={busy}
                    className="rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-brand/8 hover:text-brand disabled:opacity-40"
                  >
                    {thread.closed ? t("threadReopen") : t("threadClose")}
                  </button>
                  <button
                    type="button"
                    onClick={startEditThread}
                    className="rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-brand/8 hover:text-brand"
                  >
                    {t("threadEdit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteThread()}
                    disabled={busy}
                    className="rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >
                    {t("threadDelete")}
                  </button>
                </div>
              )}
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

            {editingThread ? (
              <form onSubmit={onSaveThread} className="mt-4 space-y-3 pb-4">
                <div>
                  <Label>{t("threadEditTitle")}</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>{t("threadEditBody")}</Label>
                  <TextArea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="min-h-28"
                    required
                  />
                </div>
                <TagEditor value={editTags} onChange={setEditTags} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingThread(false)}
                    disabled={busy}
                  >
                    {t("threadCancel")}
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {t("threadSave")}
                  </Button>
                </div>
              </form>
            ) : (
              <>
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
                {thread.closed ? (
                  <p className="mt-2 rounded-xl border border-glass-border bg-white/[0.04] px-3 py-2 text-sm text-muted">
                    {t("threadClosedNotice")}
                  </p>
                ) : null}
                <p className="mt-3 whitespace-pre-wrap pb-4 text-[15px] leading-relaxed text-ink/95">
                  {thread.body}
                </p>
              </>
            )}

            {(likeCount > 0 || thread.replyCount > 0) && !editingThread && (
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

          {!editingThread && (
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
          )}
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
              const canManageReply = Boolean(
                profile && (isAdmin || reply.authorId === profile.uid),
              );
              const isEditing = editingReplyId === reply.id;
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
                      {isEditing ? (
                        <form onSubmit={onSaveReply} className="mt-2 space-y-2">
                          <TextArea
                            value={editReplyBody}
                            onChange={(e) => setEditReplyBody(e.target.value)}
                            className="min-h-20"
                            required
                            aria-label={t("replyEditBody")}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingReplyId(null);
                                setEditReplyBody("");
                              }}
                              disabled={busy}
                            >
                              {t("threadCancel")}
                            </Button>
                            <Button type="submit" disabled={busy}>
                              {t("threadSave")}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">
                          {reply.body}
                        </p>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-1.5 text-xs font-semibold text-muted">
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
                        {canAccept && (
                          <button
                            type="button"
                            onClick={() => toggleAccept(reply.id)}
                            className="transition hover:text-brand"
                          >
                            {accepted ? t("threadUnaccept") : t("threadAccept")}
                          </button>
                        )}
                        {canManageReply && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditReply(reply)}
                              className="transition hover:text-brand"
                            >
                              {t("replyEdit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteReply(reply)}
                              disabled={busy}
                              className="transition hover:text-red-400 disabled:opacity-40"
                            >
                              {t("replyDelete")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
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
                name={headlineName(profile!)}
                photoUrl={profile!.photoUrl}
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
        {!canPost && thread.closed ? (
          <div className="feed-composer-dock">
            <div className="feed-card px-4 py-3 text-center text-sm text-muted">
              {t("threadClosedNotice")}
            </div>
          </div>
        ) : null}

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
