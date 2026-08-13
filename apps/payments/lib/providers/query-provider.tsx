"use client";

import { useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createPulseQueryClientOptions } from "@pulse/firebase-web";

export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient(createPulseQueryClientOptions()),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
