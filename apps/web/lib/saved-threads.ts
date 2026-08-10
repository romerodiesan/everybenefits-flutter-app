"use client";

import { useCallback, useSyncExternalStore } from "react";

const SAVED_KEY = "pulse-saved-threads";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SAVED_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return localStorage.getItem(SAVED_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

export function useSavedThreadIds(): Set<string> {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  try {
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function useSavedThread(threadId: string) {
  const saved = useSavedThreadIds();
  const isSaved = saved.has(threadId);
  const toggle = useCallback(() => {
    const next = new Set(readRaw());
    if (next.has(threadId)) next.delete(threadId);
    else next.add(threadId);
    localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
    emit();
  }, [threadId]);
  return { isSaved, toggle };
}

export function toggleSavedThread(threadId: string) {
  const next = new Set(readRaw());
  if (next.has(threadId)) next.delete(threadId);
  else next.add(threadId);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
  emit();
}

export function removeSavedThread(threadId: string) {
  const next = readRaw().filter((id) => id !== threadId);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  emit();
}
