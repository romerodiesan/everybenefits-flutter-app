"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  createGroupChat,
  getOrCreateDm,
  partitionChatInbox,
} from "@/lib/firebase/chats";
import { mapCallableError } from "@/lib/firebase/callable-errors";
import {
  listDirectory,
  searchDirectoryContacts,
} from "@/lib/firebase/users";
import { listContacts } from "@/lib/firebase/social";
import {
  canCreateChatGroups,
  canConfigureGroupAutoJoin,
  canParticipateInChats,
} from "@/lib/roles";
import {
  type ChatConversation,
  type UserProfile,
  type UserRole,
} from "@/lib/types";
import { useInbox } from "@/lib/providers/inbox-provider";
import { Button, Avatar } from "@/components/ui/primitives";
import { ChatInboxSkeleton } from "@/components/ui/skeleton";
import {
  ConversationPane,
  writeChatSeed,
} from "@/components/chats/conversation-pane";
import { NewChatComposer } from "@/components/chats/new-chat-composer";

export { ConversationPane } from "@/components/chats/conversation-pane";

export function ChatsHome({ selectedId }: { selectedId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const access = useAccess();
  const {
    chats,
    ready: inboxReady,
    error: inboxProviderError,
  } = useInbox();
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

  const canChat =
    profile && canParticipateInChats(access, profile.isAnonymous);
  const canGroup = profile && canCreateChatGroups(access);
  const canAutoJoin =
    profile && canConfigureGroupAutoJoin(access);
  const rtdbConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
  const inboxError =
    inboxProviderError === "inbox" ? t("errorGeneric") : null;
  const displayInboxError =
    inboxError ?? (!rtdbConfigured ? t("errorRtdbConfig") : null);

  const visibleDirectory = searchResults ?? directory;
  useEffect(() => {
    if (!showNew || !profile) return;
    let cancelled = false;
    setDirectoryLoading(true);
    setComposerError(null);
    setSearchQuery("");
    setSearchResults(null);
    const loader =
      showNew === "dm" ? listContacts() : listDirectory(profile.uid);
    loader
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
    return partitionChatInbox(chats, profile.uid);
  }, [chats, profile]);
  const showSectionHeaders = Boolean(
    sections &&
      (sections.community.length || sections.pinned.length),
  );

  async function startDm(other: UserProfile) {
    if (!profile || composerBusy) return;
    setComposerBusy(true);
    setComposerError(null);
    try {
      const chat = await getOrCreateDm(profile, other);
      writeChatSeed(chat);
      setShowNew(null);
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      console.error(error);
      setComposerError(callableErrorMessage(error));
    } finally {
      setComposerBusy(false);
    }
  }

  function callableErrorMessage(error: unknown) {
    return mapCallableError(error, {
      generic: t("errorGeneric"),
      auth: t("errorAuth"),
      permissionDenied: t("chatsCreateGroupDenied"),
      dmBlocked: t("privacyDmBlocked"),
      notContacts: t("chatsNeedContacts"),
    });
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
    const checked = selectedMembers.includes(person.uid);
    const nextMembers = checked
      ? selectedMembers.filter((id) => id !== person.uid)
      : [...selectedMembers, person.uid];
    const nextPeople = { ...selectedPeople };
    if (checked) {
      delete nextPeople[person.uid];
    } else {
      nextPeople[person.uid] = person;
    }
    setSelectedMembers(nextMembers);
    setSelectedPeople(nextPeople);
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
                size="sm"
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
          <NewChatComposer
            mode={showNew}
            canAutoJoin={Boolean(canAutoJoin)}
            composerError={composerError}
            composerBusy={composerBusy}
            directoryLoading={directoryLoading}
            searchLoading={searchLoading}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            groupTitle={groupTitle}
            onGroupTitleChange={setGroupTitle}
            seedRoles={seedRoles}
            onToggleSeedRole={toggleSeedRole}
            autoJoin={autoJoin}
            onAutoJoinChange={setAutoJoin}
            selectedMembers={selectedMembers}
            selectedPeople={selectedPeople}
            directory={directory}
            visibleDirectory={visibleDirectory}
            onToggleMember={toggleMember}
            onStartDm={(person) => {
              void startDm(person);
            }}
            onOpenProfile={
              showNew === "dm"
                ? (person) => {
                    closeComposer();
                    router.push(`/members/${person.uid}`);
                  }
                : undefined
            }
            onStartGroup={startGroup}
            onClose={closeComposer}
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
