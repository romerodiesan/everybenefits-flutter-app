import "server-only";

import { isStepCount, ToolLoopAgent, type ModelMessage } from "ai";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { aiConfig } from "./config";
import { authenticate, PulseHttpError, type PulseViewer } from "./auth";
import { CitationRegistry } from "./citations";
import {
  loadConversationHistory,
  openConversation,
  type ConversationState,
} from "./conversations";
import { buildInstructions, classifyScope, type ScopeVerdict } from "./policy";
import { consumeQuota } from "./rate-limit";
import { buildPulseTools } from "./tools";
import type { PulseActivity } from "./types";

export function parseLocale(value: unknown): AppLocale {
  return routing.locales.includes(value as AppLocale)
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export function createPulseAgent(input: {
  locale: AppLocale;
  viewer: PulseViewer;
  memorySummary: string | null;
  registry: CitationRegistry;
  emitActivity: (activity: PulseActivity) => void;
}) {
  const instructions = buildInstructions({
    locale: input.locale,
    role: input.viewer.role,
    displayName: input.viewer.displayName,
    memorySummary: input.memorySummary,
    today: new Date().toISOString().slice(0, 10),
  });

  return new ToolLoopAgent({
    model: aiConfig.model,
    instructions,
    tools: buildPulseTools({
      locale: input.locale,
      viewer: input.viewer,
      registry: input.registry,
      emitActivity: input.emitActivity,
    }),
    stopWhen: isStepCount(aiConfig.maxSteps),
    maxOutputTokens: aiConfig.maxOutputTokens,
    temperature: 0.3,
  });
}

export type PulseRun = {
  viewer: PulseViewer;
  locale: AppLocale;
  conversation: ConversationState;
  registry: CitationRegistry;
  /** Latest user turn, already length-checked. */
  userText: string;
  /** Full history handed to the model, trimmed to the memory window. */
  messages: ModelMessage[];
  scope: ScopeVerdict;
  startedAt: number;
};

/**
 * Everything that must happen before a token is generated: authentication,
 * quota, scope screening and conversation state.
 *
 * Throws `PulseHttpError` for anything the client should see as a plain HTTP
 * error rather than a stream.
 */
export async function preparePulseRun(input: {
  request: Request;
  locale: unknown;
  conversationId: unknown;
  userText: string;
}): Promise<PulseRun> {
  const startedAt = Date.now();
  const viewer = await authenticate(input.request);
  const locale = parseLocale(input.locale);

  const userText = input.userText.trim();
  if (!userText) {
    throw new PulseHttpError(400, "empty-message", "Write a question first.");
  }
  if (userText.length > aiConfig.maxPromptChars) {
    throw new PulseHttpError(
      413,
      "message-too-long",
      `Keep questions under ${aiConfig.maxPromptChars} characters.`,
    );
  }

  await consumeQuota(viewer.uid);

  const conversation = await openConversation({
    uid: viewer.uid,
    conversationId:
      typeof input.conversationId === "string" ? input.conversationId : null,
    locale,
  });
  const history = await loadConversationHistory({
    uid: viewer.uid,
    conversationId: conversation.id,
    limit: Math.max(0, aiConfig.memoryWindow - 1),
  });

  return {
    viewer,
    locale,
    conversation,
    registry: new CitationRegistry(locale),
    userText,
    messages: [
      ...history,
      { role: "user", content: userText },
    ] satisfies ModelMessage[],
    scope: classifyScope(userText),
    startedAt,
  };
}
