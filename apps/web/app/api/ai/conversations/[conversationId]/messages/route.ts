import { authenticate, PulseHttpError } from "@/lib/ai/auth";
import {
  CONVERSATIONS_SUBCOLLECTION,
  MESSAGES_SUBCOLLECTION,
} from "@/lib/ai/config";
import { isValidConversationId } from "@/lib/ai/conversations";
import { adminDb } from "@/lib/ai/firebase-admin";
import type { PulseSource } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  let viewer;
  try {
    viewer = await authenticate(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }

  const { conversationId } = await params;
  if (!isValidConversationId(conversationId)) {
    return Response.json(
      { error: { code: "bad-request", message: "Unknown conversation." } },
      { status: 400 },
    );
  }

  const snapshot = await adminDb()
    .collection("users")
    .doc(viewer.uid)
    .collection(CONVERSATIONS_SUBCOLLECTION)
    .doc(conversationId)
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  return Response.json({
    messages: snapshot.docs.map((doc) => ({
      id: doc.id,
      role: doc.get("role") === "user" ? "user" : "assistant",
      text: String(doc.get("text") ?? ""),
      sources: (doc.get("sources") as PulseSource[]) ?? [],
      feedback: (doc.get("feedback") as "up" | "down" | null) ?? null,
      createdAt:
        doc.get("createdAt") && typeof doc.get("createdAt") === "object"
          ? (doc.get("createdAt") as { toDate: () => Date }).toDate().toISOString()
          : null,
    })),
  });
}
