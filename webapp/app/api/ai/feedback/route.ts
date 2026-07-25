import { authenticate, PulseHttpError } from "@/lib/ai/auth";
import { isValidConversationId, setMessageFeedback } from "@/lib/ai/conversations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let viewer;
  try {
    viewer = await authenticate(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }

  let body: {
    conversationId?: unknown;
    messageId?: unknown;
    feedback?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "bad-request", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const { conversationId, messageId, feedback } = body;
  const valid =
    isValidConversationId(conversationId) &&
    isValidConversationId(messageId) &&
    (feedback === "up" || feedback === "down" || feedback === null);

  if (!valid) {
    return Response.json(
      { error: { code: "bad-request", message: "Invalid feedback payload." } },
      { status: 400 },
    );
  }

  await setMessageFeedback({
    uid: viewer.uid,
    conversationId: conversationId as string,
    messageId: messageId as string,
    feedback: feedback as "up" | "down" | null,
    reason: typeof body.reason === "string" ? body.reason : null,
  });

  return Response.json({ saved: true });
}
