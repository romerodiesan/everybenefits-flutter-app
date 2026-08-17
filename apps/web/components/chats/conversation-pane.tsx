"use client";

import {
  FormEvent,
  KeyboardEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  chatMemberHref,
  chatPhotoFor,
  hideChatForMe,
  markChatRead,
  mentionMembersOf,
  sendMessage,
  setPinned,
  setTyping,
  TYPING_STALE_MS,
  watchChat,
  watchMessages,
  watchTyping,
} from "@/lib/firebase/chats";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import {
  type ChatConversation,
  type ChatMessage,
  type ChatReplyTo,
  AGENTS_DEFAULT_ID,
} from "@/lib/types";
import { Button, Input, Avatar } from "@/components/ui/primitives";
import { ConversationSkeleton } from "@/components/ui/skeleton";
import {
  AddReactionButton,
  ReactionChips,
} from "@/components/chats/message-reactions";
import {
  buildChatTimelineOldestFirst,
  formatChatClock,
  replyPreviewOf,
} from "@/lib/chats/timeline";
import { showsTextBubble } from "@/lib/chats/share";
import { SharedPostCard } from "@/components/chats/shared-post-card";
import {
  filterMentionCandidates,
  insertMention,
  mentionQueryAt,
  splitChatBody,
} from "@pulse/shared";

const CHAT_SEED_PREFIX = "pulse:chat-seed:";

export function writeChatSeed(chat: ChatConversation) {
  try {
    sessionStorage.setItem(`${CHAT_SEED_PREFIX}${chat.id}`, JSON.stringify(chat));
  } catch {
    // Private mode / quota — navigation still works without a seed.
  }
}

function readChatSeed(chatId: string): ChatConversation | null {
  try {
    const raw = sessionStorage.getItem(`${CHAT_SEED_PREFIX}${chatId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatConversation;
    return parsed?.id === chatId ? parsed : null;
  } catch {
    return null;
  }
}

function LinkifiedBody({ text }: { text: string }) {
  const spans = splitChatBody(text);
  return (
    <p className="whitespace-pre-wrap text-sm">
      {spans.map((span, i) => {
        if (span.kind === "url") {
          return (
            <a
              key={`${span.value}-${i}`}
              href={span.value}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-brand/50"
            >
              {span.value}
            </a>
          );
        }
        if (span.kind === "mention") {
          return (
            <Link
              key={`${span.handle}-${i}`}
              href={`/members/${span.handle}`}
              className="font-semibold text-brand hover:underline"
            >
              {span.raw}
            </Link>
          );
        }
        return <span key={`t-${i}`}>{span.value}</span>;
      })}
    </p>
  );
}

export function ConversationPane({
  chatId,
  initialChat = null,
}: {
  chatId: string;
  initialChat?: ChatConversation | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chat, setChat] = useState<ChatConversation | null>(
    () => initialChat ?? readChatSeed(chatId),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [caret, setCaret] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typing, setTypingMap] = useState<Record<string, number>>({});
  const unreadSnapshot = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingOn = useRef(false);
  const uidRef = useRef(profile?.uid);
  uidRef.current = profile?.uid;
  const uid = profile?.uid;
  const canWatchTyping = Boolean(
    liveReady && uid && chat?.memberIds.includes(uid),
  );

  useEffect(() => {
    const seed = readChatSeed(chatId);
    unreadSnapshot.current = null;
    startTransition(() => {
      setError(null);
      setTimedOut(false);
      setLiveReady(false);
      setMessages([]);
      setReplyTo(null);
      setTypingMap({});
      setChat((prev) => (prev?.id === chatId ? prev : seed));
    });
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return;
    if (!uid) return;
    let cancelled = false;
    let unsubChat = () => {};
    let unsubMsg = () => {};
    const onErr = (err: Error) => {
      console.error(err);
      setError(t("errorGeneric"));
    };
    const start = () => {
      if (cancelled) return;
      unsubChat = watchChat(
        chatId,
        (next) => {
          if (next) {
            setChat(next);
            setLiveReady(true);
            setTimedOut(false);
            setError(null);
            return;
          }
          setChat((prev) => (prev?.id === chatId ? prev : null));
        },
        onErr,
      );
      unsubMsg = watchMessages(
        chatId,
        (msgs) => {
          setMessages(msgs);
          setTimedOut(false);
        },
        40,
        onErr,
      );
    };
    if (chatId === AGENTS_DEFAULT_ID) {
      void ensureDefaultAgentGroup().then(start);
    } else {
      start();
    }
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 15_000);
    return () => {
      cancelled = true;
      unsubChat();
      unsubMsg();
      window.clearTimeout(timer);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (typingOn.current && uidRef.current) {
        typingOn.current = false;
        void setTyping(chatId, uidRef.current, false);
      }
    };
  }, [chatId, t, uid]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return;
    if (!canWatchTyping) {
      setTypingMap({});
      return;
    }
    return watchTyping(chatId, setTypingMap);
  }, [chatId, canWatchTyping]);

  useEffect(() => {
    if (initialChat?.id === chatId) {
      setChat((prev) => prev ?? initialChat);
    }
  }, [chatId, initialChat]);

  useEffect(() => {
    if (profile && chat) {
      if (unreadSnapshot.current == null) {
        unreadSnapshot.current = chat.unreadCounts[profile.uid] ?? 0;
      }
      markChatRead(chatId, profile.uid).catch(() => undefined);
    }
  }, [chatId, chat, profile, messages.length]);

  const configError = !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    ? t("errorRtdbConfig")
    : null;
  const paneError =
    error ??
    configError ??
    (timedOut && !chat ? t("chatsLoadTimeout") : null);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q),
    );
  }, [messages, searchQuery]);

  const items = useMemo(() => {
    if (!profile) return [];
    return buildChatTimelineOldestFirst({
      oldestFirst: visible,
      viewerUid: profile.uid,
      isGroup: Boolean(chat?.isGroup),
      unreadCount: searchQuery.trim() ? 0 : unreadSnapshot.current ?? 0,
    });
  }, [visible, profile, chat?.isGroup, searchQuery]);

  if (paneError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-3 p-6">
        <p className="text-sm text-red-400">{paneError}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/chats")}
        >
          {t("navChats")}
        </Button>
      </div>
    );
  }

  if (!profile || !chat) {
    return <ConversationSkeleton />;
  }

  const title = chatTitleFor(chat, profile.uid, {
    team: t("chatsTeam"),
  });
  const peerId = chat.memberIds.find((id) => id !== profile.uid);
  const peerHref =
    !chat.isGroup && peerId ? chatMemberHref(chat, peerId) : null;
  const peerPhoto = peerId ? chatPhotoFor(chat, peerId) : "";
  const pinned = Boolean(chat.pinnedBy[profile.uid]);
  const canPin = !chat.isDefaultAgentGroup;
  const now = Date.now();
  const typers = Object.entries(typing)
    .filter(
      ([uid, at]) =>
        uid !== profile.uid && now - at < TYPING_STALE_MS,
    )
    .map(([uid]) => chat.memberNames[uid] || uid);

  const mentionCursor = caret;
  const mentionQuery = mentionQueryAt(body, mentionCursor);
  const mentionHits = mentionQuery
    ? filterMentionCandidates(
        mentionMembersOf(chat, profile.uid),
        mentionQuery.prefix,
        profile.uid,
      )
    : [];
  const mentionOpen = mentionHits.length > 0 && mentionIndex >= 0;
  const activeMention =
    mentionHits[
      Math.min(mentionIndex, Math.max(0, mentionHits.length - 1))
    ] ?? null;

  function applyMention(username: string) {
    const cursor = inputRef.current?.selectionStart ?? body.length;
    const next = insertMention(body, cursor, username);
    setBody(next.text);
    setCaret(next.cursor);
    setMentionIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!mentionOpen || !activeMention) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionHits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex(
        (i) => (i - 1 + mentionHits.length) % mentionHits.length,
      );
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applyMention(activeMention.username);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMentionIndex(-1);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !profile || !chat) return;
    setBusy(true);
    setSendError(null);
    const reply: ChatReplyTo | null = replyTo
      ? {
          messageId: replyTo.id,
          senderName: replyTo.senderName,
          bodyPreview: replyPreviewOf(replyTo),
        }
      : null;
    try {
      await sendMessage({
        chatId,
        body,
        author: profile,
        knownChat: chat,
        replyTo: reply,
      });
      setBody("");
      setReplyTo(null);
      setMentionIndex(0);
    } catch (err) {
      console.error(err);
      setSendError(
        err instanceof Error && err.message
          ? err.message
          : t("errorGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  function jumpUnread() {
    const el = scroller.current?.querySelector("[data-unread]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {peerHref ? (
            <Link href={peerHref}>
              <Avatar name={title} photoUrl={peerPhoto || null} size={36} />
            </Link>
          ) : (
            <Avatar name={title} photoUrl={peerPhoto || null} size={36} />
          )}
          <div className="min-w-0">
          <Link href="/chats" className="text-xs text-muted lg:hidden">
            ← {t("navChats")}
          </Link>
          <h2 className="truncate font-display text-lg font-bold">
            {peerHref ? (
              <Link href={peerHref} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="truncate text-[11px] font-medium text-muted">
            {typers.length === 1
              ? t("chatTypingOne", { name: typers[0] })
              : typers.length > 1
                ? t("chatTypingMany")
                : null}
          </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQuery("");
            }}
          >
            {t("chatSearchThread")}
          </Button>
          {canPin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await setPinned(chatId, profile.uid, !pinned);
                  } catch {
                    setError(t("errorGeneric"));
                  }
                }}
              >
                {pinned ? t("chatsUnpin") : t("chatsPin")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await hideChatForMe(chatId, profile.uid);
                    router.push("/chats");
                  } catch {
                    setError(t("errorGeneric"));
                  }
                }}
              >
                {t("chatsHide")}
              </Button>
            </>
          )}
        </div>
      </header>
      {searchOpen && (
        <div className="border-b border-glass-border px-4 py-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("chatSearchThreadHint")}
          />
        </div>
      )}

      <div
        ref={scroller}
        className="relative flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand)_8%,transparent),transparent_55%)] p-3 pt-8"
      >
        {searchQuery.trim() && visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {t("chatSearchThreadEmpty")}
          </p>
        )}
        {items.map((item) => {
          if (item.kind === "day") {
            const label = dayLabel(item.day, t);
            return (
              <div key={`day-${item.day}`} className="my-3 flex justify-center">
                <span className="rounded-full border border-glass-border bg-sheet px-3 py-1 text-[11px] font-semibold text-muted">
                  {label}
                </span>
              </div>
            );
          }
          if (item.kind === "unread") {
            return (
              <div
                key="unread"
                data-unread
                className="my-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-brand"
              >
                <span className="h-px flex-1 bg-brand/30" />
                {t("chatNewMessages")}
                <span className="h-px flex-1 bg-brand/30" />
              </div>
            );
          }
          const message = item.message;
          const mine = message.senderId === profile.uid;
          const textBubble = showsTextBubble(message);
          const shareOnly = Boolean(message.sharedPost) && !textBubble;
          return (
            <div
              key={message.id}
              data-msg={message.id}
              className={`group/msg relative flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${
                item.groupedWithOlder ? "mt-0.5" : "mt-2.5"
              }`}
            >
              <div
                className={`pointer-events-none absolute bottom-full z-10 mb-1 flex items-center gap-0.5 whitespace-nowrap rounded-full border border-glass-border bg-sheet/95 px-1 py-0.5 opacity-0 shadow-sm transition group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 ${
                  mine ? "right-0" : "left-10"
                }`}
              >
                <AddReactionButton
                  chatId={chatId}
                  message={message}
                  uid={profile.uid}
                  mine={mine}
                />
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                  onClick={() => setReplyTo(message)}
                >
                  {t("chatReply")}
                </button>
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      message.sharedPost?.title || message.body,
                    )
                  }
                >
                  {t("chatCopy")}
                </button>
              </div>
              {!mine ? (
                item.groupedWithNewer ? (
                  <span className="w-7 shrink-0" />
                ) : (
                  <Link
                    href={chatMemberHref(chat, message.senderId)}
                    className="mb-0.5 shrink-0"
                  >
                    <Avatar
                      name={message.senderName}
                      photoUrl={
                        message.senderPhotoUrl ||
                        chatPhotoFor(chat, message.senderId) ||
                        null
                      }
                      size={28}
                    />
                  </Link>
                )
              ) : null}
              <div className="relative max-w-[88%]">
                {item.showSenderName && (
                  <p className="mb-1 text-xs font-semibold text-muted">
                    <Link
                      href={chatMemberHref(chat, message.senderId)}
                      className="hover:underline"
                    >
                      {message.senderName}
                    </Link>
                  </p>
                )}
                {message.replyTo && (
                  <button
                    type="button"
                    className="mb-1 block w-full rounded-lg border-l-2 border-brand bg-sheet px-2 py-1 text-left"
                    onClick={() => {
                      const el = scroller.current?.querySelector(
                        `[data-msg="${message.replyTo!.messageId}"]`,
                      );
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    <p className="text-[11px] font-bold text-brand">
                      {message.replyTo.senderName}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {message.replyTo.bodyPreview}
                    </p>
                  </button>
                )}
                {message.sharedPost ? (
                  <SharedPostCard preview={message.sharedPost} />
                ) : null}
                {textBubble ? (
                  <div
                    className={`mt-1 px-3 py-2 ${
                      mine ? "bubble-mine" : "bubble-other"
                    } ${item.groupedWithNewer ? "rounded-b-xl" : ""}`}
                  >
                    <LinkifiedBody text={message.body} />
                    {item.showTime && (
                      <p className="mt-1 text-right text-[10px] text-muted">
                        {formatChatClock(message.createdAt)}
                      </p>
                    )}
                  </div>
                ) : shareOnly && item.showTime ? (
                  <p className="mt-1 text-right text-[10px] text-muted">
                    {formatChatClock(message.createdAt)}
                  </p>
                ) : null}
                <ReactionChips
                  chatId={chatId}
                  message={message}
                  uid={profile.uid}
                  mine={mine}
                />
              </div>
            </div>
          );
        })}
        {items.some((i) => i.kind === "unread") && (
          <button
            type="button"
            onClick={jumpUnread}
            className="sticky bottom-3 ml-auto block rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-on-brand shadow"
          >
            {t("chatJumpToNew")}
          </button>
        )}
      </div>

      <form
        onSubmit={onSend}
        className="flex shrink-0 flex-col gap-2 border-t border-glass-border p-3"
      >
        {sendError && <p className="text-xs text-red-400">{sendError}</p>}
        {!chat.isGroup && !chat.dmMessagingEnabled ? (
          <p className="text-sm text-muted">{t("chatsDmDisabled")}</p>
        ) : (
          <>
            {replyTo && (
              <div className="flex items-center justify-between rounded-xl border border-glass-border bg-sheet px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-brand">
                    {t("chatReplyTo", { name: replyTo.senderName })}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {replyPreviewOf(replyTo)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-muted"
                  onClick={() => setReplyTo(null)}
                >
                  {t("chatReplyDismiss")}
                </button>
              </div>
            )}
            <div className="relative">
              {mentionOpen && activeMention ? (
                <ul className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-48 overflow-y-auto rounded-2xl border border-glass-border bg-sheet py-1 shadow-lg">
                  {mentionHits.map((person) => (
                    <li key={person.uid}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                          person.uid === activeMention.uid
                            ? "bg-brand/10"
                            : "hover:bg-white/[0.04]"
                        }`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applyMention(person.username);
                        }}
                      >
                        <Avatar
                          name={person.name}
                          photoUrl={
                            chat.memberPhotos?.[person.uid] || null
                          }
                          size={28}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {person.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            @{person.username}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : mentionQuery && mentionHits.length === 0 ? (
                <p className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-2xl border border-glass-border bg-sheet px-3 py-2 text-xs text-muted">
                  {t("chatMentionEmpty")}
                </p>
              ) : null}
              <div className="flex items-end gap-2 rounded-full border border-glass-border bg-sheet px-2 py-1.5">
              <Input
                ref={inputRef}
                value={body}
                onKeyDown={onComposerKeyDown}
                onChange={(e) => {
                  const next = e.target.value;
                  setBody(next);
                  setMentionIndex(0);
                  setCaret(e.target.selectionStart ?? next.length);
                  if (typingTimer.current) {
                    window.clearTimeout(typingTimer.current);
                  }
                  const active = next.trim().length > 0;
                  if (active) {
                    if (!typingOn.current) {
                      typingOn.current = true;
                      void setTyping(chatId, profile.uid, true);
                    }
                    typingTimer.current = window.setTimeout(() => {
                      typingOn.current = false;
                      void setTyping(chatId, profile.uid, false);
                    }, 1500);
                  } else if (typingOn.current) {
                    typingOn.current = false;
                    void setTyping(chatId, profile.uid, false);
                  }
                }}
                onClick={() =>
                  setCaret(inputRef.current?.selectionStart ?? body.length)
                }
                onKeyUp={() =>
                  setCaret(inputRef.current?.selectionStart ?? body.length)
                }
                onSelect={() =>
                  setCaret(inputRef.current?.selectionStart ?? body.length)
                }
                onBlur={() => {
                  if (typingTimer.current) {
                    window.clearTimeout(typingTimer.current);
                  }
                  if (typingOn.current) {
                    typingOn.current = false;
                    void setTyping(chatId, profile.uid, false);
                  }
                }}
                placeholder={t("chatsMessagePlaceholder")}
                className="!border-0 !bg-transparent"
              />
              <Button
                type="submit"
                disabled={busy || !body.trim()}
                className="rounded-full"
              >
                {t("chatsSend")}
              </Button>
            </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function dayLabel(
  day: number,
  t: ReturnType<typeof useTranslations>,
) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return t("chatTimeToday");
  if (diff === 1) return t("chatTimeYesterday");
  return new Date(day).toLocaleDateString();
}
