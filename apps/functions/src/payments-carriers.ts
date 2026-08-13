import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  carrierInputSchema,
  carrierStateRateInputSchema,
  importCarrierStateRatesInputSchema,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import {
  requirePaymentsAdmin,
  serializeCarrier,
  serializeCarrierStateRate,
  parseListPage,
  paginateCollection,
} from "./payments-shared";

// --- Carriers ---

export const listCarriers = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCarriers");
  const page = parseListPage(request.data, { limit: 100, maxLimit: 500 });
  const query = db.collection("carriers").orderBy("name");
  const { items, nextCursor } = await paginateCollection(query, {
    limit: page.limit,
    cursor: page.cursor,
    cursorCollection: "carriers",
    mapDoc: (id, data) => {
      const carrier = serializeCarrier(id, data);
      if (!page.includeInactive && !carrier.active) return null;
      return carrier;
    },
  });
  return { carriers: items, nextCursor };
});

export const upsertCarrier = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertCarrier");
  let id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = carrierInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  // Deduplicate by 4-digit code and/or name when creating without an id.
  if (!id) {
    const existing = await findCarrierByNameAndCode(
      parsed.data.name,
      parsed.data.code,
    );
    if (existing) id = existing.id;
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

function normalizeCarrierName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type CarrierLookup = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

async function findCarrierByNameAndCode(
  name: string,
  code: string,
): Promise<CarrierLookup | null> {
  const codeKey = code.trim();
  const nameKey = normalizeCarrierName(name);
  const snap = await db.collection("carriers").get();
  let byCode: CarrierLookup | null = null;
  let byName: CarrierLookup | null = null;
  let byBoth: CarrierLookup | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    const entry: CarrierLookup = {
      id: doc.id,
      name: String(data.name ?? ""),
      code: String(data.code ?? "").trim(),
      active: data.active !== false,
    };
    const sameCode = entry.code === codeKey;
    const sameName = normalizeCarrierName(entry.name) === nameKey;
    if (sameCode && sameName) {
      byBoth = entry;
      break;
    }
    if (sameCode && !byCode) byCode = entry;
    if (sameName && !byName) byName = entry;
  }

  // Prefer exact name+code, then code, then unique name match.
  return byBoth ?? byCode ?? byName;
}

export const listCarrierStateRates = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCarrierStateRates");
  const page = parseListPage(request.data, { limit: 200, maxLimit: 500 });
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
  const rates = snap.docs
    .map((d) => serializeCarrierStateRate(d.id, d.data()))
    .filter((r) => page.includeInactive || r.active)
    .slice(0, page.limit);
  return { rates, nextCursor: null };
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

export const importCarrierStateRates = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "importCarrierStateRates");
  const parsed = importCarrierStateRatesInputSchema.safeParse(
    request.data ?? {},
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.length ? issue.path.join(".") : "rows";
    throw new HttpsError(
      "invalid-argument",
      `Invalid import row (${where}): ${issue?.message ?? parsed.error.message}`,
    );
  }

  const carriersSnap = await db.collection("carriers").get();
  const byCode = new Map<string, CarrierLookup>();
  const byName = new Map<string, CarrierLookup>();
  const byNameAndCode = new Map<string, CarrierLookup>();

  const indexCarrier = (entry: CarrierLookup) => {
    byCode.set(entry.code, entry);
    byName.set(normalizeCarrierName(entry.name), entry);
    byNameAndCode.set(
      `${normalizeCarrierName(entry.name)}|${entry.code}`,
      entry,
    );
  };

  for (const doc of carriersSnap.docs) {
    const data = doc.data() ?? {};
    const code = String(data.code ?? "").trim();
    if (!code) continue;
    indexCarrier({
      id: doc.id,
      name: String(data.name ?? ""),
      code,
      active: data.active !== false,
    });
  }

  let imported = 0;
  let updated = 0;
  let carriersCreated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i]!;
    const rowNum = i + 2; // header is row 1
    try {
      const nameKey = normalizeCarrierName(row.carrier_name);
      const pairKey = `${nameKey}|${row.carrier_code}`;

      // Identity for upsert: name + 4-digit code (then code, then name).
      let carrier =
        byNameAndCode.get(pairKey) ??
        byCode.get(row.carrier_code) ??
        byName.get(nameKey) ??
        null;

      if (carrier) {
        const codeOwner = byCode.get(row.carrier_code);
        if (codeOwner && codeOwner.id !== carrier.id) {
          throw new Error(
            `Carrier code ${row.carrier_code} already belongs to "${codeOwner.name}".`,
          );
        }
        const nameOwner = byName.get(nameKey);
        if (nameOwner && nameOwner.id !== carrier.id) {
          throw new Error(
            `Carrier name "${row.carrier_name}" already belongs to code ${nameOwner.code}.`,
          );
        }
      }

      if (!carrier) {
        const ref = db.collection("carriers").doc();
        await ref.set({
          name: row.carrier_name,
          code: row.carrier_code,
          market: row.market ?? "aca",
          active: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        carrier = {
          id: ref.id,
          name: row.carrier_name,
          code: row.carrier_code,
          active: true,
        };
        indexCarrier(carrier);
        carriersCreated += 1;
      } else {
        const needsName = carrier.name !== row.carrier_name;
        const needsCode = carrier.code !== row.carrier_code;
        if (needsName || needsCode || carrier.active === false) {
          // Re-index after identity fields change.
          byName.delete(normalizeCarrierName(carrier.name));
          byCode.delete(carrier.code);
          byNameAndCode.delete(
            `${normalizeCarrierName(carrier.name)}|${carrier.code}`,
          );
          await db.doc(`carriers/${carrier.id}`).set(
            {
              name: row.carrier_name,
              code: row.carrier_code,
              active: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          carrier = {
            ...carrier,
            name: row.carrier_name,
            code: row.carrier_code,
            active: true,
          };
          indexCarrier(carrier);
        }
      }

      const existingSnap = await db
        .collection("carrierStateRates")
        .where("carrierId", "==", carrier.id)
        .where("state", "==", row.state)
        .limit(1)
        .get();

      const payload = {
        carrierId: carrier.id,
        state: row.state,
        commissionRate: row.commission_rate,
        commissionRateUnit: row.commission_unit,
        overrideRate: row.override_rate,
        overrideRateUnit: row.override_unit,
        active: row.active ?? true,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!existingSnap.empty) {
        await existingSnap.docs[0]!.ref.set(payload, { merge: true });
        updated += 1;
      } else {
        await db.collection("carrierStateRates").doc().set({
          ...payload,
          createdAt: FieldValue.serverTimestamp(),
        });
        imported += 1;
      }
    } catch (error) {
      skipped += 1;
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { imported, updated, carriersCreated, skipped, errors };
});
