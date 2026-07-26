import type {
  LanguageModelUsage,
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

export async function POST(request: Request) {
  let body: {
    message?: unknown;
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

  let run;
  try {
    run = await preparePulseRun({
      request,
      locale: body.locale,
      conversationId: body.conversationId,
      userText,
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
