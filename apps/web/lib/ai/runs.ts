import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { AppLocale } from "@pulse/i18n";
import { RUNS_COLLECTION } from "./config";
import { adminDb } from "./firebase-admin";
import type { PulseRefusalReason, PulseSourceType } from "./types";

export type RunRecord = {
  uid: string;
  locale: AppLocale;
  surface: "web" | "mobile";
  model: string;
  conversationId: string;
  latencyMs: number;
  steps: number;
  inputTokens: number;
  outputTokens: number;
  toolsUsed: string[];
  citedSourceIds: string[];
  citedSourceTypes: PulseSourceType[];
  invalidRefs: string[];
  answerChars: number;
  refused: PulseRefusalReason | null;
  complianceFlag: string | null;
  error: string | null;
};

/** Pseudonymises the uid so operational metrics carry no account identifier. */
function pseudonym(uid: string): string {
  return createHash("sha256")
    .update(`pulse-ai:${uid}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Records what a run cost and whether it stayed grounded. Deliberately stores
 * no prompt or answer text — only ids, counts and flags — so the metrics
 * collection never becomes a second copy of private conversations.
 */
export async function recordRun(record: RunRecord): Promise<void> {
  try {
    await adminDb()
      .collection(RUNS_COLLECTION)
      .add({
        user: pseudonym(record.uid),
        locale: record.locale,
        surface: record.surface,
        model: record.model,
        conversationId: record.conversationId,
        latencyMs: record.latencyMs,
        steps: record.steps,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        toolsUsed: record.toolsUsed,
        citedSourceIds: record.citedSourceIds.slice(0, 20),
        citedSourceTypes: [...new Set(record.citedSourceTypes)],
        invalidRefs: record.invalidRefs.slice(0, 10),
        answerChars: record.answerChars,
        refused: record.refused,
        complianceFlag: record.complianceFlag,
        error: record.error,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.warn("[pulse-ai] failed to record run", error);
  }
}
