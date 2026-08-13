import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { paymentsOverviewSchema, type PaymentsOverview } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requirePaymentsAdmin } from "./payments-shared";

/** Home dashboard: carriers + statements only (commission runs are separate). */
export const getPaymentsOverview = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "getPaymentsOverview");

  const [carriersActiveAgg, statementsTotalAgg, statementsImportedAgg] =
    await Promise.all([
      db.collection("carriers").where("active", "==", true).count().get(),
      db.collection("statements").count().get(),
      db.collection("statements").where("status", "==", "imported").count().get(),
    ]);

  const overview: PaymentsOverview = {
    carriers: { active: carriersActiveAgg.data().count },
    statements: {
      total: statementsTotalAgg.data().count,
      imported: statementsImportedAgg.data().count,
    },
  };

  const parsed = paymentsOverviewSchema.safeParse(overview);
  if (!parsed.success) {
    throw new HttpsError("internal", parsed.error.message);
  }
  return parsed.data;
});
