"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DocumentSnapshot } from "firebase/firestore";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  addReply,
  castForumVote,
  createThread,
  fetchReplyVotes,
  queryThreads,
  setAcceptedReply,
  watchReplies,
  watchThread,
  watchThreadVote,
} from "@/lib/firebase/forums";
import { canParticipateInForums } from "@/lib/roles";
import {
  type ForumReply,
  type ForumThread,
} from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Input,
  Label,
  TextArea,
} from "@/components/ui/primitives";
import { ShareToChatDialog } from "@/components/forums/share-to-chat-dialog";
import { TagEditor, TagFilterSelect } from "@/components/forums/tag-controls";

function formatWhen(date: Date | null | undefined, fallback: string) {
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return fallback;
  }
}

function VoteRail({
  score,
  vote,
  disabled,
  onUp,
  onDown,
}: {
  score: number;
  vote: number;
  disabled?: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl border border-glass-border bg-sheet/80 px-1.5 py-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onUp}
        aria-label="Upvote"
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition disabled:opacity-40 ${
          vote === 1
            ? "bg-brand/14 text-brand"
            : "text-muted hover:bg-white/[0.04] hover:text-ink"
        }`}
      >
        ▲
      </button>
      <span className="min-w-[1.25rem] text-center font-display text-xs font-bold tabular-nums">
        {score}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onDown}
        aria-label="Downvote"
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition disabled:opacity-40 ${
          vote === -1
            ? "bg-[#B42318]/15 text-[#B42318]"
            : "text-muted hover:bg-white/[0.04] hover:text-ink"
        }`}
      >
        ▼
      </button>
    </div>
  );
}

export function ForumsHome({ selectedId }: { selectedId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [sort, setSort] = useState<"recent" | "relevant">("recent");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(["general"]);
  const [busy, setBusy] = useState(false);

  const canPost =
    profile && canParticipateInForums(profile.role, profile.isAnonymous);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCursor(null);
    queryThreads({ sort, tag: tag || undefined })
      .then((page) => {
        if (cancelled) return;
        setThreads(page.threads);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
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
  }, [sort, tag]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
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
    } finally {
      setLoadingMore(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!profile || !canPost) return;
    setBusy(true);
    try {
      const id = await createThread({ title, body, tags, author: profile });
      setShowCreate(false);
      setTitle("");
      setBody("");
      router.push(`/home/${id}`);
    } finally {
      setBusy(false);
    }
  }

  const spotlight = !selectedId && threads[0];
  const filterExtras = useMemo(() => {
    const seen = new Set<string>();
    for (const thread of threads) {
      for (const item of thread.tags) seen.add(item);
    }
    return [...seen];
  }, [threads]);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-full min-w-0 flex-col border-r border-glass-border lg:w-[min(100%,400px)] xl:w-[420px]">
        <header className="border-b border-glass-border px-4 pb-3 pt-4 md:px-5">
          <div className="flex items-start justify-between gap-3 pr-16 lg:pr-0">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t("forumsTitle")}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("forumsSubtitle")}
              </p>
            </div>
            {canPost && (
              <Button
                className="shrink-0"
                onClick={() => setShowCreate((v) => !v)}
              >
                {t("forumsAsk")}
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-xl border border-glass-border bg-sheet p-0.5">
              {(["recent", "relevant"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                    sort === s
                      ? "bg-brand/14 text-brand"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {s === "recent"
                    ? t("forumsSortRecent")
                    : t("forumsSortRelevant")}
                </button>
              ))}
            </div>
            <TagFilterSelect
              value={tag}
              onChange={setTag}
              extraOptions={filterExtras}
            />
          </div>
        </header>

        {showCreate && (
          <form
            onSubmit={onCreate}
            className="space-y-3 border-b border-glass-border bg-brand/[0.04] px-4 py-3 md:px-5"
          >
            <p className="font-display text-sm font-bold">
              {t("createThreadTitle")}
            </p>
            <div>
              <Label>{t("createThreadTitle")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>{t("createThreadBody")}</Label>
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <TagEditor value={tags} onChange={setTags} />
            <Button type="submit" disabled={busy || !tags.length}>
              {t("createThreadSubmit")}
            </Button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-6 text-sm text-muted">{t("loading")}</p>
          )}
          {!loading && threads.length === 0 && (
            <div className="m-4 rounded-xl border border-dashed border-glass-border px-4 py-8 text-center">
              <p className="font-display text-base font-bold">
                {t("forumsEmptyTitle")}
              </p>
              <p className="mt-1.5 text-sm text-muted">{t("forumsEmpty")}</p>
            </div>
          )}
          <ul className="divide-y divide-glass-border">
            {threads.map((thread, index) => {
              const active = selectedId === thread.id;
              const isHot = thread.score >= 3 || thread.replyCount >= 3;
              return (
                <li key={thread.id}>
                  <Link
                    href={`/home/${thread.id}`}
                    className={`group relative block px-4 py-3 transition md:px-5 ${
                      active
                        ? "bg-brand/[0.07]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-brand" />
                    )}
                    <div className="flex items-start gap-2.5">
                      <Avatar
                        name={thread.authorName}
                        photoUrl={thread.authorPhotoUrl}
                        size={32}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {index === 0 && sort === "relevant" && (
                            <Badge>{t("forumsSpotlight")}</Badge>
                          )}
                          {isHot && (
                            <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                              {t("forumsHot")}
                            </span>
                          )}
                          {thread.acceptedReplyId && (
                            <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                              {t("threadAccepted")}
                            </span>
                          )}
                          {thread.tags.slice(0, 2).map((item) => (
                            <span
                              key={item}
                              className="text-[11px] font-medium text-muted"
                            >
                              #{item}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 font-display text-[15px] font-bold leading-snug tracking-tight group-hover:text-brand">
                          {thread.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted">
                          {thread.body}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-muted">
                          <span>{thread.authorName}</span>
                          <span className="opacity-40">·</span>
                          <span>
                            {formatWhen(thread.createdAt, t("forumsJustNow"))}
                          </span>
                          <span className="opacity-40">·</span>
                          <span>
                            {t("forumsReplies", { count: thread.replyCount })}
                          </span>
                          <span className="opacity-40">·</span>
                          <span>
                            {t("forumsScore", { score: thread.score })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="p-4 md:px-6">
              <Button
                variant="secondary"
                className="w-full"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? t("loading") : t("forumsLoadMore")}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="hidden min-w-0 flex-1 lg:flex lg:flex-col">
        {!selectedId && (
          <div className="flex flex-1 flex-col justify-center px-10 py-12 xl:px-16">
            <p className="font-display text-2xl font-bold tracking-tight xl:text-3xl">
              {t("selectThread")}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              {t("forumsReaderHint")}
            </p>
            {spotlight && (
              <Link
                href={`/home/${spotlight.id}`}
                className="pulse-sheet group mt-6 max-w-lg overflow-hidden transition hover:ring-1 hover:ring-brand/30"
              >
                <div className="border-b border-glass-border bg-brand/[0.06] px-4 py-2">
                  <Badge>{t("forumsSpotlight")}</Badge>
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-bold leading-snug group-hover:text-brand">
                    {spotlight.title}
                  </p>
                  <p className="mt-1.5 line-clamp-3 text-sm text-muted">
                    {spotlight.body}
                  </p>
                  <p className="mt-3 text-xs font-medium text-muted">
                    {spotlight.authorName} ·{" "}
                    {t("forumsReplies", { count: spotlight.replyCount })}
                  </p>
                </div>
              </Link>
            )}
          </div>
        )}
        {selectedId && (
          <div className="h-full overflow-y-auto">
            <ThreadDetail threadId={selectedId} embedded />
          </div>
        )}
      </section>
    </div>
  );
}

export function ThreadDetail({
  threadId,
  embedded = false,
}: {
  threadId: string;
  embedded?: boolean;
}) {
  const t = useTranslations();
  const { profile } = useAuth();
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [vote, setVote] = useState(0);
  const [replyVotes, setReplyVotes] = useState<Record<string, number>>({});
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const replyIdsKey = useRef("");

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
    if (!profile || !replies.length) {
      setReplyVotes({});
      return;
    }
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

  async function castThread(next: -1 | 0 | 1) {
    setActionError(null);
    try {
      await castForumVote({
        threadId,
        vote: vote === next ? 0 : next,
      });
    } catch (error) {
      console.error(error);
      setActionError(t("errorGeneric"));
    }
  }

  async function castReply(replyId: string, next: -1 | 0 | 1) {
    const current = replyVotes[replyId] ?? 0;
    const voteValue = (current === next ? 0 : next) as -1 | 0 | 1;
    setActionError(null);
    try {
      await castForumVote({ threadId, replyId, vote: voteValue });
      setReplyVotes((prev) => ({ ...prev, [replyId]: voteValue }));
    } catch (error) {
      console.error(error);
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
      <div className="p-8">
        <p className="text-muted">{t("loading")}</p>
      </div>
    );
  }

  const ordered = [...replies].sort((a, b) => {
    if (thread.acceptedReplyId === a.id) return -1;
    if (thread.acceptedReplyId === b.id) return 1;
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });

  return (
    <article
      className={
        embedded
          ? "mx-auto w-full max-w-3xl px-6 py-6 xl:px-10 xl:py-8"
          : "mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8"
      }
    >
      {!embedded && (
        <Link
          href="/home"
          className="mb-4 inline-flex text-sm font-medium text-muted hover:text-ink lg:hidden"
        >
          ← {t("navHome")}
        </Link>
      )}

      <div className="flex flex-wrap gap-1.5">
        {thread.tags.map((item) => (
          <span
            key={item}
            className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand"
          >
            #{item}
          </span>
        ))}
      </div>

      <h1 className="mt-3 font-display text-2xl font-bold leading-[1.2] tracking-tight md:text-3xl">
        {thread.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-2.5 border-b border-glass-border pb-4">
        <Avatar
          name={thread.authorName}
          photoUrl={thread.authorPhotoUrl}
          size={36}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{thread.authorName}</p>
          <p className="text-xs text-muted">
            {formatWhen(thread.createdAt, t("forumsJustNow"))} ·{" "}
            {t("forumsReplies", { count: thread.replyCount })}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {canPost && (
            <Button
              variant="secondary"
              onClick={() => setShowShare(true)}
            >
              {t("shareToChatAction")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <VoteRail
          score={thread.score}
          vote={vote}
          disabled={!canPost || isAuthor}
          onUp={() => castThread(1)}
          onDown={() => castThread(-1)}
        />
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/95">
            {thread.body}
          </p>
          {actionError && (
            <p className="mt-3 text-sm text-red-400">{actionError}</p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-glass-border pb-2">
          <h2 className="font-display text-lg font-bold">
            {t("forumsReplies", { count: replies.length })}
          </h2>
        </div>

        <div className="space-y-4">
          {ordered.map((reply) => {
            const rv = replyVotes[reply.id] ?? 0;
            const accepted = thread.acceptedReplyId === reply.id;
            return (
              <div
                key={reply.id}
                className={`pulse-sheet relative overflow-hidden ${
                  accepted ? "ring-1 ring-brand/35" : ""
                }`}
              >
                {accepted && (
                  <div className="flex items-center gap-2 border-b border-brand/20 bg-brand/[0.08] px-4 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                      {t("threadAccepted")}
                    </span>
                  </div>
                )}
                <div className="flex gap-4 p-4 md:p-5">
                  <VoteRail
                    score={reply.score}
                    vote={rv}
                    disabled={!canPost || reply.authorId === profile?.uid}
                    onUp={() => castReply(reply.id, 1)}
                    onDown={() => castReply(reply.id, -1)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar
                        name={reply.authorName}
                        photoUrl={reply.authorPhotoUrl}
                        size={36}
                      />
                      <div>
                        <p className="text-sm font-bold">{reply.authorName}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          {formatWhen(reply.createdAt, t("forumsJustNow"))}
                        </p>
                      </div>
                      {isAuthor && (
                        <Button
                          variant="ghost"
                          className="ml-auto h-9 px-3 text-xs"
                          onClick={() => toggleAccept(reply.id)}
                        >
                          {accepted
                            ? t("threadUnaccept")
                            : t("threadAccept")}
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                      {reply.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {!ordered.length && (
            <p className="py-6 text-sm text-muted">{t("forumsNoReplies")}</p>
          )}
        </div>
      </section>

      {canPost && (
        <form
          onSubmit={onReply}
          className="pulse-sheet mt-8 space-y-3 p-5 md:p-6"
        >
          <Label>{t("threadReply")}</Label>
          <TextArea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={t("threadReplyPlaceholder")}
            required
          />
          <Button type="submit" disabled={busy}>
            {t("threadReply")}
          </Button>
        </form>
      )}

      {showShare && (
        <ShareToChatDialog
          thread={thread}
          onClose={() => setShowShare(false)}
        />
      )}
    </article>
  );
}
