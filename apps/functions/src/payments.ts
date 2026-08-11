import { FieldValue, type DocumentData, type DocumentReference, type Query } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  canAccessPayments,
  businessRelationshipInputSchema,
  carrierInputSchema,
  carrierStateRateInputSchema,
  contractTermInputSchema,
  deriveRelationshipType,
  importStatementInputSchema,
  isUserAssignableOrgType,
  normalizeParticipantType,
  paymentsParticipantInputSchema,
  runOverrideCalculation,
  wouldCreateRelationshipCycle,
  type BusinessRelationship,
  type CarrierMarket,
  type CarrierStateRate,
  type ContractTerm,
  type StatementLine,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireCaller } from "./auth";
import { loadPermissionsForUid } from "./permissions";

async function requirePaymentsAdmin(
  request: { auth?: { uid: string } },
  operation: string,
) {
  const uid = await requireCaller(request, operation);
  const { permissions } = await loadPermissionsForUid(uid);
  if (!canAccessPayments(permissions)) {
    throw new HttpsError("permission-denied", "Payments access required.");
  }
  return uid;
}

function serializeParticipant(id: string, data: DocumentData) {
  const type = normalizeParticipantType(data.type) ?? "agent";
  return {
    id,
    name: String(data.name ?? ""),
    type,
    userId: data.userId ?? null,
    npn: data.npn ?? null,
    linkedOrgNodeId: data.linkedOrgNodeId ?? null,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? null,
  };
}

function serializeRelationship(id: string, data: DocumentData): BusinessRelationship {
  const rawType = String(data.relationshipType ?? "");
  const relationshipType = (
    rawType === "agency_agency" ||
    rawType === "agency_agent" ||
    rawType === "agent_agent"
      ? rawType
      : "agency_agent"
  ) as BusinessRelationship["relationshipType"];
  return {
    id,
    uplineParticipantId: String(data.uplineParticipantId ?? ""),
    downlineParticipantId: String(data.downlineParticipantId ?? ""),
    relationshipType,
    effectiveFrom: String(data.effectiveFrom ?? ""),
    effectiveTo: data.effectiveTo ?? null,
    carrierIds: Array.isArray(data.carrierIds) ? data.carrierIds.map(String) : [],
    states: Array.isArray(data.states) ? data.states.map(String) : [],
    productCodes: Array.isArray(data.productCodes)
      ? data.productCodes.map(String)
      : [],
    retentionFraction: Number(data.retentionFraction ?? 0),
    notes: data.notes ?? null,
    active: data.active !== false,
  };
}

function serializeCarrier(id: string, data: DocumentData) {
  const marketRaw = String(data.market ?? "aca");
  const market = (
    marketRaw === "medicare" || marketRaw === "life" ? marketRaw : "aca"
  ) as CarrierMarket;
  return {
    id,
    name: String(data.name ?? ""),
    code: String(data.code ?? ""),
    market,
    active: data.active !== false,
  };
}

function serializeCarrierRateUnit(
  value: unknown,
): CarrierStateRate["overrideRateUnit"] {
  if (value === "percent") return "percent";
  // Legacy pmpm (and anything else) → flat.
  return "flat";
}

function serializeCarrierStateRate(
  id: string,
  data: DocumentData,
): CarrierStateRate {
  // Legacy docs used rate / rateUnit → map onto override*.
  const hasLegacy = data.overrideRate == null && data.rate != null;
  return {
    id,
    carrierId: String(data.carrierId ?? ""),
    state: String(data.state ?? "").toUpperCase(),
    commissionRate: Number(data.commissionRate ?? 0),
    commissionRateUnit: serializeCarrierRateUnit(data.commissionRateUnit),
    overrideRate: Number(hasLegacy ? data.rate : (data.overrideRate ?? 0)),
    overrideRateUnit: serializeCarrierRateUnit(
      hasLegacy ? data.rateUnit : data.overrideRateUnit,
    ),
    active: data.active !== false,
  };
}

function serializeTerm(id: string, data: DocumentData): ContractTerm {
  return {
    id,
    participantId: String(data.participantId ?? ""),
    carrierId: data.carrierId ?? null,
    states: Array.isArray(data.states) ? data.states.map(String) : [],
    productCodes: Array.isArray(data.productCodes)
      ? data.productCodes.map(String)
      : [],
    rate: Number(data.rate ?? 0),
    rateUnit: (data.rateUnit ?? "pmpm") as ContractTerm["rateUnit"],
    effectiveFrom: String(data.effectiveFrom ?? ""),
    effectiveTo: data.effectiveTo ?? null,
    active: data.active !== false,
  };
}

function serializeLine(id: string, data: DocumentData): StatementLine {
  return {
    id,
    statementId: String(data.statementId ?? ""),
    writingProducerParticipantId: data.writingProducerParticipantId ?? null,
    writingProducerNpn: data.writingProducerNpn ?? null,
    writingProducerName: data.writingProducerName ?? null,
    carrierId: data.carrierId ?? null,
    state: data.state ?? null,
    productCode: data.productCode ?? null,
    memberMonths: Number(data.memberMonths ?? 0),
    receivedOverrideAmount: Number(data.receivedOverrideAmount ?? 0),
    carrierRate:
      data.carrierRate == null ? null : Number(data.carrierRate),
    productionDate: data.productionDate ?? null,
    externalRef: data.externalRef ?? null,
  };
}

// --- Carriers ---

export const listCarriers = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCarriers");
  const snap = await db.collection("carriers").orderBy("name").get();
  return {
    carriers: snap.docs.map((d) => serializeCarrier(d.id, d.data())),
  };
});

export const upsertCarrier = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertCarrier");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = carrierInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id ? db.doc(`carriers/${id}`) : db.collection("carriers").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { carrier: serializeCarrier(ref.id, snap.data() ?? {}) };
});

export const listCarrierStateRates = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCarrierStateRates");
  const carrierId =
    typeof request.data?.carrierId === "string"
      ? request.data.carrierId.trim()
      : "";
  if (!carrierId) {
    throw new HttpsError("invalid-argument", "carrierId required.");
  }
  const snap = await db
    .collection("carrierStateRates")
    .where("carrierId", "==", carrierId)
    .get();
  return {
    rates: snap.docs
      .map((d) => serializeCarrierStateRate(d.id, d.data()))
      .filter((r) => r.active),
  };
});

export const upsertCarrierStateRate = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertCarrierStateRate");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = carrierStateRateInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const existingSnap = await db
    .collection("carrierStateRates")
    .where("carrierId", "==", parsed.data.carrierId)
    .where("state", "==", parsed.data.state)
    .get();
  const duplicate = existingSnap.docs.find((d) => {
    if (id && d.id === id) return false;
    return d.data()?.active !== false;
  });
  if (duplicate) {
    throw new HttpsError(
      "invalid-argument",
      `An active rate already exists for state ${parsed.data.state}.`,
    );
  }

  const ref = id
    ? db.doc(`carrierStateRates/${id}`)
    : db.collection("carrierStateRates").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { rate: serializeCarrierStateRate(ref.id, snap.data() ?? {}) };
});

export const deleteCarrier = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "deleteCarrier");
  const id =
    typeof request.data?.id === "string" ? request.data.id.trim() : "";
  if (!id) {
    throw new HttpsError("invalid-argument", "id required.");
  }
  const ref = db.doc(`carriers/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Carrier not found.");
  }
  await ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const ratesSnap = await db
    .collection("carrierStateRates")
    .where("carrierId", "==", id)
    .get();
  const batch = db.batch();
  let ops = 0;
  for (const doc of ratesSnap.docs) {
    if (doc.data()?.active === false) continue;
    batch.set(
      doc.ref,
      {
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    ops += 1;
  }
  if (ops > 0) {
    await batch.commit();
  }

  return { ok: true as const };
});

export const deleteCarrierStateRate = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "deleteCarrierStateRate");
  const id =
    typeof request.data?.id === "string" ? request.data.id.trim() : "";
  if (!id) {
    throw new HttpsError("invalid-argument", "id required.");
  }
  const ref = db.doc(`carrierStateRates/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "State rate not found.");
  }
  await ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true as const };
});

// --- Participants ---

export const listPaymentsParticipants = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listPaymentsParticipants");
  const includeInactive = Boolean(request.data?.includeInactive);
  const snap = await db.collection("paymentsParticipants").orderBy("name").get();
  const participants = snap.docs
    .filter((d) => normalizeParticipantType(d.data()?.type) != null)
    .map((d) => serializeParticipant(d.id, d.data()))
    .filter((p) => includeInactive || p.active);
  return { participants };
});

export const upsertPaymentsParticipant = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertPaymentsParticipant");
  const idRaw =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;

  const raw = { ...(request.data ?? {}) } as Record<string, unknown>;
  const typeHint = normalizeParticipantType(raw.type);
  if (!String(raw.name ?? "").trim()) {
    raw.name = typeHint === "agency" ? "Agency" : "Agent";
  }

  const parsed = paymentsParticipantInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const input = { ...parsed.data };
  const type = normalizeParticipantType(input.type);
  if (!type) {
    throw new HttpsError("invalid-argument", "type must be agency or agent.");
  }
  input.type = type;

  let resolvedId = idRaw;

  if (type === "agency") {
    const linkedOrgNodeId =
      typeof input.linkedOrgNodeId === "string"
        ? input.linkedOrgNodeId.trim()
        : "";
    if (!resolvedId && !linkedOrgNodeId) {
      throw new HttpsError(
        "invalid-argument",
        "Agency participants require linkedOrgNodeId.",
      );
    }
    if (linkedOrgNodeId) {
      const orgSnap = await db.doc(`orgNodes/${linkedOrgNodeId}`).get();
      if (!orgSnap.exists) {
        throw new HttpsError("not-found", "Org node not found.");
      }
      const orgData = orgSnap.data() ?? {};
      if (!isUserAssignableOrgType(orgData.type)) {
        throw new HttpsError(
          "invalid-argument",
          "linkedOrgNodeId must be an assignable agency/organization.",
        );
      }
      if (!input.name?.trim() || input.name === "Agency") {
        input.name = String(orgData.name ?? "Agency");
      }
      if (input.npn == null && typeof orgData.npn === "string") {
        input.npn = orgData.npn.trim() || null;
      }
      input.userId = null;
      input.linkedOrgNodeId = linkedOrgNodeId;
      if (raw.active === undefined) {
        input.active = orgData.active !== false;
      }

      const existing = await db
        .collection("paymentsParticipants")
        .where("linkedOrgNodeId", "==", linkedOrgNodeId)
        .limit(1)
        .get();
      if (!existing.empty) {
        resolvedId = existing.docs[0].id;
      }
    }
  } else {
    const userId =
      typeof input.userId === "string" ? input.userId.trim() : "";
    if (!resolvedId && !userId) {
      throw new HttpsError(
        "invalid-argument",
        "Agent participants require userId.",
      );
    }
    if (userId) {
      const userSnap = await db.doc(`users/${userId}`).get();
      if (!userSnap.exists) {
        throw new HttpsError("not-found", "User not found.");
      }
      const userData = userSnap.data() ?? {};
      if (!input.name?.trim() || input.name === "Agent") {
        const display =
          typeof userData.displayName === "string"
            ? userData.displayName.trim()
            : "";
        const email =
          typeof userData.email === "string" ? userData.email.trim() : "";
        input.name = display || email || "Agent";
      }
      if (input.npn == null && typeof userData.npn === "string") {
        input.npn = userData.npn.trim() || null;
      }
      input.userId = userId;
      if (
        (input.linkedOrgNodeId == null || input.linkedOrgNodeId === "") &&
        typeof userData.orgNodeId === "string"
      ) {
        input.linkedOrgNodeId = userData.orgNodeId.trim() || null;
      }

      const existing = await db
        .collection("paymentsParticipants")
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (!existing.empty) {
        resolvedId = existing.docs[0].id;
      }
    }
  }

  if (!input.name?.trim()) {
    throw new HttpsError("invalid-argument", "name required.");
  }

  const ref = resolvedId
    ? db.doc(`paymentsParticipants/${resolvedId}`)
    : db.collection("paymentsParticipants").doc();
  await ref.set(
    {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
      ...(resolvedId ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { participant: serializeParticipant(ref.id, snap.data() ?? {}) };
});

// --- Relationships ---

export const listBusinessRelationships = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listBusinessRelationships");
  const snap = await db.collection("businessRelationships").get();
  return {
    relationships: snap.docs.map((d) => serializeRelationship(d.id, d.data())),
  };
});

export const upsertBusinessRelationship = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertBusinessRelationship");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = businessRelationshipInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  if (parsed.data.uplineParticipantId === parsed.data.downlineParticipantId) {
    throw new HttpsError(
      "invalid-argument",
      "Upline and downline must differ.",
    );
  }

  const [uplineSnap, downlineSnap, allRelsSnap] = await Promise.all([
    db.doc(`paymentsParticipants/${parsed.data.uplineParticipantId}`).get(),
    db.doc(`paymentsParticipants/${parsed.data.downlineParticipantId}`).get(),
    db.collection("businessRelationships").get(),
  ]);
  if (!uplineSnap.exists || !downlineSnap.exists) {
    throw new HttpsError("invalid-argument", "Participants not found.");
  }
  const uplineType = normalizeParticipantType(uplineSnap.data()?.type);
  const downlineType = normalizeParticipantType(downlineSnap.data()?.type);
  if (!uplineType || !downlineType) {
    throw new HttpsError(
      "invalid-argument",
      "Participants must be agency or agent.",
    );
  }
  const relationshipType = deriveRelationshipType(uplineType, downlineType);
  if (!relationshipType) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid upline/downline pair (agent cannot be upline of an agency).",
    );
  }

  const existingRels = allRelsSnap.docs
    .filter((d) => d.id !== id)
    .map((d) => serializeRelationship(d.id, d.data()));
  if (
    wouldCreateRelationshipCycle(
      parsed.data.uplineParticipantId,
      parsed.data.downlineParticipantId,
      existingRels,
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Relationship would create a cycle in the upline chain.",
    );
  }

  const ref = id
    ? db.doc(`businessRelationships/${id}`)
    : db.collection("businessRelationships").doc();
  await ref.set(
    {
      ...parsed.data,
      relationshipType,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { relationship: serializeRelationship(ref.id, snap.data() ?? {}) };
});

// --- Contract terms ---

export const listContractTerms = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listContractTerms");
  const participantId =
    typeof request.data?.participantId === "string"
      ? request.data.participantId
      : null;
  let query: Query = db.collection("contractTerms");
  if (participantId) {
    query = query.where("participantId", "==", participantId);
  }
  const snap = await query.get();
  return { terms: snap.docs.map((d) => serializeTerm(d.id, d.data())) };
});

export const upsertContractTerm = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertContractTerm");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = contractTermInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id
    ? db.doc(`contractTerms/${id}`)
    : db.collection("contractTerms").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { term: serializeTerm(ref.id, snap.data() ?? {}) };
});

// --- Statements ---

export const listStatements = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listStatements");
  const snap = await db
    .collection("statements")
    .orderBy("importedAt", "desc")
    .limit(100)
    .get();
  return {
    statements: snap.docs.map((d) => {
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
    }),
  };
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
  const participantsSnap = await db.collection("paymentsParticipants").get();
  const byNpn = new Map<string, string>();
  for (const d of participantsSnap.docs) {
    const npn = d.data().npn;
    if (typeof npn === "string" && npn.trim()) {
      byNpn.set(npn.trim(), d.id);
    }
  }

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

// --- Override runs ---

export const listOverrideRuns = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listOverrideRuns");
  const statementId =
    typeof request.data?.statementId === "string"
      ? request.data.statementId
      : null;
  let query: Query = db
    .collection("overrideRuns")
    .orderBy("startedAt", "desc")
    .limit(50);
  if (statementId) {
    query = db
      .collection("overrideRuns")
      .where("statementId", "==", statementId)
      .orderBy("startedAt", "desc")
      .limit(50);
  }
  const snap = await query.get();
  return {
    runs: snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        statementId: data.statementId ?? "",
        status: data.status ?? "pending",
        startedAt:
          data.startedAt?.toDate?.()?.toISOString?.() ?? data.startedAt ?? "",
        completedAt:
          data.completedAt?.toDate?.()?.toISOString?.() ??
          data.completedAt ??
          null,
        error: data.error ?? null,
        allocationCount: Number(data.allocationCount ?? 0),
        expectedTotal: Number(data.expectedTotal ?? 0),
        receivedTotal: Number(data.receivedTotal ?? 0),
        differenceTotal: Number(data.differenceTotal ?? 0),
        createdBy: data.createdBy ?? "",
      };
    }),
  };
});

export const getOverrideRun = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "getOverrideRun");
  const runId = String(request.data?.runId ?? "").trim();
  if (!runId) throw new HttpsError("invalid-argument", "runId required.");
  const runSnap = await db.doc(`overrideRuns/${runId}`).get();
  if (!runSnap.exists) {
    throw new HttpsError("not-found", "Run not found.");
  }
  const [allocSnap, reconSnap] = await Promise.all([
    db.collection("overrideAllocations").where("runId", "==", runId).get(),
    db.collection("reconciliationItems").where("runId", "==", runId).get(),
  ]);
  const data = runSnap.data() ?? {};
  return {
    run: {
      id: runSnap.id,
      statementId: data.statementId ?? "",
      status: data.status ?? "pending",
      startedAt:
        data.startedAt?.toDate?.()?.toISOString?.() ?? data.startedAt ?? "",
      completedAt:
        data.completedAt?.toDate?.()?.toISOString?.() ??
        data.completedAt ??
        null,
      error: data.error ?? null,
      allocationCount: Number(data.allocationCount ?? 0),
      expectedTotal: Number(data.expectedTotal ?? 0),
      receivedTotal: Number(data.receivedTotal ?? 0),
      differenceTotal: Number(data.differenceTotal ?? 0),
      createdBy: data.createdBy ?? "",
    },
    allocations: allocSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    reconciliation: reconSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
});

export const runOverrideCalculationFn = onCall(callableOpts, async (request) => {
  const uid = await requirePaymentsAdmin(request, "runOverrideCalculation");
  const statementId = String(request.data?.statementId ?? "").trim();
  if (!statementId) {
    throw new HttpsError("invalid-argument", "statementId required.");
  }

  const runRef = db.collection("overrideRuns").doc();
  await runRef.set({
    statementId,
    status: "running",
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    error: null,
    allocationCount: 0,
    expectedTotal: 0,
    receivedTotal: 0,
    differenceTotal: 0,
    createdBy: uid,
  });

  try {
    const [linesSnap, relSnap, termsSnap, ratesSnap] = await Promise.all([
      db
        .collection("statementLines")
        .where("statementId", "==", statementId)
        .get(),
      db.collection("businessRelationships").get(),
      db.collection("contractTerms").get(),
      db.collection("carrierStateRates").get(),
    ]);

    const lines = linesSnap.docs.map((d) => serializeLine(d.id, d.data()));
    const relationships = relSnap.docs.map((d) =>
      serializeRelationship(d.id, d.data()),
    );
    const terms = termsSnap.docs.map((d) => serializeTerm(d.id, d.data()));
    const carrierStateRates = ratesSnap.docs.map((d) =>
      serializeCarrierStateRate(d.id, d.data()),
    );

    const result = runOverrideCalculation({
      lines,
      relationships,
      terms,
      carrierStateRates,
    });

    // Firestore batches max 500 ops; chunk writes.
    const writes: Array<{
      ref: DocumentReference;
      data: Record<string, unknown>;
    }> = [];

    for (const alloc of result.allocations) {
      writes.push({
        ref: db.collection("overrideAllocations").doc(),
        data: { ...alloc, runId: runRef.id },
      });
    }
    for (const item of result.reconciliation) {
      writes.push({
        ref: db.collection("reconciliationItems").doc(),
        data: { ...item, runId: runRef.id },
      });
    }

    for (let i = 0; i < writes.length; i += 450) {
      const chunk = writes.slice(i, i + 450);
      const batch = db.batch();
      for (const w of chunk) {
        batch.set(w.ref, w.data);
      }
      await batch.commit();
    }

    await runRef.update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      allocationCount: result.allocations.length,
      expectedTotal: result.expectedTotal,
      receivedTotal: result.receivedTotal,
      differenceTotal: result.differenceTotal,
    });
    await db.doc(`statements/${statementId}`).update({
      status: "reconciled",
    });

    return {
      runId: runRef.id,
      expectedTotal: result.expectedTotal,
      receivedTotal: result.receivedTotal,
      differenceTotal: result.differenceTotal,
      allocationCount: result.allocations.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation failed.";
    await runRef.update({
      status: "failed",
      error: message,
      completedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpsError("internal", message);
  }
});
