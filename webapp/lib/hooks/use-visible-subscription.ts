"use client";

import { useEffect, useEffectEvent, useState } from "react";

/**
 * Runs `subscribe` while the document is visible; tears down when the tab is
 * hidden so Firestore/RTDB listeners do not burn reads in the background.
 */
export function useVisibleSubscription(
  enabled: boolean,
  subscribe: () => () => void,
  deps: unknown[] = [],
) {
  const onSubscribe = useEffectEvent(subscribe);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    let stop: (() => void) | undefined;

    const start = () => {
      if (stop) return;
      stop = onSubscribe();
    };
    const pause = () => {
      stop?.();
      stop = undefined;
    };

    const onVisibility = () => {
      if (document.hidden) pause();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, [enabled, ...deps]);
}

/** Simple boolean for “page is visible right now”. */
export function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return visible;
}
