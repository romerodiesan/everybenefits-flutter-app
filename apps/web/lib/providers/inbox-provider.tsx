"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { watchInbox } from "@/lib/firebase/chats";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import type { ChatConversation } from "@/lib/types";

type InboxContextValue = {
  chats: ChatConversation[];
  unreadTotal: number;
  ready: boolean;
  error: string | null;
};

const InboxContext = createContext<InboxContextValue | null>(null);

/**
 * Single shared RTDB inbox listener for AppShell badges + Chats page.
 * Pauses while the tab is hidden.
 */
export function InboxProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const uid =
    profile && !profile.isAnonymous ? profile.uid : null;
  const rtdbConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useVisibleSubscription(
    Boolean(uid) && rtdbConfigured,
    () => {
      if (!uid) return () => undefined;
      setReady(false);
      setError(null);
      return watchInbox(
        uid,
        (next) => {
          setChats(next);
          setError(null);
          setReady(true);
        },
        () => {
          setChats([]);
          setError("inbox");
          setReady(true);
        },
      );
    },
    [uid, rtdbConfigured],
  );

  const unreadTotal = useMemo(() => {
    if (!uid) return 0;
    return chats.reduce(
      (acc, chat) => acc + (chat.unreadCounts[uid] ?? 0),
      0,
    );
  }, [chats, uid]);

  const value = useMemo<InboxContextValue>(
    () => ({ chats, unreadTotal, ready, error }),
    [chats, unreadTotal, ready, error],
  );

  return (
    <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
  );
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    throw new Error("useInbox must be used within InboxProvider");
  }
  return ctx;
}
