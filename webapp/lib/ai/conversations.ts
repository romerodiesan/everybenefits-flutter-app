import "server-only";

import { generateText, type ModelMessage } from "ai";
import { FieldValue } from "firebase-admin/firestore";
import type { AppLocale } from "@/i18n/routing";
import {
  aiConfig,
  CONVERSATIONS_SUBCOLLECTION,
  MESSAGES_SUBCOLLECTION,
} from "./config";
import { adminDb } from "./firebase-admin";
import { toServerModelHistory } from "./history";
import type { PulseSource } from "./types";

export type ConversationState = {
  id: string;
  title: string | null;
  memorySummary: string | null;
  messageCount: number;
  isNew: boolean;
};

function conversationsRef(uid: string) {
  return adminDb()
    .collection("users")
    .doc(uid)
    .collection(CONVERSATIONS_SUBCOLLECTION);
}

/** Firestore ids are opaque; reject anything that could escape the subtree. */
export function isValidConversationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export async function openConversation(input: {
  uid: string;
  conversationId?: string | null;
  locale: AppLocale;
}): Promise<ConversationState> {
  const { uid, locale } = input;

  if (isValidConversationId(input.conversationId)) {
    const ref = conversationsRef(uid).doc(input.conversationId);
    const snapshot = await ref.get();
    if (snapshot.exists) {
      return {
        id: snapshot.id,
        title: (snapshot.get("title") as string) ?? null,
        memorySummary: (snapshot.get("memorySummary") as string) ?? null,
        messageCount: Number(snapshot.get("messageCount") ?? 0),
        isNew: false,
      };
    }
  }

  const ref = conversationsRef(uid).doc();
  await ref.set({
    title: null,
    locale,
    messageCount: 0,
    memorySummary: null,
    lastMessagePreview: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, title: null, memorySummary: null, messageCount: 0, isNew: true };
}

export async function loadConversationHistory(input: {
  uid: string;
  conversationId: string;
  limit: number;
}): Promise<ModelMessage[]> {
  const snapshot = await conversationsRef(input.uid)
    .doc(input.conversationId)
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.max(1, input.limit))
    .get();

  return toServerModelHistory(
    snapshot.docs.reverse().map((doc) => doc.data()),
    input.limit,
  );
}

function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Persists one exchange. Written after the stream completes so a cancelled
 * response never leaves a half-message in history.
 */
export async function appendTurn(input: {
  uid: string;
  conversationId: string;
  userText: string;
  assistantText: string;
  sources: PulseSource[];
  title?: string | null;
}): Promise<{ assistantMessageId: string }> {
  const conversation = conversationsRef(input.uid).doc(input.conversationId);
  const messages = conversation.collection(MESSAGES_SUBCOLLECTION);
  const userDoc = messages.doc();
  const assistantDoc = messages.doc();

  const batch = adminDb().batch();
  batch.set(userDoc, {
    role: "user",
    text: input.userText.slice(0, aiConfig.maxPromptChars),
    sources: [],
    createdAt: FieldValue.serverTimestamp(),
    feedback: null,
  });
  batch.set(assistantDoc, {
    role: "assistant",
    text: input.assistantText,
    sources: input.sources,
    createdAt: FieldValue.serverTimestamp(),
    feedback: null,
  });
  batch.set(
    conversation,
    {
      messageCount: FieldValue.increment(2),
      lastMessagePreview: preview(input.assistantText || input.userText),
      updatedAt: FieldValue.serverTimestamp(),
      ...(input.title ? { title: input.title } : {}),
    },
    { merge: true },
  );
  await batch.commit();

  return { assistantMessageId: assistantDoc.id };
}

/** Six-word-ish label for the history list, generated once per conversation. */
export async function generateTitle(
  firstMessage: string,
  locale: AppLocale,
): Promise<string> {
  const fallback = preview(firstMessage).slice(0, 60) || "Pulse AI";
  try {
    const { text } = await generateText({
      model: aiConfig.fastModel,
      instructions: `Write a title of at most six words for an insurance-industry chat, in ${
        locale === "es" ? "Spanish" : "English"
      }. Plain text only, no quotes, no trailing period.`,
      prompt: firstMessage.slice(0, 500),
      maxOutputTokens: 32,
      maxRetries: 0,
    });
    const title = text.replace(/["'\n]/g, "").trim();
    return title ? title.slice(0, 60) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Collapses everything older than the verbatim window into a short profile of
 * the user's situation, so long conversations stay cheap without losing what
 * matters (their state, lines of business, licence status, goals).
 */
export async function refreshMemorySummary(input: {
  uid: string;
  conversationId: string;
  locale: AppLocale;
  previousSummary: string | null;
  recentTurns: { role: "user" | "assistant"; text: string }[];
}): Promise<void> {
  const transcript = input.recentTurns
    .map((turn) => `${turn.role === "user" ? "User" : "Pulse"}: ${turn.text}`)
    .join("\n")
    .slice(0, 6000);
  if (!transcript.trim()) return;

  try {
    const { text } = await generateText({
      model: aiConfig.fastModel,
      instructions: [
        "You maintain a running profile of an insurance professional talking to an assistant.",
        "Merge the previous profile with the new transcript into at most five short bullet points.",
        "Keep only durable facts that change future answers: their role, licence and NPN status, states they work in, lines of business, carriers, current goals and open questions.",
        "Drop pleasantries, one-off answers and anything already resolved. Never invent facts.",
        `Write in ${input.locale === "es" ? "Spanish" : "English"}.`,
      ].join(" "),
      prompt: [
        input.previousSummary
          ? `Previous profile:\n${input.previousSummary}`
          : "Previous profile: (none)",
        "",
        `New transcript:\n${transcript}`,
      ].join("\n"),
      maxOutputTokens: 300,
      maxRetries: 0,
    });

    const summary = text.trim().slice(0, 2000);
    if (!summary) return;
    await conversationsRef(input.uid).doc(input.conversationId).set(
      { memorySummary: summary, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    console.warn("[pulse-ai] memory summary failed", error);
  }
}

export async function deleteConversation(uid: string, conversationId: string) {
  const conversation = conversationsRef(uid).doc(conversationId);
  const messages = await conversation.collection(MESSAGES_SUBCOLLECTION).get();
  // Conversations are short; a single batch is always enough in practice.
  const batch = adminDb().batch();
  messages.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(conversation);
  await batch.commit();
}

export async function setMessageFeedback(input: {
  uid: string;
  conversationId: string;
  messageId: string;
  feedback: "up" | "down" | null;
  reason?: string | null;
}) {
  await conversationsRef(input.uid)
    .doc(input.conversationId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc(input.messageId)
    .set(
      {
        feedback: input.feedback,
        feedbackReason: input.reason?.slice(0, 500) ?? null,
        feedbackAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
