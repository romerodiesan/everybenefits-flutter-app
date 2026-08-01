"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Avatar, Button } from "@pulse/ui";
import {
  LANDING_CHATS,
  LANDING_VIEWER_UID,
} from "@/lib/landing/fixtures";
import { chatTitleFor, partitionChatInbox } from "@/lib/firebase/chats";

export function ChatsScreen() {
  const t = useTranslations();
  const sections = useMemo(
    () => partitionChatInbox(LANDING_CHATS, LANDING_VIEWER_UID),
    [],
  );
  const showSectionHeaders = Boolean(
    sections.support.length ||
      sections.community.length ||
      sections.pinned.length,
  );

  function renderList(
    items: typeof LANDING_CHATS,
    label?: string,
  ) {
    if (!items.length) return null;
    return (
      <div className="space-y-1.5">
        {label && (
          <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
        )}
        {items.map((chat) => {
          const title = chatTitleFor(chat, LANDING_VIEWER_UID, {
            support: t("chatsSupport"),
            team: t("chatsTeam"),
          });
          const unread = chat.unreadCounts[LANDING_VIEWER_UID] ?? 0;
          return (
            <div
              key={chat.id}
              className="pulse-row flex items-center gap-2.5 px-3 py-2.5"
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
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3 py-2.5">
        <h1 className="font-display text-xl font-bold">{t("chatsTitle")}</h1>
        <Button className="!h-8 !px-3 !text-xs">{t("chatsNew")}</Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-2.5 py-2.5">
        {showSectionHeaders ? (
          <>
            {renderList(sections.support, t("chatsSectionSupport"))}
            {renderList(sections.community, t("chatsSectionCommunity"))}
            {renderList(sections.pinned, t("chatsPinned"))}
            {renderList(sections.recent, t("chatsSectionRecent"))}
          </>
        ) : (
          renderList(sections.recent)
        )}
      </div>
    </div>
  );
}
