import { getToken } from "firebase/app-check";
import { getFirebaseAppCheck, getFirebaseAuth } from "@pulse/firebase-client";
import type { PulseConversation, PulseSource } from "./types";

/**
 * Browser-side helpers for the Pulse AI endpoints.
 *
 * Every call carries a fresh Firebase ID token plus an App Check token when the
 * app is configured for it, matching what `lib/ai/auth.ts` verifies.
 */
export async function pulseAuthHeaders(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new PulseClientError("unauthenticated", "Sign in first.");

  const headers: Record<string, string> = {
    authorization: `Bearer ${await user.getIdToken()}`,
  };

  const appCheck = getFirebaseAppCheck();
  if (appCheck) {
    try {
      headers["x-firebase-appcheck"] = (await getToken(appCheck)).token;
    } catch {
      // Let the server decide: it only enforces App Check in production.
    }
  }
  return headers;
}

export class PulseClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PulseClientError";
  }
}

async function pulseFetch(input: string, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    headers: { ...(await pulseAuthHeaders()), ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new PulseClientError(
      payload?.error?.code ?? "request-failed",
      payload?.error?.message ?? "Pulse AI is unavailable.",
    );
  }
  return response;
}

export type PulseHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: PulseSource[];
  feedback: "up" | "down" | null;
};

function toDate(value: unknown): Date | null {
  return typeof value === "string" ? new Date(value) : null;
}

export async function listConversations(): Promise<PulseConversation[]> {
  const response = await pulseFetch("/api/ai/conversations");
  const payload = (await response.json()) as { conversations: unknown[] };
  return payload.conversations.map((raw) => {
    const entry = raw as Record<string, unknown>;
    return {
      id: String(entry.id),
      title: typeof entry.title === "string" ? entry.title : "",
      locale: entry.locale === "es" ? "es" : "en",
      messageCount: Number(entry.messageCount ?? 0),
      lastMessagePreview: String(entry.lastMessagePreview ?? ""),
      createdAt: toDate(entry.createdAt),
      updatedAt: toDate(entry.updatedAt),
    };
  });
}

export async function loadConversation(
  conversationId: string,
): Promise<PulseHistoryMessage[]> {
  const response = await pulseFetch(
    `/api/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  const payload = (await response.json()) as { messages: PulseHistoryMessage[] };
  return payload.messages;
}

export async function removeConversation(conversationId: string): Promise<void> {
  await pulseFetch(
    `/api/ai/conversations?conversationId=${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );
}

export async function sendFeedback(input: {
  conversationId: string;
  messageId: string;
  feedback: "up" | "down" | null;
}): Promise<void> {
  await pulseFetch("/api/ai/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
