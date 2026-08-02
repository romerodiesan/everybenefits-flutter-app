import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type LanguageModelUsage,
  type StepResult,
  type ToolSet,
  type UIMessage,
} from "ai";
import { aiConfig } from "@/lib/ai/config";
import { createPulseAgent, preparePulseRun } from "@/lib/ai/agent";
import { PulseHttpError } from "@/lib/ai/auth";
import { finalizePulseRun, refusalFor, refusalMessage } from "@/lib/ai/run";
import type { PulseUIMessage } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Only text parts are trusted from the client; data parts are server-issued. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  let body: { messages?: UIMessage[]; conversationId?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "bad-request", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const uiMessages = incoming.slice(-aiConfig.maxIncomingMessages);
  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return Response.json(
      { error: { code: "empty-message", message: "Write a question first." } },
      { status: 400 },
    );
  }

  let run;
  try {
    run = await preparePulseRun({
      request,
      locale: body.locale,
      conversationId: body.conversationId,
      userText: textOf(lastUser),
    });
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    console.error("[pulse-ai] chat preparation failed", error);
    return Response.json(
      { error: { code: "internal", message: "Pulse AI is unavailable." } },
      { status: 500 },
    );
  }

  const refused = refusalFor(run);

  const stream = createUIMessageStream<PulseUIMessage>({
    execute: async ({ writer }) => {
      writer.write({
        type: "data-pulse-conversation",
        data: {
          conversationId: run.conversation.id,
          title: run.conversation.title,
        },
        transient: true,
      });

      if (refused) {
        const text = refusalMessage(refused, run.locale);
        writer.write({ type: "text-start", id: "refusal" });
        writer.write({ type: "text-delta", id: "refusal", delta: text });
        writer.write({ type: "text-end", id: "refusal" });
        writer.write({
          type: "data-pulse-notice",
          data: { kind: "refusal", reason: refused },
        });
        const outcome = await finalizePulseRun({
          run,
          surface: "web",
          answer: text,
          steps: [],
          usage: null,
          refused,
          error: null,
        });
        if (outcome.assistantMessageId) {
          writer.write({
            type: "data-pulse-saved",
            data: { messageId: outcome.assistantMessageId },
          });
        }
        return;
      }

      if (run.scope.legalAdvice) {
        writer.write({ type: "data-pulse-notice", data: { kind: "compliance" } });
      }

      const agent = createPulseAgent({
        locale: run.locale,
        viewer: run.viewer,
        memorySummary: run.conversation.memorySummary,
        registry: run.registry,
        emitActivity: () => {
          // Activity stays server-side; the UI only shows the final answer.
        },
      });

      let steps: StepResult<ToolSet>[] = [];
      let usage: LanguageModelUsage | null = null;
      let answer = "";
      let failure: string | null = null;

      try {
        const result = await agent.stream({
          messages: run.messages,
          abortSignal: request.signal,
          timeout: aiConfig.requestTimeoutMs,
        });

        writer.merge(toUIMessageStream({ stream: result.stream }));
        // Resolves once the merged stream has been fully consumed.
        answer = await result.text;
        steps = (await result.steps) as StepResult<ToolSet>[];
        usage = await result.usage;
      } catch (error) {
        failure = error instanceof Error ? error.message : "unknown";
        console.error("[pulse-ai] agent stream failed", error);
      }

      const outcome = await finalizePulseRun({
        run,
        surface: "web",
        answer,
        steps,
        usage,
        refused: null,
        error: failure,
      });

      if (outcome.assistantMessageId) {
        writer.write({
          type: "data-pulse-saved",
          data: { messageId: outcome.assistantMessageId },
        });
      }
      if (outcome.sources.length) {
        writer.write({
          type: "data-pulse-sources",
          data: { sources: outcome.sources },
        });
      }
      if (outcome.complianceFlag) {
        writer.write({ type: "data-pulse-notice", data: { kind: "compliance" } });
      }
      if (outcome.title) {
        writer.write({
          type: "data-pulse-conversation",
          data: { conversationId: run.conversation.id, title: outcome.title },
          transient: true,
        });
      }
    },
    onError: (error) => {
      console.error("[pulse-ai] ui stream error", error);
      return "Pulse AI hit an error. Try again.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
