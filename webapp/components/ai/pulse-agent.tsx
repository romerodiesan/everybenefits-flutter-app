"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type SVGProps,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AppLocale } from "@/i18n/routing";
import {
  listConversations,
  loadConversation,
  pulseAuthHeaders,
  removeConversation,
  sendFeedback,
} from "@/lib/ai/pulse-client";
import type {
  PulseActivity,
  PulseConversation,
  PulseNotice,
  PulseSource,
  PulseUIMessage,
} from "@/lib/ai/types";
import { useAuth } from "@/lib/providers/auth-provider";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import { Button } from "@/components/ui/primitives";
import {
  AnswerBody,
  IconSpark,
  IconThumb,
  NoticeBanner,
  SourceCard,
} from "./pulse-parts";

function IconHistory(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5V12l3 1.8M3.6 12a8.4 8.4 0 1 0 2.2-5.7M3.5 4.5V9H8"
      />
    </svg>
  );
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M12 5.5v13M5.5 12h13"
      />
    </svg>
  );
}

function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M4.4 19.6 20.5 12 4.4 4.4 4.4 10.2 15 12 4.4 13.8Z"
      />
    </svg>
  );
}

function IconStop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Everything the UI needs from one assistant turn, gathered from its parts. */
type AssistantView = {
  text: string;
  activities: PulseActivity[];
  sources: PulseSource[];
  notices: PulseNotice[];
  storedId: string | null;
};

function readAssistant(message: PulseUIMessage): AssistantView {
  const view: AssistantView = {
    text: "",
    activities: [],
    sources: [],
    notices: [],
    storedId: null,
  };

  for (const part of message.parts) {
    if (part.type === "text") {
      view.text += part.text;
    } else if (part.type === "data-pulse-activity") {
      view.activities.push(part.data);
    } else if (part.type === "data-pulse-sources") {
      view.sources = part.data.sources;
    } else if (part.type === "data-pulse-notice") {
      view.notices.push(part.data);
    } else if (part.type === "data-pulse-saved") {
      view.storedId = part.data.messageId;
    }
  }
  return view;
}

function textOf(message: PulseUIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** Rebuilds a stored turn so reopened history renders like a live answer. */
function toUIMessage(stored: {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: PulseSource[];
}): PulseUIMessage {
  return {
    id: stored.id,
    role: stored.role,
    parts: [
      { type: "text", text: stored.text },
      ...(stored.sources.length
        ? ([
            {
              type: "data-pulse-sources" as const,
              data: { sources: stored.sources },
            },
          ] as PulseUIMessage["parts"])
        : []),
      ...(stored.role === "assistant"
        ? ([
            {
              type: "data-pulse-saved" as const,
              data: { messageId: stored.id },
            },
          ] as PulseUIMessage["parts"])
        : []),
    ],
  };
}

export function PulseAgent() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const { user, profile, loading: authLoading } = useAuth();
  const pulseAiEnabled = usePulseAiEnabled();
  const needsSignIn =
    !user ||
    profile?.isAnonymous === true ||
    profile?.role === "guest";

  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<PulseConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Bumped whenever a turn lands, so the rail reloads without polling.
  const [historyEpoch, setHistoryEpoch] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<PulseUIMessage>({
        api: "/api/ai/chat",
        // `body` carries the conversation id supplied at send time.
        prepareSendMessagesRequest: async ({ messages, body }) => ({
          headers: {
            ...(await pulseAuthHeaders()),
            "content-type": "application/json",
          },
          body: { messages, locale, ...body },
        }),
      }),
    [locale],
  );

  const { messages, setMessages, sendMessage, status, stop, error, regenerate } =
    useChat<PulseUIMessage>({
      transport,
      onData: (part) => {
        if (part.type !== "data-pulse-conversation") return;
        const { conversationId: id, title } = part.data;
        setConversationId(id);
        if (title) {
          setConversations((prev) =>
            prev.map((entry) => (entry.id === id ? { ...entry, title } : entry)),
          );
        }
      },
      onFinish: () => setHistoryEpoch((epoch) => epoch + 1),
    });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => {
        // History is a convenience; a failure should not break the chat.
      });
    return () => {
      cancelled = true;
    };
  }, [user, historyEpoch]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages, status]);

  const startNewChat = useCallback(() => {
    stop();
    setConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
  }, [setMessages, stop]);

  const openConversation = useCallback(
    async (id: string) => {
      stop();
      setHistoryOpen(false);
      setHistoryLoading(true);
      try {
        const stored = await loadConversation(id);
        setConversationId(id);
        setMessages(stored.map(toUIMessage));
        setFeedback(
          Object.fromEntries(
            stored
              .filter((message) => message.feedback)
              .map((message) => [message.id, message.feedback as "up" | "down"]),
          ),
        );
      } catch {
        // Leave the current thread untouched on failure.
      } finally {
        setHistoryLoading(false);
      }
    },
    [setMessages, stop],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((entry) => entry.id !== id));
      if (conversationId === id) startNewChat();
      try {
        await removeConversation(id);
      } catch {
        setHistoryEpoch((epoch) => epoch + 1);
      }
    },
    [conversationId, startNewChat],
  );

  const rate = useCallback(
    async (storedId: string, value: "up" | "down") => {
      if (!conversationId) return;
      const next = feedback[storedId] === value ? null : value;
      setFeedback((prev) => {
        const copy = { ...prev };
        if (next) copy[storedId] = next;
        else delete copy[storedId];
        return copy;
      });
      try {
        await sendFeedback({
          conversationId,
          messageId: storedId,
          feedback: next,
        });
      } catch {
        // Keep the optimistic state; feedback is advisory.
      }
    },
    [conversationId, feedback],
  );

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      void sendMessage({ text: trimmed }, { body: { conversationId } });
    },
    [busy, conversationId, sendMessage],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(input);
  };

  const suggestions = useMemo(
    () => [
      t("aiSuggestion1"),
      t("aiSuggestion2"),
      t("aiSuggestion3"),
      t("aiSuggestion4"),
    ],
    [t],
  );

  if (!authLoading && needsSignIn) {
    return (
      <div className="mx-auto flex h-full max-w-3xl items-center justify-center p-6">
        <p className="pulse-sheet px-4 py-10 text-center text-sm text-muted">
          {t("aiSignInRequired")}
        </p>
      </div>
    );
  }

  if (!pulseAiEnabled) {
    return (
      <div className="mx-auto flex h-full max-w-3xl items-center justify-center p-6">
        <p className="pulse-sheet px-4 py-10 text-center text-sm text-muted">
          {t("aiDisabled")}
        </p>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const waiting =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !textOf(lastMessage).trim());

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl gap-6 p-4 lg:p-6">
      <HistoryRail
        conversations={conversations}
        activeId={conversationId}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={openConversation}
        onDelete={deleteConversation}
        onNew={startNewChat}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/14 text-brand">
            <IconSpark />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold">
              {t("aiTitle")}
            </h1>
            <p className="truncate text-xs text-muted">{t("aiSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="pulse-sheet flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:text-ink lg:hidden"
            aria-label={t("aiHistory")}
          >
            <IconHistory />
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="pulse-sheet flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <IconPlus />
            <span className="hidden sm:inline">{t("aiNewChat")}</span>
          </button>
        </header>

        <div
          ref={scrollerRef}
          className="flex-1 space-y-5 overflow-y-auto scroll-smooth pb-2"
        >
          {historyLoading && (
            <p className="text-sm text-muted">{t("aiLoading")}</p>
          )}

          {!messages.length && !historyLoading && (
            <div className="pulse-sheet p-5">
              <h2 className="font-display text-lg font-bold">
                {t("aiEmptyTitle")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t("aiEmptyBody")}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    className="rounded-xl border border-glass-border px-3 py-2.5 text-left text-sm text-ink transition hover:border-brand/40 hover:bg-brand/[0.06]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="bubble-mine max-w-[85%] px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm">{textOf(message)}</p>
                </div>
              </div>
            ) : (
              <AssistantTurn
                key={message.id}
                view={readAssistant(message)}
                feedback={feedback}
                onRate={rate}
              />
            ),
          )}

          {waiting && (
            <p className="flex items-center gap-2 text-sm text-muted" aria-hidden>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-[#B42318]/40 bg-[#B42318]/[0.08] px-3 py-2 text-xs text-[#B42318]">
              {error.message || t("aiError")}
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-4">
          <div className="pulse-sheet flex items-end gap-2 p-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
            />
            {busy ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => stop()}
                className="h-10 w-10 !px-0"
                aria-label={t("aiStop")}
              >
                <IconStop />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                className="h-10 w-10 !px-0"
                aria-label={t("chatsSend")}
              >
                <IconSend />
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-muted">
              {t("aiDisclaimer")}
            </p>
            {!busy && messages.length > 0 && (
              <button
                type="button"
                onClick={() => void regenerate({ body: { conversationId } })}
                className="shrink-0 text-[11px] font-semibold text-muted transition hover:text-ink"
              >
                {t("aiRegenerate")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function AssistantTurn({
  view,
  feedback,
  onRate,
}: {
  view: AssistantView;
  feedback: Record<string, "up" | "down">;
  onRate: (storedId: string, value: "up" | "down") => void;
}) {
  const t = useTranslations();
  const current = view.storedId ? feedback[view.storedId] : undefined;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/14 text-brand">
        <IconSpark width={15} height={15} />
      </span>
      <div className="min-w-0 flex-1">
        <AnswerBody text={view.text} sources={view.sources} />

        {view.notices.map((notice, index) => (
          <NoticeBanner key={`${notice.kind}-${index}`} notice={notice} />
        ))}

        {view.sources.length > 0 && (
          <section className="mt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t("aiSources")}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {view.sources.map((source) => (
                <SourceCard key={source.ref} source={source} />
              ))}
            </div>
          </section>
        )}

        {view.storedId && (
          <div className="mt-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRate(view.storedId as string, "up")}
              aria-label={t("aiFeedbackUp")}
              aria-pressed={current === "up"}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                current === "up"
                  ? "bg-brand/14 text-brand"
                  : "text-muted hover:text-ink"
              }`}
            >
              <IconThumb />
            </button>
            <button
              type="button"
              onClick={() => onRate(view.storedId as string, "down")}
              aria-label={t("aiFeedbackDown")}
              aria-pressed={current === "down"}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                current === "down"
                  ? "bg-[#B42318]/12 text-[#B42318]"
                  : "text-muted hover:text-ink"
              }`}
            >
              <IconThumb down />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRail({
  conversations,
  activeId,
  open,
  onClose,
  onSelect,
  onDelete,
  onNew,
}: {
  conversations: PulseConversation[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations();

  const list = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("aiHistory")}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="text-xs font-semibold text-brand"
        >
          {t("aiNewChat")}
        </button>
      </div>
      {conversations.length === 0 ? (
        <p className="text-xs text-muted">{t("aiHistoryEmpty")}</p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left transition ${
                  activeId === conversation.id
                    ? "bg-brand/12 text-ink"
                    : "text-muted hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <span className="block truncate text-sm font-medium">
                  {conversation.title || t("aiUntitled")}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {conversation.lastMessagePreview}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                aria-label={t("aiDeleteChat")}
                className="absolute right-1.5 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-muted transition hover:text-[#B42318] group-hover:flex"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 overflow-y-auto lg:block">{list}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t("dialogClose")}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-glass-border bg-sheet p-4">
            {list}
          </div>
        </div>
      )}
    </>
  );
}
