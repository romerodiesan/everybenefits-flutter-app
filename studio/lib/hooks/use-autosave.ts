"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced autosave; skips the first snapshot so mount does not write. */
export function useAutosave<T>(
  value: T,
  save: () => Promise<void>,
  enabled: boolean,
  delayMs = 700,
) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const timer = window.setTimeout(() => {
      void saveRef
        .current()
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, enabled, delayMs]);

  return { status };
}
