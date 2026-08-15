"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  chatMatchesInboxFilter,
  chatMatchesInboxQuery,
  chatTitleFor,
  chatInboxPhoto,
  hideChatForMe,
  partitionChatInbox,
  setPinned,
  type ChatInboxFilter,
} from "@/lib/firebase/chats";
import { chatTintStyle, formatChatClock } from "@/lib/chats/timeline";
import type { ChatConversation } from "@/lib/types";
import { useThemeSettings } from "@/lib/providers/theme-provider";

function ChatTintAvatar({
  name,
  size,
  isGroup,
  photoUrl,
}: {
  name: string;
  size: number;
  isGroup?: boolean;
  photoUrl?: string | null;
}) {
  const { resolvedDark } = useThemeSettings();
  const dark = resolvedDark;
  const initial = (name.trim() || "U").slice(0, 2).toUpperCase();
  const photo = photoUrl?.trim() || "";
  return (
    <span className="relative shrink-0">
      <span
        className="flex items-center justify-center overflow-hidden rounded-full font-display font-bold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.32,
          ...chatTintStyle(name, dark),
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage/LAN photo URLs
          <img
            src={photo}
            alt=""
            width={size}
            height={size}
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
      {isGroup ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sheet text-[9px] text-brand ring-1 ring-glass-border">
          +
        </span>
      ) : null}
    </span>
  );
}

export function ChatsInbox({
  chats,
  viewerUid,
  selectedId,
}: {
  chats: ChatConversation[];
  viewerUid: string;
  selectedId?: string;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChatInboxFilter>("all");

  const sections = useMemo(() => {
    const partitioned = partitionChatInbox(chats, viewerUid);
    const match = (chat: ChatConversation) => {
      const title = chatTitleFor(chat, viewerUid, { team: t("chatsTeam") });
      return (
        chatMatchesInboxFilter(chat, filter, viewerUid) &&
        chatMatchesInboxQuery(chat, query, viewerUid, title)
      );
    };
    return {
      community: partitioned.community.filter(match),
      pinned: partitioned.pinned.filter(match),
      recent: partitioned.recent.filter(match),
    };
  }, [chats, filter, query, t, viewerUid]);

  const empty =
    !sections.community.length &&
    !sections.pinned.length &&
    !sections.recent.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2.5 px-3 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("chatsSearchHint")}
          className="w-full rounded-2xl border border-glass-border bg-sheet px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "unread", "groups"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                filter === id
                  ? "bg-brand/15 text-brand ring-1 ring-brand/30"
                  : "bg-ink/[0.04] text-muted dark:bg-white/[0.06]"
              }`}
            >
              {id === "all"
                ? t("chatsFilterAll")
                : id === "unread"
                  ? t("chatsFilterUnread")
                  : t("chatsFilterGroups")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {empty ? (
          <p className="px-1 py-8 text-center text-sm text-muted">
            {t("chatsInboxFilterEmpty")}
          </p>
        ) : (
          <>
            {sections.community.map((chat) => (
              <CommunityHero
                key={chat.id}
                chat={chat}
                viewerUid={viewerUid}
                active={selectedId === chat.id}
              />
            ))}
            {sections.pinned.length > 0 && (
              <div>
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t("chatsPinned")}
                </p>
                <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
                  {sections.pinned.map((chat) => {
                    const title = chatTitleFor(chat, viewerUid, {
                      team: t("chatsTeam"),
                    });
                    return (
                      <Link
                        key={chat.id}
                        href={`/chats/${chat.id}`}
                        className="flex w-16 shrink-0 flex-col items-center gap-1"
                      >
                        <ChatTintAvatar
                          name={title}
                          size={48}
                          isGroup={chat.isGroup}
                          photoUrl={chatInboxPhoto(chat, viewerUid)}
                        />
                        <span className="w-full truncate text-center text-[11px] font-semibold">
                          {title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {sections.recent.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t("chatsSectionRecent")}
                </p>
                {sections.recent.map((chat) => (
                  <InboxRow
                    key={chat.id}
                    chat={chat}
                    viewerUid={viewerUid}
                    active={selectedId === chat.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CommunityHero({
  chat,
  viewerUid,
  active,
}: {
  chat: ChatConversation;
  viewerUid: string;
  active: boolean;
}) {
  const t = useTranslations();
  const title = chatTitleFor(chat, viewerUid, { team: t("chatsTeam") });
  const unread = chat.unreadCounts[viewerUid] ?? 0;
  const preview = chat.lastMessage || t("chatsSectionCommunity");
  return (
    <Link
      href={`/chats/${chat.id}`}
      className={`flex items-center gap-3 rounded-2xl border border-glass-border px-3 py-3 ${
        active ? "bg-brand/[0.1] ring-1 ring-brand/25" : "bg-sheet"
      }`}
    >
      <ChatTintAvatar name={title} size={54} isGroup />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
          {t("chatsSectionCommunity")}
        </p>
        <p className="truncate font-display text-lg font-bold">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{preview}</p>
      </div>
      {unread > 0 && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-on-brand">
          {unread}
        </span>
      )}
    </Link>
  );
}

function InboxRow({
  chat,
  viewerUid,
  active,
}: {
  chat: ChatConversation;
  viewerUid: string;
  active: boolean;
}) {
  const t = useTranslations();
  const title = chatTitleFor(chat, viewerUid, { team: t("chatsTeam") });
  const unread = chat.unreadCounts[viewerUid] ?? 0;
  const pinned = Boolean(chat.pinnedBy[viewerUid]);
  let preview = chat.lastMessage || t("chatsNoMessagesYet");
  if (chat.lastMessage && chat.lastMessageSenderId === viewerUid) {
    preview = t("chatYouPrefix", { preview });
  }
  return (
    <div className="group relative">
      <Link
        href={`/chats/${chat.id}`}
        className={`flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03] ${
          active ? "bg-brand/[0.08]" : ""
        }`}
      >
        <ChatTintAvatar name={title} size={42} isGroup={chat.isGroup} photoUrl={chatInboxPhoto(chat, viewerUid)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {pinned ? (
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0 fill-current text-muted"
                aria-hidden
              >
                <path d="M16 9V4h1V2H7v2h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
            ) : null}
            <p className="min-w-0 flex-1 truncate font-display text-sm font-bold">
              {title}
            </p>
            <span
              className={`shrink-0 text-[11px] tabular-nums ${
                unread > 0 ? "font-bold text-brand" : "text-muted"
              }`}
            >
              {chat.lastMessageAt ? formatChatClock(chat.lastMessageAt) : ""}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              {preview}
            </p>
            {unread > 0 && (
              <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-on-brand">
                {unread}
              </span>
            )}
          </div>
        </div>
      </Link>
      {!chat.isDefaultAgentGroup && (
        <div className="pointer-events-none absolute inset-y-2 right-2 flex items-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            className="rounded-md bg-sheet/95 px-1.5 py-0.5 text-[10px] font-semibold text-muted shadow-sm ring-1 ring-glass-border"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void setPinned(chat.id, viewerUid, !pinned);
            }}
          >
            {pinned ? t("chatsUnpin") : t("chatsPin")}
          </button>
          <button
            type="button"
            className="rounded-md bg-sheet/95 px-1.5 py-0.5 text-[10px] font-semibold text-muted shadow-sm ring-1 ring-glass-border"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void hideChatForMe(chat.id, viewerUid);
            }}
          >
            {t("chatsHide")}
          </button>
        </div>
      )}
    </div>
  );
}
