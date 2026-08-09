"use client";

import { startTransition, useEffect, useState } from "react";
import {
  countNewFeedThreads,
  listenForegroundMessages,
  registerWebPushToken,
  watchNotificationState,
} from "@/lib/firebase/notifications";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import { useInbox } from "@/lib/providers/inbox-provider";
import type { UserProfile } from "@/lib/types";

export type PushToast = { title: string; body: string; id: number };

export function useShellStats(profile: UserProfile | null) {
  const { unreadTotal } = useInbox();
  const [notifUnread, setNotifUnread] = useState(0);
  const [forumUnread, setForumUnread] = useState(0);
  const [newThreads, setNewThreads] = useState(0);
  const [pushToast, setPushToast] = useState<PushToast | null>(null);

  const uid =
    profile && !profile.isAnonymous ? profile.uid : null;

  useVisibleSubscription(
    Boolean(uid),
    () => {
      if (!uid) return () => undefined;
      return watchNotificationState(
        uid,
        (state) => {
          setNotifUnread(state.unreadCount);
          setForumUnread(state.unreadForumCount);
          void countNewFeedThreads(state.lastFeedSeenAt).then(setNewThreads);
        },
        () => {
          setNotifUnread(0);
          setForumUnread(0);
        },
      );
    },
    [uid],
  );

  useEffect(() => {
    if (!uid) {
      startTransition(() => {
        setNotifUnread(0);
        setForumUnread(0);
        setNewThreads(0);
      });
      return;
    }

    let cancelled = false;
    let stopPresence: (() => void) | undefined;
    void import("@/lib/firebase/presence").then(({ startPresence }) => {
      void startPresence(uid).then((stop) => {
        if (cancelled) {
          stop();
          return;
        }
        stopPresence = stop;
      });
    });

    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    let pushIdle: number | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      pushIdle = window.requestIdleCallback(() => {
        void registerWebPushToken(uid).catch(() => undefined);
      });
    } else {
      pushTimer = setTimeout(() => {
        void registerWebPushToken(uid).catch(() => undefined);
      }, 1500);
    }

    let stopForeground: (() => void) | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    void listenForegroundMessages((title, body) => {
      setPushToast({ title, body, id: Date.now() });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setPushToast(null), 5000);
    }).then((stop) => {
      if (cancelled) {
        stop?.();
        return;
      }
      stopForeground = stop ?? undefined;
    });

    return () => {
      cancelled = true;
      stopPresence?.();
      stopForeground?.();
      if (toastTimer) clearTimeout(toastTimer);
      if (pushIdle !== undefined && typeof window !== "undefined") {
        window.cancelIdleCallback(pushIdle);
      }
      if (pushTimer) clearTimeout(pushTimer);
    };
  }, [uid]);

  const forumBadge = forumUnread + newThreads;

  return { unreadTotal, notifUnread, forumBadge, pushToast };
}
