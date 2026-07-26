import "server-only";

import type { LanguageModelUsage, StepResult, ToolSet } from "ai";
import { aiConfig } from "./config";
import {
  appendTurn,
  generateTitle,
  refreshMemorySummary,
} from "./conversations";
import {
  refusalMessage,
  refusalReasonForScope,
  reviewAnswer,
} from "./policy";
import { recordRun } from "./runs";
import type { PulseRun } from "./agent";
import type { PulseRefusalReason, PulseSource } from "./types";

export { refusalMessage };

/** Refuse unsafe, individualized legal, and clearly off-topic prompts. */
export function refusalFor(run: PulseRun): PulseRefusalReason | null {
  return refusalReasonForScope(run.scope);
}

export type FinalizeInput = {
  run: PulseRun;
  surface: "web" | "mobile";
  answer: string;
  steps: StepResult<ToolSet>[];
  usage: LanguageModelUsage | null;
  refused: PulseRefusalReason | null;
  error: string | null;
};

export type FinalizeResult = {
  assistantMessageId: string | null;
  title: string | null;
  sources: PulseSource[];
  complianceFlag: string | null;
};

/**
 * Persists the turn and records metrics once the stream has finished.
 *
 * Runs after the response body is closed, so a slow summary never delays the
 * user's answer, and a persistence failure degrades to a lost history entry
 * rather than a broken reply.
 */
export async function finalizePulseRun(
  input: FinalizeInput,
): Promise<FinalizeResult> {
  const { run, answer } = input;
  const trimmed = answer.trim();

  const cited = run.registry.usedIn(trimmed);
  const invalidRefs = run.registry.invalidRefsIn(trimmed);
  // Fall back to everything retrieved so the UI can still show provenance
  // when the model summarised without inline markers. Ordered by ref so the
  // number on a `[S3]` marker always matches the number on its card.
  const sources = [...(cited.length ? cited : run.registry.all().slice(0, 6))].sort(
    (a, b) => Number(a.ref.slice(1)) - Number(b.ref.slice(1)),
  );
  const review = input.refused ? { safe: true, matched: null } : reviewAnswer(trimmed);

  const toolsUsed = [
    ...new Set(
      input.steps.flatMap((step) =>
        (step.toolCalls ?? []).map((call) => call.toolName),
      ),
    ),
  ];

  let assistantMessageId: string | null = null;
  let title: string | null = null;

  if (trimmed) {
    try {
      title = run.conversation.isNew && !input.refused
        ? await generateTitle(run.userText, run.locale)
        : null;
      const appended = await appendTurn({
        uid: run.viewer.uid,
        conversationId: run.conversation.id,
        userText: run.userText,
        assistantText: trimmed,
        sources,
        title,
      });
      assistantMessageId = appended.assistantMessageId;
    } catch (error) {
      console.error("[pulse-ai] failed to persist turn", error);
    }

    const turnsAfter = run.conversation.messageCount + 2;
    if (turnsAfter >= aiConfig.memoryWindow) {
      await refreshMemorySummary({
        uid: run.viewer.uid,
        conversationId: run.conversation.id,
        locale: run.locale,
        previousSummary: run.conversation.memorySummary,
        recentTurns: [
          { role: "user", text: run.userText },
          { role: "assistant", text: trimmed },
        ],
      });
    }
  }

  await recordRun({
    uid: run.viewer.uid,
    locale: run.locale,
    surface: input.surface,
    model: input.refused ? "none" : aiConfig.model,
    conversationId: run.conversation.id,
    latencyMs: Date.now() - run.startedAt,
    steps: input.steps.length,
    inputTokens: input.usage?.inputTokens ?? 0,
    outputTokens: input.usage?.outputTokens ?? 0,
    toolsUsed,
    citedSourceIds: cited.map((source) => `${source.type}:${source.sourceId}`),
    citedSourceTypes: cited.map((source) => source.type),
    invalidRefs,
    answerChars: trimmed.length,
    refused: input.refused,
    complianceFlag: review.matched,
    error: input.error,
  });

  return {
    assistantMessageId,
    title,
    sources,
    complianceFlag: review.matched,
  };
}
