"use client";

import { startTransition, useEffect, useState } from "react";
import { watchPulseAiEnabled } from "@/lib/firebase/platform-config";
import { useAuth } from "@/lib/providers/auth-provider";

/** Live Pulse AI platform flag. Defaults to false until the first snapshot. */
export function usePulseAiEnabled(): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      startTransition(() => setEnabled(false));
      return;
    }
    return watchPulseAiEnabled((next) => {
      startTransition(() => setEnabled(next));
    });
  }, [user]);

  return user ? enabled : false;
}
