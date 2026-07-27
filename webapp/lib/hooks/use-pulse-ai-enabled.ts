"use client";

import { useEffect, useState } from "react";
import { watchPulseAiEnabled } from "@/lib/firebase/platform-config";
import { useAuth } from "@/lib/providers/auth-provider";

/** Live Pulse AI platform flag. Defaults to true until the first snapshot. */
export function usePulseAiEnabled(): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!user) {
      setEnabled(true);
      return;
    }
    return watchPulseAiEnabled(setEnabled);
  }, [user]);

  return enabled;
}
