"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  sendMessage,
  watchInbox,
} from "@/lib/firebase/chats";
import { mapCallableError } from "@/lib/firebase/callable-errors";
import type { ChatConversation, ForumThread } from "@/lib/types";
import { Button, Panel } from "@/components/ui/primitives";

function clip(text: string, max = 120) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export function sharedPostFromThread(thread: ForumThread) {
  return {
    threadId: thread.id,
    title: thread.title,
    excerpt: clip(thread.body),
    authorName: thread.authorName,
    tags: thread.tags.slice(0, 2),
  };
}

export function ShareToChatDialog({
  thread,
  onClose,
}: {
  thread: ForumThread;
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shared = sharedPostFromThread(thread);

  useEffect(() => {
    if (!profile) return;
    return watchInbox(
      profile.uid,
      setChats,
      (error) => {
        console.error(error);
        setError(t("errorGeneric"));
      },
    );
  }, [profile, t]);

  async function shareTo(chat: ChatConversation) {
    if (!profile) return;
    setBusyId(chat.id);
    setError(null);
    try {
      await sendMessage({
        chatId: chat.id,
        body: "",
        author: profile,
        sharedPost: shared,
      });
      onClose();
      router.push(`/chats/${chat.id}`);
    } catch (err) {
      setError(
        mapCallableError(err, {
          generic: t("errorGeneric"),
          auth: t("errorAuth"),
          permissionDenied: t("errorGeneric"),
          dmBlocked: t("privacyDmBlocked"),
        }),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("dialogClose")}
        onClick={onClose}
      />
      <Panel className="relative z-10 max-h-[80svh] w-full max-w-md overflow-hidden !p-0">
        <div className="border-b border-glass-border p-5">
          <h2 className="font-display text-xl font-bold">
            {t("shareToChatTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("shareToChatSubtitle")}</p>
          <div className="mt-4 rounded-2xl border border-glass-border bg-sheet/60 p-3">
            <p className="font-semibold">{shared.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {shared.excerpt}
            </p>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {!chats.length && (
            <p className="p-4 text-sm text-muted">{t("shareToChatEmpty")}</p>
          )}
          {chats.map((chat) => {
            const title = chatTitleFor(chat, profile.uid, {
              team: t("chatsTeam"),
            });
            return (
              <button
                key={chat.id}
                type="button"
                disabled={busyId === chat.id}
                onClick={() => shareTo(chat)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-white/5 disabled:opacity-50"
              >
                <span className="font-medium">{title}</span>
                <span className="text-sm text-brand">
                  {busyId === chat.id ? t("loading") : t("shareToChatAction")}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="px-5 pb-3 text-sm text-red-400">{error}</p>}
        <div className="border-t border-glass-border p-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            {t("dialogClose")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
