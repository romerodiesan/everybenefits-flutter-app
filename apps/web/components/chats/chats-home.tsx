"use client";

import {
  FormEvent,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  createGroupChat,
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
import {
  listDirectory,
  searchDirectoryContacts,
  headlineName,
} from "@/lib/firebase/users";
import {
  canCreateChatGroups,
  canConfigureGroupAutoJoin,
  canParticipateInChats,
  canAccessSupport,
  GROUP_SEED_ROLES,
} from "@/lib/roles";
import {
  type ChatConversation,
  type ChatMessage,
  type UserProfile,
  type UserRole,
} from "@/lib/types";
import { Button, Input, Panel, Avatar } from "@/components/ui/primitives";
import {
  ChatDirectorySkeleton,
  ChatInboxSkeleton,
  ConversationSkeleton,
} from "@/components/ui/skeleton";
import {
  AddReactionButton,
  ReactionChips,
} from "@/components/chats/message-reactions";

const CHAT_SEED_PREFIX = "pulse:chat-seed:";

const ROLE_LABEL_KEYS: Record<
  Exclude<UserRole, "guest">,
  | "chatsRoleStudent"
  | "chatsRoleAgent"
  | "chatsRoleInstructor"
  | "chatsRoleManager"
  | "chatsRoleAdmin"
> = {
  student: "chatsRoleStudent",
  agent: "chatsRoleAgent",
  instructor: "chatsRoleInstructor",
  manager: "chatsRoleManager",
  admin: "chatsRoleAdmin",
};

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

function contactSubtitle(person: UserProfile) {
  const parts = [
    person.email?.trim() || null,
    person.npn?.trim() ? `NPN ${person.npn.trim()}` : null,
    person.role,
  ].filter(Boolean);
  return parts.join(" · ");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[] | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<
    Record<string, UserProfile>
  >({});
  const [seedRoles, setSeedRoles] = useState<UserRole[]>([]);
  const [autoJoin, setAutoJoin] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [inboxReady, setInboxReady] = useState(false);

  const canChat =
    profile && canParticipateInChats(profile.role, profile.isAnonymous);
  const canGroup = profile && canCreateChatGroups(profile.role);
  const canAutoJoin =
    profile && canConfigureGroupAutoJoin(profile.role);
  const rtdbConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
  const displayInboxError =
    inboxError ?? (!rtdbConfigured ? t("errorRtdbConfig") : null);

  const visibleDirectory = searchResults ?? directory;

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
    // Soft timeout: keep listening; clear the banner if data arrives later.
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
    if (!showNew || !profile) return;
    let cancelled = false;
    setDirectoryLoading(true);
    setComposerError(null);
    setSearchQuery("");
    setSearchResults(null);
    listDirectory(profile.uid)
      .then((people) => {
        if (!cancelled) setDirectory(people);
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
    return () => {
      cancelled = true;
    };
  }, [showNew, profile, t]);

  useEffect(() => {
    if (!showNew) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      searchDirectoryContacts(q)
        .then((people) => {
          if (!cancelled) setSearchResults(people);
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) {
            setSearchResults([]);
            setComposerError(t("chatsDirectoryError"));
          }
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, showNew, t]);

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

  function callableErrorMessage(error: unknown) {
    if (!error || typeof error !== "object") return t("errorGeneric");
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code.replace(/^functions\//, "")
        : "";
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";
    if (message && message !== code && !message.startsWith("functions/")) {
      return message;
    }
    if (code === "permission-denied") return t("chatsCreateGroupDenied");
    if (code === "unauthenticated") return t("errorAuth");
    return message || t("errorGeneric");
  }

  async function startGroup(e: FormEvent) {
    e.preventDefault();
    if (!profile || composerBusy) return;
    if (!groupTitle.trim()) {
      setComposerError(t("chatsGroupNameRequired"));
      return;
    }
    if (!selectedMembers.length && !seedRoles.length) {
      setComposerError(t("chatsGroupMembersRequired"));
      return;
    }
    setComposerBusy(true);
    setComposerError(null);
    try {
      const members = selectedMembers
        .map((id) => selectedPeople[id] ?? directory.find((d) => d.uid === id))
        .filter((person): person is UserProfile => Boolean(person));
      const chat = await createGroupChat({
        creator: profile,
        title: groupTitle,
        members,
        seedRoles,
        autoJoin: Boolean(canAutoJoin && autoJoin),
      });
      writeChatSeed(chat);
      setChats((prev) =>
        prev.some((item) => item.id === chat.id) ? prev : [chat, ...prev],
      );
      setShowNew(null);
      setGroupTitle("");
      setSelectedMembers([]);
      setSelectedPeople({});
      setSeedRoles([]);
      setAutoJoin(false);
      if (chat.truncated) {
        // Soft notice via console; inbox will show full membership.
        console.info(t("chatsGroupTruncated"));
      }
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      console.error(error);
      setComposerError(callableErrorMessage(error));
    } finally {
      setComposerBusy(false);
    }
  }

  function toggleMember(person: UserProfile) {
    setSelectedMembers((prev) => {
      const checked = prev.includes(person.uid);
      if (checked) {
        setSelectedPeople((map) => {
          const next = { ...map };
          delete next[person.uid];
          return next;
        });
        return prev.filter((id) => id !== person.uid);
      }
      setSelectedPeople((map) => ({ ...map, [person.uid]: person }));
      return [...prev, person.uid];
    });
  }

  function toggleSeedRole(role: UserRole) {
    setSeedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function closeComposer() {
    setShowNew(null);
    setShowNewMenu(false);
    setGroupTitle("");
    setSelectedMembers([]);
    setSelectedPeople({});
    setSeedRoles([]);
    setAutoJoin(false);
    setSearchQuery("");
    setSearchResults(null);
    setComposerError(null);
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
              <Avatar name={title} size={36} />
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
      <section className="flex min-h-0 w-full flex-col border-r border-glass-border lg:w-[320px] xl:w-[360px]">
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

        {showNew && (
          <div className="flex max-h-[min(70vh,32rem)] flex-col border-b border-glass-border">
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <p className="text-sm font-semibold">
                {showNew === "group" ? t("chatsNewGroup") : t("chatsPickContact")}
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-ink"
                onClick={closeComposer}
              >
                {t("chatsCloseComposer")}
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto px-4 pb-4 pt-2">
              {composerError && (
                <p className="text-sm text-red-400">{composerError}</p>
              )}

              {showNew === "group" && (
                <form onSubmit={startGroup} className="space-y-3">
                  <Input
                    placeholder={t("chatsGroupName")}
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    required
                    disabled={composerBusy}
                  />

                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("chatsIncludeRoles")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GROUP_SEED_ROLES.map((role) => {
                        const on = seedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={composerBusy}
                            onClick={() => toggleSeedRole(role)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                              on
                                ? "bg-brand text-on-brand"
                                : "bg-white/[0.06] text-muted hover:bg-white/[0.1] hover:text-ink"
                            }`}
                          >
                            {t(ROLE_LABEL_KEYS[role])}
                          </button>
                        );
                      })}
                    </div>
                    {seedRoles.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-muted">
                        {t("chatsRoleSeedHint")}
                      </p>
                    )}
                  </div>

                  {canAutoJoin && seedRoles.length > 0 && (
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={autoJoin}
                        disabled={composerBusy}
                        onChange={(e) => setAutoJoin(e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {t("chatsAutoJoin")}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {t("chatsAutoJoinHint")}
                        </span>
                      </span>
                    </label>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      composerBusy ||
                      (!selectedMembers.length && !seedRoles.length)
                    }
                  >
                    {composerBusy
                      ? t("loading")
                      : `${t("chatsCreateGroup")}${
                          selectedMembers.length
                            ? ` · ${t("chatsSelectedCount", {
                                count: selectedMembers.length,
                              })}`
                            : ""
                        }`}
                  </Button>
                </form>
              )}

              {showNew === "group" && selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((id) => {
                    const person =
                      selectedPeople[id] ??
                      directory.find((d) => d.uid === id) ??
                      visibleDirectory.find((d) => d.uid === id);
                    if (!person) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={composerBusy}
                        onClick={() => toggleMember(person)}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand"
                      >
                        <span className="truncate">{headlineName(person)}</span>
                        <span aria-hidden>×</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <Input
                placeholder={t("chatsSearchContacts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={composerBusy}
                autoComplete="off"
              />

              {(directoryLoading || searchLoading) && <ChatDirectorySkeleton />}

              {!directoryLoading &&
                !searchLoading &&
                searchQuery.trim().length === 1 && (
                  <p className="py-2 text-sm text-muted">
                    {t("chatsSearchMinChars")}
                  </p>
                )}

              {!directoryLoading &&
                !searchLoading &&
                searchQuery.trim().length >= 2 &&
                visibleDirectory.length === 0 && (
                  <p className="py-2 text-sm text-muted">{t("chatsSearchEmpty")}</p>
                )}

              {!directoryLoading &&
                !searchLoading &&
                searchQuery.trim().length < 2 &&
                !directory.length &&
                !composerError && (
                  <p className="py-2 text-sm text-muted">{t("chatsNoContacts")}</p>
                )}

              {!directoryLoading && !searchLoading && (
                <div className="space-y-0.5">
                  {visibleDirectory.map((person) => {
                    const checked = selectedMembers.includes(person.uid);
                    return (
                      <button
                        key={person.uid}
                        type="button"
                        disabled={composerBusy}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          if (showNew === "dm") {
                            void startDm(person);
                            return;
                          }
                          toggleMember(person);
                        }}
                      >
                        <Avatar
                          name={headlineName(person)}
                          photoUrl={person.photoUrl}
                          size={40}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {headlineName(person)}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {contactSubtitle(person)}
                          </span>
                        </span>
                        {showNew === "group" && (
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              checked
                                ? "bg-brand text-on-brand"
                                : "bg-white/[0.06] text-muted"
                            }`}
                          >
                            {checked ? "✓" : "+"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
          />
        )}
      </section>
    </div>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const seed = readChatSeed(chatId);
    startTransition(() => {
      setError(null);
      setTimedOut(false);
      setMessages([]);
      setChat((prev) =>
        prev?.id === chatId ? prev : seed,
      );
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
        // Keep optimistic seed if RTDB briefly returns empty after create.
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
        err instanceof Error && err.message
          ? err.message
          : t("errorGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
        <div>
          <Link href="/chats" className="text-xs text-muted lg:hidden">
            ← {t("navChats")}
          </Link>
          <h2 className="font-display text-lg font-bold">{title}</h2>
        </div>
        <div className="flex gap-2">
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
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((message) => {
          const mine = message.senderId === profile.uid;
          const canReact = !chat.isSupportChat;
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className="flex max-w-[88%] items-end gap-1.5">
                {canReact && mine && (
                  <AddReactionButton
                    chatId={chatId}
                    message={message}
                    uid={profile.uid}
                    mine={mine}
                  />
                )}
                <div className="min-w-0 max-w-full">
                  <div
                    className={`px-3 py-2 ${
                      mine ? "bubble-mine" : "bubble-other"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-1 text-xs text-muted">
                        {message.senderName}
                      </p>
                    )}
                    {message.sharedPost ? (
                      <Link
                        href={`/home/${message.sharedPost.threadId}`}
                        className="block"
                      >
                        <Panel className="!p-3 transition hover:bg-white/[0.03]">
                          <p className="font-semibold">
                            {message.sharedPost.title}
                          </p>
                          <p className="text-sm text-muted">
                            {message.sharedPost.excerpt}
                          </p>
                        </Panel>
                      </Link>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">
                        {message.body}
                      </p>
                    )}
                  </div>
                  {canReact && (
                    <ReactionChips
                      chatId={chatId}
                      message={message}
                      uid={profile.uid}
                      mine={mine}
                    />
                  )}
                </div>
                {canReact && !mine && (
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
        className="flex shrink-0 flex-col gap-2 border-t border-glass-border p-4"
      >
        {sendError && (
          <p className="text-xs text-red-400">{sendError}</p>
        )}
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("chatsMessagePlaceholder")}
          />
          <Button type="submit" disabled={busy || !body.trim()}>
            {t("chatsSend")}
          </Button>
        </div>
      </form>
    </div>
  );
}
