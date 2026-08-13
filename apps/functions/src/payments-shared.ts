import { type DocumentData, type Query } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  canAccessPayments,
  normalizeParticipantType,
  type BusinessRelationship,
  type CarrierMarket,
  type CarrierStateRate,
  type ContractTerm,
  type StatementLine,
} from "@pulse/shared";
import { requireCaller } from "./auth";
import { loadPermissionsForUid } from "./permissions";

export async function requirePaymentsAdmin(
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

export function serializeParticipant(id: string, data: DocumentData) {
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

export function serializeRelationship(
  id: string,
  data: DocumentData,
): BusinessRelationship {
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
    source: data.source === "org_hierarchy" ? "org_hierarchy" : "manual",
    active: data.active !== false,
  };
}

export function serializeCarrier(id: string, data: DocumentData) {
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

export function serializeCarrierRateUnit(
  value: unknown,
): CarrierStateRate["overrideRateUnit"] {
  if (value === "percent") return "percent";
  if (value === "pmpm") return "pmpm";
  return "flat";
}

export function serializeCarrierStateRate(
  id: string,
  data: DocumentData,
): CarrierStateRate {
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

export function serializeTerm(id: string, data: DocumentData): ContractTerm {
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
    sourcePlanId: data.sourcePlanId ?? null,
    sourceAssignmentId: data.sourceAssignmentId ?? null,
  };
}

export function serializeLine(id: string, data: DocumentData): StatementLine {
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

/** Clamp list page size for hot payments list callables. */
export function parseListPage(
  data: unknown,
  defaults: { limit?: number; maxLimit?: number } = {},
): { limit: number; cursor: string | null; includeInactive: boolean } {
  const raw = (data ?? {}) as Record<string, unknown>;
  const maxLimit = defaults.maxLimit ?? 200;
  const defaultLimit = defaults.limit ?? 100;
  const limitRaw = Number(raw.limit ?? defaultLimit);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), maxLimit)
    : defaultLimit;
  const cursor =
    typeof raw.cursor === "string" && raw.cursor.trim()
      ? raw.cursor.trim()
      : null;
  return {
    limit,
    cursor,
    includeInactive: Boolean(raw.includeInactive),
  };
}

export async function paginateCollection<T>(
  query: Query,
  opts: {
    limit: number;
    cursor: string | null;
    /** Collection path used to resolve cursor docs for orderBy pagination. */
    cursorCollection?: string;
    mapDoc: (id: string, data: DocumentData) => T | null;
  },
): Promise<{ items: T[]; nextCursor: string | null }> {
  let q: Query = query.limit(opts.limit + 1);
  if (opts.cursor) {
    if (opts.cursorCollection) {
      const { db } = await import("./init");
      const cursorSnap = await db
        .doc(`${opts.cursorCollection}/${opts.cursor}`)
        .get();
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap);
      }
    } else {
      q = q.startAfter(opts.cursor);
    }
  }
  const snap = await q.get();
  const items: T[] = [];
  for (const doc of snap.docs.slice(0, opts.limit)) {
    const mapped = opts.mapDoc(doc.id, doc.data());
    if (mapped != null) items.push(mapped);
  }
  const hasMore = snap.docs.length > opts.limit;
  const nextCursor = hasMore
    ? snap.docs[opts.limit - 1]?.id ?? null
    : null;
  return { items, nextCursor };
}

/** Max docs loaded for admin workspace bootstrap catalogs. */
export const WORKSPACE_CATALOG_LIMIT = 500;

/**
 * Resolve participant IDs by NPN without loading the full collection.
 * Chunks `in` queries (Firestore limit 30).
 */
export async function lookupParticipantIdsByNpn(
  npns: readonly string[],
): Promise<Map<string, string>> {
  const { db } = await import("./init");
  const unique = Array.from(
    new Set(
      npns
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
  const byNpn = new Map<string, string>();
  const CHUNK = 30;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const snap = await db
      .collection("paymentsParticipants")
      .where("npn", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const npn = doc.data()?.npn;
      if (typeof npn === "string" && npn.trim()) {
        byNpn.set(npn.trim(), doc.id);
      }
    }
  }
  return byNpn;
}

/**
 * Walk the upline chain from `startId` by querying one edge at a time
 * instead of loading all businessRelationships.
 */
export async function loadUplineChainEdges(
  startId: string,
  opts: { excludeId?: string; maxHops?: number } = {},
): Promise<
  Array<
    Pick<
      BusinessRelationship,
      "uplineParticipantId" | "downlineParticipantId" | "active"
    >
  >
> {
  const { db } = await import("./init");
  const maxHops = opts.maxHops ?? 64;
  const edges: Array<
    Pick<
      BusinessRelationship,
      "uplineParticipantId" | "downlineParticipantId" | "active"
    >
  > = [];
  let current = startId;
  const visited = new Set<string>();
  for (let i = 0; i < maxHops; i++) {
    if (visited.has(current)) break;
    visited.add(current);
    const snap = await db
      .collection("businessRelationships")
      .where("downlineParticipantId", "==", current)
      .limit(5)
      .get();
    const active = snap.docs.find((d) => {
      if (opts.excludeId && d.id === opts.excludeId) return false;
      return d.data()?.active !== false;
    });
    if (!active) break;
    const data = active.data()!;
    edges.push({
      uplineParticipantId: String(data.uplineParticipantId ?? ""),
      downlineParticipantId: String(data.downlineParticipantId ?? ""),
      active: data.active !== false,
    });
    current = String(data.uplineParticipantId ?? "");
    if (!current) break;
  }
  return edges;
}

