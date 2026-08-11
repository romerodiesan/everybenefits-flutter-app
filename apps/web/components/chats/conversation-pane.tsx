"use client";

import {
  FormEvent,
  startTransition,
  useEffect,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  chatTitleFor,
  hideChatForMe,
  markChatRead,
  sendMessage,
  setPinned,
  watchChat,
  watchMessages,
} from "@/lib/firebase/chats";
import { type ChatConversation, type ChatMessage } from "@/lib/types";
import { Button, Input, Panel } from "@/components/ui/primitives";
import { ConversationSkeleton } from "@/components/ui/skeleton";
import {
  AddReactionButton,
  ReactionChips,
} from "@/components/chats/message-reactions";

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
    team: t("chatsTeam"),
  });
  const pinned = Boolean(chat.pinnedBy[profile.uid]);
  const canPin = !chat.isDefaultAgentGroup;

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

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((message) => {
          const mine = message.senderId === profile.uid;
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className="flex max-w-[88%] items-end gap-1.5">
                {mine && (
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
                  <ReactionChips
                      chatId={chatId}
                      message={message}
                      uid={profile.uid}
                      mine={mine}
                    />
                </div>
                {!mine && (
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
