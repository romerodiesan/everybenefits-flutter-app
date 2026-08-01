"use client";

import { FormEvent, startTransition, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  canDeleteGroupChat,
  canEditGroupChat,
  chatTitleFor,
  deleteGroupChat,
  getOrCreateDm,
  hideChatForMe,
  markChatRead,
  partitionChatInbox,
  sendMessage,
  setPinned,
  watchChat,
  watchInbox,
  watchMessages,
} from "@/lib/firebase/chats";
import { searchDirectoryContacts, headlineName } from "@/lib/firebase/users";
import {
  canCreateChatGroups,
  canParticipateInChats,
  canAccessSupport,
} from "@/lib/roles";
import {
  type ChatConversation,
  type ChatMessage,
  type UserProfile,
} from "@/lib/types";
import { Button, Input, Avatar } from "@pulse/ui";
import {
  ChatDirectorySkeleton,
  ChatInboxSkeleton,
  ConversationSkeleton,
} from "@/components/ui/skeleton";
import {
  AddReactionButton,
  ReactionChips,
} from "@/components/chats/message-reactions";
import dynamic from "next/dynamic";

const GroupComposerModal = dynamic(
  () =>
    import("@/components/chats/group-composer-modal").then(
      (m) => m.GroupComposerModal,
    ),
  { ssr: false },
);

const CHAT_SEED_PREFIX = "pulse:chat-seed:";

function writeChatSeed(chat: ChatConversation) {
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

export function ChatsHome({ selectedId }: { selectedId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState<"dm" | "group" | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [directory, setDirectory] = useState<UserProfile[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [inboxReady, setInboxReady] = useState(false);

  const canChat =
    profile && canParticipateInChats(profile.role, profile.isAnonymous);
  const canGroup = profile && canCreateChatGroups(profile.role);
  const rtdbConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
  const displayInboxError =
    inboxError ?? (!rtdbConfigured ? t("errorRtdbConfig") : null);

  useEffect(() => {
    if (!profile?.uid || !rtdbConfigured) return;
    const uid = profile.uid;
    startTransition(() => {
      setInboxError(null);
    });
    let ready = false;
    let cancelled = false;
    const markReady = () => {
      ready = true;
      if (!cancelled) setInboxReady(true);
    };
    const unsub = watchInbox(
      uid,
      (next) => {
        if (cancelled) return;
        setChats(next);
        setInboxError(null);
        markReady();
      },
      (error) => {
        console.error(error);
        if (!cancelled) {
          setInboxError(t("errorGeneric"));
          markReady();
        }
      },
    );
    const timer = window.setTimeout(() => {
      if (!ready && !cancelled) {
        setInboxError(t("chatsInboxTimeout"));
        markReady();
      }
    }, 15_000);
    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(timer);
    };
  }, [profile?.uid, t, rtdbConfigured]);

  useEffect(() => {
    if (showNew !== "dm" || !profile) return;
    setDirectory([]);
    setDmQuery("");
    setComposerError(null);
    setDirectoryLoading(false);
  }, [showNew, profile]);

  useEffect(() => {
    if (showNew !== "dm" || !profile) return;
    const q = dmQuery.trim();
    if (q.length < 2) {
      setDirectory([]);
      setDirectoryLoading(false);
      return;
    }
    let cancelled = false;
    setDirectoryLoading(true);
    setComposerError(null);
    const timer = window.setTimeout(() => {
      searchDirectoryContacts(q)
        .then((people) => {
          if (!cancelled) {
            setDirectory(people.filter((p) => p.uid !== profile.uid));
          }
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) {
            setDirectory([]);
            setComposerError(t("chatsDirectoryError"));
          }
        })
        .finally(() => {
          if (!cancelled) setDirectoryLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showNew, profile, dmQuery, t]);

  const sections = useMemo(() => {
    if (!profile) return null;
    const next = partitionChatInbox(chats, profile.uid);
    if (!canAccessSupport(profile.role, profile.isAnonymous)) {
      return { ...next, support: [] as ChatConversation[] };
    }
    return next;
  }, [chats, profile]);
  const showSectionHeaders = Boolean(
    sections &&
      (sections.support.length ||
        sections.community.length ||
        sections.pinned.length),
  );

  async function startDm(other: UserProfile) {
    if (!profile || composerBusy) return;
    setComposerBusy(true);
    setComposerError(null);
    try {
      const chat = await getOrCreateDm(profile, other);
      writeChatSeed(chat);
      setChats((prev) =>
        prev.some((item) => item.id === chat.id) ? prev : [chat, ...prev],
      );
      setShowNew(null);
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      console.error(error);
      setComposerError(
        error instanceof Error ? error.message : t("errorGeneric"),
      );
    } finally {
      setComposerBusy(false);
    }
  }

  function onGroupSaved(chat: ChatConversation) {
    writeChatSeed(chat);
    setChats((prev) => {
      const idx = prev.findIndex((item) => item.id === chat.id);
      if (idx < 0) return [chat, ...prev];
      const next = [...prev];
      next[idx] = { ...prev[idx], ...chat };
      return next;
    });
    router.push(`/chats/${chat.id}`);
  }

  function renderList(items: ChatConversation[], label?: string) {
    if (!items.length) return null;
    return (
      <div className="space-y-1.5">
        {label && (
          <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
        )}
        {items.map((chat) => {
          const active = selectedId === chat.id;
          const title = chatTitleFor(chat, profile!.uid, {
            support: t("chatsSupport"),
            team: t("chatsTeam"),
          });
          const unread = chat.unreadCounts[profile!.uid] ?? 0;
          return (
            <Link
              key={chat.id}
              href={`/chats/${chat.id}`}
              className={`pulse-row flex items-center gap-2.5 px-3 py-3 transition hover:bg-white/[0.03] lg:py-2.5 ${
                active ? "bg-brand/[0.08] ring-1 ring-brand/25" : ""
              }`}
            >
              <Avatar name={title} photoUrl={chat.photoUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">
                  {title}
                </p>
                <p className="truncate text-xs text-muted">
                  {chat.lastMessage || "—"}
                </p>
              </div>
              {unread > 0 && (
                <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-on-brand">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <section className="flex min-h-0 w-full flex-col lg:w-[320px] lg:border-r lg:border-glass-border xl:w-[360px]">
        <div className="flex items-center justify-between gap-2 border-b border-glass-border px-4 py-3">
          <h1 className="font-display text-2xl font-bold">{t("chatsTitle")}</h1>
          {canChat && (
            <div className="relative">
              <Button
                onClick={() => {
                  if (canGroup) {
                    setShowNewMenu((v) => !v);
                    return;
                  }
                  setShowNew((v) => (v === "dm" ? null : "dm"));
                }}
              >
                {t("chatsNew")}
              </Button>
              {showNewMenu && canGroup && (
                <div className="pulse-sheet absolute right-0 z-20 mt-1.5 min-w-[10rem] overflow-hidden p-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-brand/[0.08]"
                    onClick={() => {
                      setShowNew("dm");
                      setShowNewMenu(false);
                    }}
                  >
                    {t("chatsNew")}
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-brand/[0.08]"
                    onClick={() => {
                      setShowNew("group");
                      setShowNewMenu(false);
                    }}
                  >
                    {t("chatsNewGroup")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showNew === "dm" && (
          <div className="max-h-72 overflow-y-auto border-b border-glass-border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t("chatsPickContact")}</p>
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-ink"
                onClick={() => setShowNew(null)}
              >
                {t("chatsCloseComposer")}
              </button>
            </div>
            <Input
              value={dmQuery}
              onChange={(e) => setDmQuery(e.target.value)}
              placeholder={t("chatsSearchContacts")}
              className="mb-3"
            />
            {composerError && (
              <p className="mb-3 text-sm text-red-400">{composerError}</p>
            )}
            {directoryLoading && <ChatDirectorySkeleton />}
            {!directoryLoading && dmQuery.trim().length < 2 && !composerError && (
              <p className="py-2 text-sm text-muted">{t("chatsSearchContacts")}</p>
            )}
            {!directoryLoading &&
              dmQuery.trim().length >= 2 &&
              !directory.length &&
              !composerError && (
              <p className="py-2 text-sm text-muted">{t("chatsNoContacts")}</p>
            )}
            {!directoryLoading && (
              <div className="space-y-1">
                {directory.map((person) => (
                  <button
                    key={person.uid}
                    type="button"
                    disabled={composerBusy}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04] disabled:opacity-50"
                    onClick={() => void startDm(person)}
                  >
                    <Avatar
                      name={headlineName(person)}
                      photoUrl={person.photoUrl}
                      size={40}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {headlineName(person)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showNew === "group" && profile && (
          <GroupComposerModal
            mode="create"
            profile={profile}
            onClose={() => setShowNew(null)}
            onSaved={onGroupSaved}
          />
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {displayInboxError && (
            <p className="p-4 text-sm text-red-400">{displayInboxError}</p>
          )}
          {!displayInboxError && !inboxReady && <ChatInboxSkeleton />}
          {!displayInboxError && inboxReady && !chats.length && (
            <p className="p-4 text-sm text-muted">{t("chatsEmpty")}</p>
          )}
          {!displayInboxError && inboxReady && sections && showSectionHeaders && (
            <>
              {renderList(sections.support, t("chatsSectionSupport"))}
              {renderList(sections.community, t("chatsSectionCommunity"))}
              {renderList(sections.pinned, t("chatsPinned"))}
              {renderList(sections.recent, t("chatsSectionRecent"))}
            </>
          )}
          {!displayInboxError &&
            inboxReady &&
            sections &&
            !showSectionHeaders &&
            renderList(sections.recent)}
        </div>
      </section>

      <section className="hidden min-h-0 flex-1 lg:flex lg:flex-col">
        {!selectedId && (
          <div className="flex flex-1 items-center justify-center text-muted">
            {t("chatsSelect")}
          </div>
        )}
        {selectedId && (
          <ConversationPane
            chatId={selectedId}
            initialChat={chats.find((c) => c.id === selectedId) ?? null}
            onChatUpdated={(chat) => {
              setChats((prev) => {
                const idx = prev.findIndex((item) => item.id === chat.id);
                if (idx < 0) return prev;
                const next = [...prev];
                next[idx] = { ...prev[idx], ...chat };
                return next;
              });
            }}
          />
        )}
      </section>
    </div>
  );
}

export function ConversationPane({
  chatId,
  initialChat = null,
  onChatUpdated,
}: {
  chatId: string;
  initialChat?: ChatConversation | null;
  onChatUpdated?: (chat: ChatConversation) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chat, setChat] = useState<ChatConversation | null>(
    () => initialChat ?? readChatSeed(chatId),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const seed = readChatSeed(chatId);
    startTransition(() => {
      setError(null);
      setTimedOut(false);
      setMessages([]);
      setEditing(false);
      setChat((prev) => (prev?.id === chatId ? prev : seed));
    });
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return;
    const onErr = (err: Error) => {
      console.error(err);
      setError(t("errorGeneric"));
    };
    const unsubChat = watchChat(
      chatId,
      (next) => {
        if (next) {
          setChat(next);
          setTimedOut(false);
          setError(null);
          return;
        }
        setChat((prev) => (prev?.id === chatId ? prev : null));
      },
      onErr,
    );
    const unsubMsg = watchMessages(
      chatId,
      (msgs) => {
        setMessages(msgs);
        setTimedOut(false);
      },
      40,
      onErr,
    );
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 15_000);
    return () => {
      unsubChat();
      unsubMsg();
      window.clearTimeout(timer);
    };
  }, [chatId, t]);

  useEffect(() => {
    if (initialChat?.id === chatId) {
      setChat((prev) => prev ?? initialChat);
    }
  }, [chatId, initialChat]);

  useEffect(() => {
    if (profile && chat) {
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

  if (paneError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-3 p-6">
        <p className="text-sm text-red-400">{paneError}</p>
        <Button variant="secondary" onClick={() => router.push("/chats")}>
          {t("navChats")}
        </Button>
      </div>
    );
  }

  if (!profile || !chat) {
    return <ConversationSkeleton />;
  }

  const title = chatTitleFor(chat, profile.uid, {
    support: t("chatsSupport"),
    team: t("chatsTeam"),
  });
  const pinned = Boolean(chat.pinnedBy[profile.uid]);
  const canPin = !chat.isSupportChat && !chat.isDefaultAgentGroup;
  const canEdit = canEditGroupChat(chat, profile);
  const canDelete = canDeleteGroupChat(chat, profile);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !profile || !chat) return;
    setBusy(true);
    setSendError(null);
    try {
      await sendMessage({
        chatId,
        body,
        author: profile,
        knownChat: chat,
      });
      setBody("");
    } catch (err) {
      console.error(err);
      setSendError(
        err instanceof Error && err.message ? err.message : t("errorGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-glass-border px-3 py-2.5 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link href="/chats" className="shrink-0 text-xs text-muted lg:hidden">
            ← {t("navChats")}
          </Link>
          <Avatar name={title} photoUrl={chat.photoUrl} size={36} />
          <h2 className="min-w-0 truncate font-display text-base font-bold sm:text-lg">
            {title}
          </h2>
        </div>
        {(canEdit || canDelete || canPin) && (
          <div className="relative shrink-0">
            {/* Desktop: full action buttons */}
            <div className="hidden items-center gap-1 sm:flex">
              {canEdit && (
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  {t("chatsEditGroup")}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(t("chatsDeleteGroupConfirm"))) return;
                    setBusy(true);
                    try {
                      await deleteGroupChat(chatId);
                      router.push("/chats");
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
                  }}
                >
                  {t("chatsDeleteGroup")}
                </Button>
              )}
              {canPin && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setPinned(chatId, profile.uid, !pinned)}
                  >
                    {pinned ? t("chatsUnpin") : t("chatsPin")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await hideChatForMe(chatId, profile.uid);
                      router.push("/chats");
                    }}
                  >
                    {t("chatsHide")}
                  </Button>
                </>
              )}
            </div>
            {/* Mobile: overflow menu */}
            <details className="relative sm:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl text-lg text-muted hover:bg-white/[0.06] hover:text-ink [&::-webkit-details-marker]:hidden">
                ⋯
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-xl border border-glass-border bg-[var(--mesh-deep)] p-1 shadow-lg">
                {canEdit && (
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                    onClick={() => setEditing(true)}
                  >
                    {t("chatsEditGroup")}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    disabled={busy}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                    onClick={async () => {
                      if (!window.confirm(t("chatsDeleteGroupConfirm"))) return;
                      setBusy(true);
                      try {
                        await deleteGroupChat(chatId);
                        router.push("/chats");
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
                    }}
                  >
                    {t("chatsDeleteGroup")}
                  </button>
                )}
                {canPin && (
                  <>
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                      onClick={() => setPinned(chatId, profile.uid, !pinned)}
                    >
                      {pinned ? t("chatsUnpin") : t("chatsPin")}
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                      onClick={async () => {
                        await hideChatForMe(chatId, profile.uid);
                        router.push("/chats");
                      }}
                    >
                      {t("chatsHide")}
                    </button>
                  </>
                )}
              </div>
            </details>
          </div>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.senderId === profile.uid;
          return (
            <div
              key={message.id}
              className={`group flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className="relative max-w-[min(85%,calc(100%-2.25rem))] min-w-0">
                <div
                  className={`rounded-2xl px-3.5 py-2.5 ${
                    mine
                      ? "bg-brand text-on-brand"
                      : "bg-white/[0.06] text-ink"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                      {message.senderName}
                    </p>
                  )}
                  {message.sharedPost && (
                    <div
                      className={`mb-2 rounded-xl border px-3 py-2 text-sm ${
                        mine
                          ? "border-white/25 bg-black/10"
                          : "border-glass-border bg-sheet/40"
                      }`}
                    >
                      <p className="font-semibold">
                        {message.sharedPost.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 opacity-80">
                        {message.sharedPost.excerpt}
                      </p>
                    </div>
                  )}
                  {message.body ? (
                    <p className="whitespace-pre-wrap text-sm">
                      {message.body}
                    </p>
                  ) : null}
                </div>
                <ReactionChips
                  chatId={chatId}
                  message={message}
                  uid={profile.uid}
                  mine={mine}
                />
                {!chat.isSupportChat && (
                  <AddReactionButton
                    chatId={chatId}
                    message={message}
                    uid={profile.uid}
                    mine={mine}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={onSend}
        className="shrink-0 border-t border-glass-border p-3"
      >
        {sendError && (
          <p className="mb-2 text-sm text-red-400">{sendError}</p>
        )}
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("chatsMessagePlaceholder")}
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !body.trim()}>
            {t("chatsSend")}
          </Button>
        </div>
      </form>

      {editing && (
        <GroupComposerModal
          mode="edit"
          profile={profile}
          initialChat={chat}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setChat(next);
            writeChatSeed(next);
            onChatUpdated?.(next);
          }}
        />
      )}
    </div>
  );
}
