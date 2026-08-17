import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  createCommissionRunInputSchema,
  emptyCommissionRunTotals,
  getAgencyPayModeInputSchema,
  getCommissionRunInputSchema,
  hasCommissionPermission,
  isUserAssignableOrgType,
  listCommissionPartiesInputSchema,
  listCommissionRunsInputSchema,
  setAgencyPayModeInputSchema,
  type CommissionPartySummary,
  type CommissionRun,
  type PayMode,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireActor } from "./guards";
import { parseListPage } from "./payments-shared";

type CommissionPerm =
  | "commission.view"
  | "commission.upload"
  | "commission.resolve"
  | "commission.calculate"
  | "commission.approve"
  | "commission.publish"
  | "commission.manageRules"
  | "commission.manageImportProfiles"
  | "commission.viewAudit"
  | "commission.statements.self";

async function requireCommissionPermission(
  request: { auth?: { uid: string } },
  operation: string,
  permission: CommissionPerm,
) {
  const actor = await requireActor(request, operation);
  if (!hasCommissionPermission(actor.permissions, permission)) {
    throw new HttpsError(
      "permission-denied",
      `Missing permission: ${permission}`,
    );
  }
  return actor.uid;
}

function serializeCommissionRun(
  id: string,
  data: DocumentData,
): CommissionRun {
  const totals = data.totals ?? emptyCommissionRunTotals();
  return {
    id,
    name: String(data.name ?? ""),
    periodStart: String(data.periodStart ?? ""),
    periodEnd: String(data.periodEnd ?? ""),
    status: data.status ?? "DRAFT",
    createdBy: String(data.createdBy ?? ""),
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
    fileCount: Number(data.fileCount ?? 0),
    transactionCount: Number(data.transactionCount ?? 0),
    carrierIds: Array.isArray(data.carrierIds) ? data.carrierIds.map(String) : [],
    upstreamOrganizationIds: Array.isArray(data.upstreamOrganizationIds)
      ? data.upstreamOrganizationIds.map(String)
      : [],
    totals: {
      receivedCents: Number(totals.receivedCents ?? 0),
      expectedCents: Number(totals.expectedCents ?? 0),
      varianceCents: Number(totals.varianceCents ?? 0),
      downstreamCents: Number(totals.downstreamCents ?? 0),
      retainedCents: Number(totals.retainedCents ?? 0),
      payableAgenciesCents: Number(totals.payableAgenciesCents ?? 0),
      payableAgentsCents: Number(totals.payableAgentsCents ?? 0),
      commissionCents: Number(totals.commissionCents ?? 0),
      overrideCents: Number(totals.overrideCents ?? 0),
    },
    errorCount: Number(data.errorCount ?? 0),
    warningCount: Number(data.warningCount ?? 0),
    blockingIssueCount: Number(data.blockingIssueCount ?? 0),
    statementCount: Number(data.statementCount ?? 0),
    approvedBy: data.approvedBy ?? null,
    approvedAt:
      data.approvedAt?.toDate?.()?.toISOString?.() ?? data.approvedAt ?? null,
    publishedAt:
      data.publishedAt?.toDate?.()?.toISOString?.() ?? data.publishedAt ?? null,
    completedAt:
      data.completedAt?.toDate?.()?.toISOString?.() ?? data.completedAt ?? null,
  };
}

export const createCommissionRun = onCall(callableOpts, async (request) => {
  const uid = await requireCommissionPermission(
    request,
    "createCommissionRun",
    "commission.view",
  );
  const parsed = createCommissionRunInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  if (parsed.data.periodEnd < parsed.data.periodStart) {
    throw new HttpsError(
      "invalid-argument",
      "periodEnd must be on or after periodStart.",
    );
  }

  const ref = db.collection("commissionRuns").doc();
  const payload = {
    name: parsed.data.name.trim(),
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    status: "DRAFT" as const,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    fileCount: 0,
    transactionCount: 0,
    carrierIds: [],
    upstreamOrganizationIds: [],
    totals: emptyCommissionRunTotals(),
    errorCount: 0,
    warningCount: 0,
    blockingIssueCount: 0,
    statementCount: 0,
    approvedBy: null,
    approvedAt: null,
    publishedAt: null,
    completedAt: null,
  };
  await ref.set(payload);
  const snap = await ref.get();
  return { run: serializeCommissionRun(ref.id, snap.data() ?? payload) };
});

export const listCommissionRuns = onCall(callableOpts, async (request) => {
  await requireCommissionPermission(
    request,
    "listCommissionRuns",
    "commission.view",
  );
  const parsed = listCommissionRunsInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const page = parseListPage(request.data, {
    limit: parsed.data.limit,
    maxLimit: 100,
  });

  let query = db.collection("commissionRuns").orderBy("createdAt", "desc");
  if (parsed.data.status) {
    query = db
      .collection("commissionRuns")
      .where("status", "==", parsed.data.status)
      .orderBy("createdAt", "desc");
  }
  if (page.cursor) {
    const cursorSnap = await db.doc(`commissionRuns/${page.cursor}`).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }
  const snap = await query.limit(page.limit + 1).get();
  const docs = snap.docs.slice(0, page.limit);
  const runs = docs.map((d) => serializeCommissionRun(d.id, d.data()));
  const nextCursor =
    snap.docs.length > page.limit ? docs[docs.length - 1]?.id ?? null : null;
  return { runs, nextCursor };
});

export const getCommissionRun = onCall(callableOpts, async (request) => {
  await requireCommissionPermission(
    request,
    "getCommissionRun",
    "commission.view",
  );
  const parsed = getCommissionRunInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const snap = await db.doc(`commissionRuns/${parsed.data.runId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Commission run not found.");
  }
  return { run: serializeCommissionRun(snap.id, snap.data() ?? {}) };
});

const AGENT_PARTY_ROLES = new Set([
  "agent",
  "agency_owner",
  "instructor",
  "manager",
  "admin",
]);

export const listCommissionParties = onCall(callableOpts, async (request) => {
  await requireCommissionPermission(
    request,
    "listCommissionParties",
    "commission.view",
  );
  const parsed = listCommissionPartiesInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { kind, query, limit } = parsed.data;
  const q = query.trim().toLowerCase();
  const parties: CommissionPartySummary[] = [];

  const includeAgencies = kind === "agency" || kind === "all";
  const includeAgents = kind === "agent" || kind === "all";

  // When listing agencies, also load agent counts + pay modes in one shot
  // so the Agencies UI does not N+1 callables per row.
  const enrichAgencies = kind === "agency";

  const ORG_TYPE_LIMIT = 500;
  const USERS_LIMIT = 500;

  const [orgSnaps, usersSnap, payModesSnap, settingsSnap] = await Promise.all([
    includeAgencies
      ? Promise.all([
          db
            .collection("orgNodes")
            .where("type", "==", "organization")
            .limit(ORG_TYPE_LIMIT)
            .get(),
          db
            .collection("orgNodes")
            .where("type", "==", "agency")
            .limit(ORG_TYPE_LIMIT)
            .get(),
          db
            .collection("orgNodes")
            .where("type", "==", "sub_agency")
            .limit(ORG_TYPE_LIMIT)
            .get(),
        ])
      : Promise.resolve(null),
    includeAgents || enrichAgencies
      ? db.collection("users").limit(USERS_LIMIT).get()
      : Promise.resolve(null),
    enrichAgencies
      ? db.collection("agencyPayModes").limit(ORG_TYPE_LIMIT).get()
      : Promise.resolve(null),
    enrichAgencies
      ? db.doc("commissionSettings/default").get()
      : Promise.resolve(null),
  ]);

  const agentCountByOrg = new Map<string, number>();
  if (usersSnap && enrichAgencies) {
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const role = String(data.role ?? "student");
      if (!AGENT_PARTY_ROLES.has(role)) continue;
      if (String(data.approvalStatus ?? "approved") !== "approved") continue;
      if (data.isAnonymous === true) continue;
      const accountStatus = String(data.accountStatus ?? "active");
      if (
        accountStatus === "deactivated" ||
        accountStatus === "pendingDeletion"
      ) {
        continue;
      }
      const orgId =
        typeof data.orgNodeId === "string" ? data.orgNodeId.trim() : "";
      if (!orgId) continue;
      agentCountByOrg.set(orgId, (agentCountByOrg.get(orgId) ?? 0) + 1);
    }
  }

  const defaultPayMode = (settingsSnap?.data()?.defaultPayMode ??
    "through_agency") as PayMode;
  const payModeByOrg = new Map<string, PayMode>();
  if (payModesSnap) {
    for (const doc of payModesSnap.docs) {
      const mode = doc.data()?.payMode;
      payModeByOrg.set(
        doc.id,
        mode === "direct" ? "direct" : "through_agency",
      );
    }
  }

  if (orgSnaps) {
    for (const snap of orgSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!isUserAssignableOrgType(data.type) && data.type !== "sub_agency") {
          continue;
        }
        if (data.active === false) continue;
        const name = String(data.name ?? "Agency");
        const npn =
          typeof data.npn === "string" && data.npn.trim()
            ? data.npn.trim()
            : null;
        if (
          q &&
          !name.toLowerCase().includes(q) &&
          !(npn && npn.toLowerCase().includes(q)) &&
          !doc.id.toLowerCase().includes(q)
        ) {
          continue;
        }
        const customMode = payModeByOrg.get(doc.id);
        const party: CommissionPartySummary = {
          ref: { kind: "agency", orgNodeId: doc.id },
          name,
          npn,
          parentOrgNodeId:
            typeof data.parentId === "string" ? data.parentId : null,
          active: data.active !== false,
        };
        if (enrichAgencies) {
          party.agentCount = agentCountByOrg.get(doc.id) ?? 0;
          party.payMode = customMode ?? defaultPayMode;
          party.payModeIsDefault = customMode == null;
        }
        parties.push(party);
      }
    }
  }

  if (includeAgents && usersSnap) {
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const role = String(data.role ?? "student");
      if (!AGENT_PARTY_ROLES.has(role)) continue;
      if (String(data.approvalStatus ?? "approved") !== "approved") continue;
      if (data.isAnonymous === true) continue;
      const name =
        (typeof data.displayName === "string" && data.displayName.trim()) ||
        (typeof data.email === "string" && data.email.trim()) ||
        "Agent";
      const npn =
        typeof data.npn === "string" && data.npn.trim()
          ? data.npn.trim()
          : null;
      if (
        q &&
        !name.toLowerCase().includes(q) &&
        !(npn && npn.toLowerCase().includes(q)) &&
        !doc.id.toLowerCase().includes(q)
      ) {
        continue;
      }
      const accountStatus = String(data.accountStatus ?? "active");
      parties.push({
        ref: { kind: "agent", userId: doc.id },
        name,
        npn,
        parentOrgNodeId:
          typeof data.orgNodeId === "string" ? data.orgNodeId : null,
        active:
          accountStatus !== "deactivated" && accountStatus !== "pendingDeletion",
      });
    }
  }

  parties.sort((a, b) => a.name.localeCompare(b.name));
  const sliced = parties.slice(0, limit);
  return { parties: sliced, nextCursor: null };
});

export const getAgencyPayMode = onCall(callableOpts, async (request) => {
  await requireCommissionPermission(
    request,
    "getAgencyPayMode",
    "commission.view",
  );
  const parsed = getAgencyPayModeInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const orgNodeId = parsed.data.orgNodeId;
  const orgSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
  if (!orgSnap.exists) {
    throw new HttpsError("not-found", "Agency org node not found.");
  }
  const snap = await db.doc(`agencyPayModes/${orgNodeId}`).get();
  const settingsSnap = await db.doc("commissionSettings/default").get();
  const defaultPayMode = (settingsSnap.data()?.defaultPayMode ??
    "through_agency") as PayMode;
  if (!snap.exists) {
    return {
      orgNodeId,
      payMode: defaultPayMode,
      isDefault: true,
    };
  }
  const data = snap.data() ?? {};
  return {
    orgNodeId,
    payMode: (data.payMode === "direct" ? "direct" : "through_agency") as PayMode,
    isDefault: false,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
    updatedBy: data.updatedBy ?? null,
  };
});

export const setAgencyPayMode = onCall(callableOpts, async (request) => {
  // Phase 1: pay mode editing available to payments operators (view gate);
  // finer split can require manageRules exclusively later.
  const uid = await requireCommissionPermission(
    request,
    "setAgencyPayMode",
    "commission.view",
  );
  const parsed = setAgencyPayModeInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { orgNodeId, payMode } = parsed.data;
  const orgSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
  if (!orgSnap.exists) {
    throw new HttpsError("not-found", "Agency org node not found.");
  }
  const orgType = orgSnap.data()?.type;
  if (!isUserAssignableOrgType(orgType) && orgType !== "sub_agency") {
    throw new HttpsError(
      "invalid-argument",
      "Pay mode applies to agency org nodes only.",
    );
  }
  await db.doc(`agencyPayModes/${orgNodeId}`).set(
    {
      orgNodeId,
      payMode,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );
  return { orgNodeId, payMode, isDefault: false };
});
