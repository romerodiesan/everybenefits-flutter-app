import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { getFirebaseRtdb } from "./client";

/** Heartbeat while the tab is visible; drop from count after this window. */
export const PRESENCE_STALE_MS = 90_000;
const HEARTBEAT_MS = 30_000;

type PresenceLeaf = {
  at?: number | null;
  online?: boolean;
};

function tabClientId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const key = "pulse_presence_tab";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `t_${Date.now()}`;
  }
}

function isFresh(at: unknown, now: number): boolean {
  return typeof at === "number" && now - at < PRESENCE_STALE_MS;
}

function isLegacyLeaf(node: Record<string, unknown>): boolean {
  return "online" in node || typeof node.at === "number";
}

function hasTabChildren(node: Record<string, unknown>): boolean {
  return Object.values(node).some(
    (child) =>
      child &&
      typeof child === "object" &&
      !Array.isArray(child) &&
      "at" in (child as object),
  );
}

/**
 * Count uids that currently have at least one visible/in-use tab.
 * Supports tab nodes (`presence/$uid/$tabId`) and legacy single nodes.
 */
export function countActivePresence(
  tree: unknown,
  now = Date.now(),
): number {
  if (!tree || typeof tree !== "object") return 0;
  let count = 0;
  for (const node of Object.values(tree as Record<string, unknown>)) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;

    if (isLegacyLeaf(record) && !hasTabChildren(record)) {
      const leaf = record as PresenceLeaf;
      if (leaf.online === false) continue;
      if (isFresh(leaf.at, now)) count += 1;
      continue;
    }

    const freshTab = Object.values(record).some((child) => {
      if (!child || typeof child !== "object") return false;
      return isFresh((child as PresenceLeaf).at, now);
    });
    if (freshTab) count += 1;
  }
  return count;
}

function countOnlineIndex(tree: unknown): number {
  if (!tree || typeof tree !== "object") return 0;
  return Object.values(tree as Record<string, unknown>).filter((v) => v === true)
    .length;
}

/**
 * Mark this browser tab online only while it is visible and in use.
 * Multiple tabs for the same uid count as one person.
 */
export async function startPresence(uid: string): Promise<() => void> {
  if (!uid || !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    return () => undefined;
  }
  if (typeof document === "undefined") {
    return () => undefined;
  }

  let db: ReturnType<typeof getFirebaseRtdb>;
  try {
    db = getFirebaseRtdb();
  } catch {
    return () => undefined;
  }
  const clientId = tabClientId();
  const uidRef = ref(db, `presence/${uid}`);
  const statusRef = ref(db, `presence/${uid}/${clientId}`);
  const onlineRef = ref(db, `online/${uid}`);
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  let migrated = false;

  const migrateLegacy = async () => {
    if (migrated) return;
    migrated = true;
    try {
      const snap = await get(uidRef);
      const val = snap.val();
      if (
        val &&
        typeof val === "object" &&
        isLegacyLeaf(val as Record<string, unknown>) &&
        !hasTabChildren(val as Record<string, unknown>)
      ) {
        await remove(uidRef);
      }
    } catch {
      // ignore — still try to publish tab node
    }
  };

  const publish = async () => {
    if (stopped || document.hidden) return;
    try {
      await migrateLegacy();
      await set(statusRef, { at: serverTimestamp() });
      await onDisconnect(statusRef).remove();
    } catch {
      // Rules / offline — skip this beat.
      return;
    }
    // Shallow index is best-effort (rules may lag behind a deploy).
    try {
      await set(onlineRef, true);
      await onDisconnect(onlineRef).remove();
    } catch {
      // ignore — headcount falls back to presence tree
    }
  };

  const clear = async () => {
    try {
      await onDisconnect(statusRef).cancel();
    } catch {
      // ignore
    }
    try {
      await onDisconnect(onlineRef).cancel();
    } catch {
      // ignore
    }
    try {
      await remove(statusRef);
    } catch {
      // ignore
    }
    try {
      const snap = await get(uidRef);
      const val = snap.val();
      if (
        !val ||
        typeof val !== "object" ||
        !hasTabChildren(val as Record<string, unknown>)
      ) {
        await remove(onlineRef);
      }
    } catch {
      try {
        await remove(onlineRef);
      } catch {
        // ignore
      }
    }
  };

  const startHeartbeat = () => {
    if (heartbeat) return;
    heartbeat = setInterval(() => {
      void publish();
    }, HEARTBEAT_MS);
  };

  const stopHeartbeat = () => {
    if (!heartbeat) return;
    clearInterval(heartbeat);
    heartbeat = undefined;
  };

  const syncVisibility = () => {
    if (stopped) return;
    if (document.hidden) {
      stopHeartbeat();
      void clear();
      return;
    }
    void publish();
    startHeartbeat();
  };

  const onPageHide = () => {
    stopHeartbeat();
    void clear();
  };

  syncVisibility();
  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    stopped = true;
    stopHeartbeat();
    document.removeEventListener("visibilitychange", syncVisibility);
    window.removeEventListener("pagehide", onPageHide);
    void clear();
  };
}

/**
 * Prefer the shallow `online/` index; fall back to the full `presence/` tree
 * when the index is unavailable (older rules / permission denied).
 */
export function watchOnlineCount(
  onChange: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    onChange(0);
    return () => undefined;
  }

  let db: ReturnType<typeof getFirebaseRtdb>;
  try {
    db = getFirebaseRtdb();
  } catch (error) {
    onChange(0);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return () => undefined;
  }

  let unsubPresence: Unsubscribe | undefined;
  let usingPresenceFallback = false;

  const listenPresence = () => {
    if (usingPresenceFallback) return;
    usingPresenceFallback = true;
    unsubPresence = onValue(
      ref(db, "presence"),
      (snap) => {
        onChange(countActivePresence(snap.val(), Date.now()));
      },
      (error) => {
        onChange(0);
        onError?.(error);
      },
    );
  };

  const unsubOnline = onValue(
    ref(db, "online"),
    (snap) => {
      // If we already fell back, ignore online updates.
      if (usingPresenceFallback) return;
      onChange(countOnlineIndex(snap.val()));
    },
    () => {
      // Index missing or denied — use the legacy full tree.
      listenPresence();
    },
  );

  return () => {
    unsubOnline();
    unsubPresence?.();
  };
}
