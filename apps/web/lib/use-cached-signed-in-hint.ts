"use client";

import { useEffect, useState } from "react";

const CACHE_KEYS = ["pulse_profile_v5", "pulse_profile_v4"];

/**
 * Lightweight signed-in hint for public pages without initializing Firebase.
 * Reads the slim session profile cache written by AuthProvider.
 */
export function useCachedSignedInHint(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      for (const key of CACHE_KEYS) {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as {
          uid?: string;
          isAnonymous?: boolean;
        };
        if (parsed?.uid && parsed.isAnonymous !== true) {
          setSignedIn(true);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return signedIn;
}
