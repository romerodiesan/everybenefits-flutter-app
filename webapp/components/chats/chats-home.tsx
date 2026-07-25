"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  createGroupChat,
  getOrCreateDm,
  hideChatForMe,
  markChatRead,
  sendMessage,
  setPinned,
  watchChat,
  watchInbox,
  watchMessages,
} from "@/lib/firebase/chats";
import { listDirectory, headlineName } from "@/lib/firebase/users";
import {
  canCreateChatGroups,
  canParticipateInChats,
} from "@/lib/roles";
import {
  type ChatConversation,
  type ChatMessage,
  type UserProfile,
} from "@/lib/types";
import { Button, Input, Panel, Avatar } from "@/components/ui/primitives";
import {
  AddReactionButton,
  ReactionChips,
} from "@/components/chats/message-reactions";

export function ChatsHome({ selectedId }: { selectedId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState<"dm" | "group" | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [directory, setDirectory] = useState<UserProfile[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const canChat =
    profile && canParticipateInChats(profile.role, profile.isAnonymous);
  const canGroup = profile && canCreateChatGroups(profile.role);

  useEffect(() => {
    if (!profile) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
      setInboxError(t("errorRtdbConfig"));
      return;
    }
    setInboxError(null);
    return watchInbox(
      profile.uid,
      (next) => {
        setChats(next);
        setInboxError(null);
      },
      (error) => {
        console.error(error);
        setInboxError(t("errorGeneric"));
      },
    );
  }, [profile, t]);

  useEffect(() => {
    if (!showNew || !profile) return;
    listDirectory(profile.uid).then(setDirectory).catch(() => setDirectory([]));
  }, [showNew, profile]);

  const pinned = useMemo(
    () =>
      chats.filter((c) => profile && c.pinnedBy[profile.uid]),
    [chats, profile],
  );
  const rest = useMemo(
    () => chats.filter((c) => !(profile && c.pinnedBy[profile.uid])),
    [chats, profile],
  );

  async function startDm(other: UserProfile) {
    if (!profile) return;
    const chat = await getOrCreateDm(profile, other);
    setShowNew(null);
    router.push(`/chats/${chat.id}`);
  }

  async function startGroup(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const members = directory.filter((d) => selectedMembers.includes(d.uid));
    const chat = await createGroupChat({
      creator: profile,
      title: groupTitle,
      members,
    });
    setShowNew(null);
    setGroupTitle("");
    setSelectedMembers([]);
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
              className={`pulse-row flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-white/[0.03] ${
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
    <div className="flex h-full min-h-0">
      <section className="flex w-full flex-col border-r border-glass-border lg:w-[320px] xl:w-[360px]">
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
          <div className="max-h-72 overflow-y-auto border-b border-glass-border p-4">
            <p className="mb-3 text-sm font-semibold">{t("chatsPickContact")}</p>
            {showNew === "group" && (
              <form onSubmit={startGroup} className="mb-3 space-y-2">
                <Input
                  placeholder={t("chatsGroupName")}
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  required
                />
                <Button type="submit" disabled={!selectedMembers.length}>
                  {t("chatsCreateGroup")}
                </Button>
              </form>
            )}
            <div className="space-y-1">
              {directory.map((person) => {
                const checked = selectedMembers.includes(person.uid);
                return (
                  <button
                    key={person.uid}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[18px] px-2 py-2 text-left hover:bg-white/[0.04]"
                    onClick={() => {
                      if (showNew === "dm") {
                        startDm(person);
                        return;
                      }
                      setSelectedMembers((prev) =>
                        checked
                          ? prev.filter((id) => id !== person.uid)
                          : [...prev, person.uid],
                      );
                    }}
                  >
                    <Avatar
                      name={headlineName(person)}
                      photoUrl={person.photoUrl}
                      size={40}
                    />
                    <span className="flex-1 font-semibold">
                      {headlineName(person)}
                    </span>
                    {showNew === "group" && (
                      <span className="text-brand">{checked ? "✓" : "+"}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {inboxError && (
            <p className="p-4 text-sm text-red-400">{inboxError}</p>
          )}
          {!inboxError && !chats.length && (
            <p className="p-4 text-sm text-muted">{t("chatsEmpty")}</p>
          )}
          {renderList(pinned, t("chatsPinned"))}
          {renderList(rest)}
        </div>
      </section>

      <section className="hidden flex-1 lg:flex lg:flex-col">
        {!selectedId && (
          <div className="flex flex-1 items-center justify-center text-muted">
            {t("chatsSelect")}
          </div>
        )}
        {selectedId && <ConversationPane chatId={selectedId} />}
      </section>
    </div>
  );
}

export function ConversationPane({ chatId }: { chatId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chat, setChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
      setError(t("errorRtdbConfig"));
      return;
    }
    setError(null);
    const onErr = (err: Error) => {
      console.error(err);
      setError(t("errorGeneric"));
    };
    const unsubChat = watchChat(chatId, setChat, onErr);
    const unsubMsg = watchMessages(chatId, setMessages, 40, onErr);
    return () => {
      unsubChat();
      unsubMsg();
    };
  }, [chatId, t]);

  useEffect(() => {
    if (profile && chat) {
      markChatRead(chatId, profile.uid).catch(() => undefined);
    }
  }, [chatId, chat, profile, messages.length]);

  if (error) {
    return <p className="p-6 text-sm text-red-400">{error}</p>;
  }

  if (!profile || !chat) {
    return <p className="p-6 text-muted">{t("loading")}</p>;
  }

  const title = chatTitleFor(chat, profile.uid, {
    support: t("chatsSupport"),
    team: t("chatsTeam"),
  });
  const pinned = Boolean(chat.pinnedBy[profile.uid]);
  const canPin = !chat.isSupportChat && !chat.isDefaultAgentGroup;

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !profile) return;
    setBusy(true);
    try {
      await sendMessage({ chatId, body, author: profile });
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
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
        className="flex gap-2 border-t border-glass-border p-4"
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("chatsMessagePlaceholder")}
        />
        <Button type="submit" disabled={busy || !body.trim()}>
          {t("chatsSend")}
        </Button>
      </form>
    </>
  );
}
