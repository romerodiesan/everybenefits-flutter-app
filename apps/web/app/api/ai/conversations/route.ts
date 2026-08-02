import { authenticate, PulseHttpError } from "@/lib/ai/auth";
import { CONVERSATIONS_SUBCOLLECTION } from "@/lib/ai/config";
import { deleteConversation, isValidConversationId } from "@/lib/ai/conversations";
import { adminDb } from "@/lib/ai/firebase-admin";

export const runtime = "nodejs";

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(request: Request) {
  let viewer;
  try {
    viewer = await authenticate(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }

  const snapshot = await adminDb()
    .collection("users")
    .doc(viewer.uid)
    .collection(CONVERSATIONS_SUBCOLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  return Response.json({
    conversations: snapshot.docs.map((doc) => ({
      id: doc.id,
      title: (doc.get("title") as string) ?? null,
      locale: (doc.get("locale") as string) ?? "en",
      messageCount: Number(doc.get("messageCount") ?? 0),
      lastMessagePreview: (doc.get("lastMessagePreview") as string) ?? "",
      createdAt: timestampToIso(doc.get("createdAt")),
      updatedAt: timestampToIso(doc.get("updatedAt")),
    })),
  });
}

export async function DELETE(request: Request) {
  let viewer;
  try {
    viewer = await authenticate(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }

  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (!isValidConversationId(conversationId)) {
    return Response.json(
      { error: { code: "bad-request", message: "Unknown conversation." } },
      { status: 400 },
    );
  }

  await deleteConversation(viewer.uid, conversationId);
  return Response.json({ deleted: true });
}
