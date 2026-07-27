"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced autosave; skips the first snapshot so mount does not write. */
export function useAutosave<T>(
  value: T,
  save: () => Promise<void>,
  enabled: boolean,
  delayMs = 1200,
) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const first = useRef(true);
  const onSave = useEffectEvent(save);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const timer = window.setTimeout(() => {
      void onSave()
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, enabled, delayMs]);

  return { status };
}
