import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { importStatementInputSchema } from "@pulse/shared";
import { db, callableOpts } from "./init";
import {
  requirePaymentsAdmin,
  serializeLine,
  parseListPage,
  lookupParticipantIdsByNpn,
} from "./payments-shared";

// --- Statements ---

export const listStatements = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listStatements");
  const page = parseListPage(request.data, { limit: 50, maxLimit: 200 });
  let query = db.collection("statements").orderBy("importedAt", "desc");
  if (page.cursor) {
    const cursorSnap = await db.doc(`statements/${page.cursor}`).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }
  const snap = await query.limit(page.limit + 1).get();
  const docs = snap.docs.slice(0, page.limit);
  const statements = docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      source: data.source ?? "manual",
      carrierId: data.carrierId ?? null,
      fmoParticipantId: data.fmoParticipantId ?? null,
      periodStart: data.periodStart ?? "",
      periodEnd: data.periodEnd ?? "",
      label: data.label ?? "",
      importedAt:
        data.importedAt?.toDate?.()?.toISOString?.() ??
        data.importedAt ??
        "",
      importedBy: data.importedBy ?? "",
      lineCount: Number(data.lineCount ?? 0),
      status: data.status ?? "imported",
    };
  });
  const nextCursor =
    snap.docs.length > page.limit ? docs[docs.length - 1]?.id ?? null : null;
  return { statements, nextCursor };
});

export const getStatement = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "getStatement");
  const statementId = String(request.data?.statementId ?? "").trim();
  if (!statementId) {
    throw new HttpsError("invalid-argument", "statementId required.");
  }
  const stmtSnap = await db.doc(`statements/${statementId}`).get();
  if (!stmtSnap.exists) {
    throw new HttpsError("not-found", "Statement not found.");
  }
  const linesSnap = await db
    .collection("statementLines")
    .where("statementId", "==", statementId)
    .get();
  const data = stmtSnap.data() ?? {};
  return {
    statement: {
      id: stmtSnap.id,
      source: data.source ?? "manual",
      carrierId: data.carrierId ?? null,
      fmoParticipantId: data.fmoParticipantId ?? null,
      periodStart: data.periodStart ?? "",
      periodEnd: data.periodEnd ?? "",
      label: data.label ?? "",
      importedAt:
        data.importedAt?.toDate?.()?.toISOString?.() ?? data.importedAt ?? "",
      importedBy: data.importedBy ?? "",
      lineCount: Number(data.lineCount ?? 0),
      status: data.status ?? "imported",
    },
    lines: linesSnap.docs.map((d) => serializeLine(d.id, d.data())),
  };
});

export const importStatement = onCall(callableOpts, async (request) => {
  const uid = await requirePaymentsAdmin(request, "importStatement");
  const parsed = importStatementInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  // Resolve writing producers by NPN when participant id missing.
  const npns = parsed.data.lines
    .map((line) => line.writingProducerNpn)
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
  const byNpn = await lookupParticipantIdsByNpn(npns);

  const stmtRef = db.collection("statements").doc();
  const batch = db.batch();
  const lineIds: string[] = [];

  for (const line of parsed.data.lines) {
    let producerId = line.writingProducerParticipantId;
    if (!producerId && line.writingProducerNpn) {
      producerId = byNpn.get(line.writingProducerNpn.trim()) ?? null;
    }
    const lineRef = db.collection("statementLines").doc();
    lineIds.push(lineRef.id);
    batch.set(lineRef, {
      statementId: stmtRef.id,
      writingProducerParticipantId: producerId,
      writingProducerNpn: line.writingProducerNpn,
      writingProducerName: line.writingProducerName,
      carrierId: line.carrierId ?? parsed.data.carrierId,
      state: line.state,
      productCode: line.productCode,
      memberMonths: line.memberMonths,
      receivedOverrideAmount: line.receivedOverrideAmount,
      carrierRate: line.carrierRate,
      productionDate: line.productionDate,
      externalRef: line.externalRef,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  batch.set(stmtRef, {
    source: parsed.data.source,
    carrierId: parsed.data.carrierId,
    fmoParticipantId: parsed.data.fmoParticipantId,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    label: parsed.data.label,
    importedAt: FieldValue.serverTimestamp(),
    importedBy: uid,
    lineCount: parsed.data.lines.length,
    status: "imported",
  });

  await batch.commit();
  return { statementId: stmtRef.id, lineCount: lineIds.length };
});
