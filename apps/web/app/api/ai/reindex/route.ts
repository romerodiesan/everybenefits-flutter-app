import { authenticateAdminTask, PulseHttpError } from "@/lib/ai/auth";
import { reindexKnowledge } from "@/lib/ai/ingest";
import type { KnowledgeGroup } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
/** Full rebuilds embed every changed chunk, so give them room. */
export const maxDuration = 800;

const ALL_GROUPS: KnowledgeGroup[] = ["forum", "academy", "official"];

function parseGroups(value: unknown): KnowledgeGroup[] {
  if (!Array.isArray(value)) return ALL_GROUPS;
  const groups = value.filter((entry): entry is KnowledgeGroup =>
    ALL_GROUPS.includes(entry as KnowledgeGroup),
  );
  return groups.length ? groups : ALL_GROUPS;
}

/** Vercel Cron issues GET requests; it rebuilds everything. */
export async function GET(request: Request) {
  try {
    await authenticateAdminTask(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }
  const report = await reindexKnowledge(ALL_GROUPS);
  return Response.json({ ok: true, report });
}

/**
 * Rebuilds the retrieval index. Callable by an admin user or by a scheduled
 * job holding `PULSE_AI_ADMIN_TASK_KEY`.
 */
export async function POST(request: Request) {
  try {
    await authenticateAdminTask(request);
  } catch (error) {
    if (error instanceof PulseHttpError) return error.toResponse();
    throw error;
  }

  let groups = ALL_GROUPS;
  try {
    const body = await request.json();
    groups = parseGroups((body as { groups?: unknown }).groups);
  } catch {
    // No body means "rebuild everything".
  }

  try {
    const report = await reindexKnowledge(groups);
    return Response.json({ ok: true, report });
  } catch (error) {
    console.error("[pulse-ai] reindex failed", error);
    return Response.json(
      { error: { code: "reindex-failed", message: "Reindex failed." } },
      { status: 500 },
    );
  }
}
