import type {
  LanguageModelUsage,
  ModelMessage,
  StepResult,
  ToolSet,
} from "ai";
import { aiConfig } from "@/lib/ai/config";
import { createPulseAgent, preparePulseRun } from "@/lib/ai/agent";
import { PulseHttpError } from "@/lib/ai/auth";
import { finalizePulseRun, refusalFor, refusalMessage } from "@/lib/ai/run";
import type { PulseMobileEvent } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Flutter-facing endpoint.
 *
 * Emits a small, explicit SSE vocabulary instead of the AI SDK's UI message
 * protocol so the mobile client does not have to reimplement part
 * reconciliation. See `PulseMobileEvent` for the contract.
 */
function historyFrom(value: unknown): ModelMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ModelMessage[] = [];
  for (const entry of value.slice(-aiConfig.maxIncomingMessages)) {
    if (typeof entry !== "object" || entry === null) continue;
    const role = (entry as { role?: unknown }).role;
    const text = (entry as { text?: unknown }).text;
    if (typeof text !== "string" || !text.trim()) continue;
    if (role !== "user" && role !== "assistant") continue;
    messages.push({ role, content: text.slice(0, aiConfig.maxPromptChars) });
  }
  return messages;
}

export async function POST(request: Request) {
  let body: {
    message?: unknown;
    history?: unknown;
    conversationId?: unknown;
    locale?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "bad-request", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const userText = typeof body.message === "string" ? body.message : "";
  const history = historyFrom(body.history);

  let run;
  try {
    run = await preparePulseRun({
      request,
      locale: body.locale,
      conversationId: body.conversationId,
      userText,
      history: [...history, { role: "user", content: userText.trim() }],
    });
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    console.error("[pulse-ai] stream preparation failed", error);
    return Response.json(
      { error: { code: "internal", message: "Pulse AI is unavailable." } },
      { status: 500 },
    );
  }

  const refused = refusalFor(run);
  const encoder = new TextEncoder();

  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: PulseMobileEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({
        type: "conversation",
        conversationId: run.conversation.id,
        title: run.conversation.title,
      });

      if (refused) {
        const text = refusalMessage(refused, run.locale);
        send({ type: "text", delta: text });
        send({ type: "notice", notice: { kind: "refusal", reason: refused } });
        const outcome = await finalizePulseRun({
          run,
          surface: "mobile",
          answer: text,
          steps: [],
          usage: null,
          refused,
          error: null,
        });
        send({
          type: "done",
          messageId: outcome.assistantMessageId ?? "",
          title: outcome.title,
        });
        closed = true;
        controller.close();
        return;
      }

      if (run.scope.legalAdvice) {
        send({ type: "notice", notice: { kind: "compliance" } });
      }

      const agent = createPulseAgent({
        locale: run.locale,
        viewer: run.viewer,
        memorySummary: run.conversation.memorySummary,
        registry: run.registry,
        emitActivity: () => {
          // Activity stays server-side; the mobile client only shows the answer.
        },
      });

      let answer = "";
      let steps: StepResult<ToolSet>[] = [];
      let usage: LanguageModelUsage | null = null;
      let failure: string | null = null;

      try {
        const result = await agent.stream({
          messages: run.messages,
          abortSignal: request.signal,
          timeout: aiConfig.requestTimeoutMs,
        });

        for await (const delta of result.textStream) {
          answer += delta;
          send({ type: "text", delta });
        }
        steps = (await result.steps) as StepResult<ToolSet>[];
        usage = await result.usage;
      } catch (error) {
        failure = error instanceof Error ? error.message : "unknown";
        console.error("[pulse-ai] mobile stream failed", error);
        send({
          type: "error",
          code: "stream-failed",
          message: "Pulse AI hit an error. Try again.",
        });
      }

      const outcome = await finalizePulseRun({
        run,
        surface: "mobile",
        answer,
        steps,
        usage,
        refused: null,
        error: failure,
      });

      if (outcome.sources.length) {
        send({ type: "sources", sources: outcome.sources });
      }
      if (outcome.complianceFlag) {
        send({ type: "notice", notice: { kind: "compliance" } });
      }
      send({
        type: "done",
        messageId: outcome.assistantMessageId ?? "",
        title: outcome.title,
      });
      closed = true;
      controller.close();
    },
  });

  return new Response(body$, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
