"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listPendingApprovals,
  setUserApproval,
} from "@/lib/firebase/functions";
import { headlineName } from "@pulse/shared";
import type { UserProfile } from "@/lib/types";
import { Button } from "@pulse/ui";
import { TableSkeleton } from "@pulse/ui";

export function ApprovalsHome() {
  const t = useTranslations();
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    listPendingApprovals()
      .then(setPending)
      .catch(() => setPending([]))
      .finally(() => {
        setLoading(false);
        setReady(true);
      });
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("approvalsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("approvalsSubtitle")}</p>
      </header>

      {loading || !ready ? (
        <TableSkeleton columns={4} rows={6} />
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted">{t("approvalsEmpty")}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-glass-border text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-2.5 font-bold">{t("colName")}</th>
                <th className="px-4 py-2.5 font-bold">{t("colEmail")}</th>
                <th className="px-4 py-2.5 font-bold">{t("colRole")}</th>
                <th className="px-4 py-2.5 text-right font-bold"> </th>
              </tr>
            </thead>
            <tbody>
              {pending.map((person) => (
                <tr
                  key={person.uid}
                  className="border-b border-glass-border last:border-0"
                >
                  <td className="px-4 py-3 font-semibold">
                    {headlineName(person)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {person.email ?? t("none")}
                  </td>
                  <td className="px-4 py-3 capitalize">{person.role}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={busyUid === person.uid}
                        onClick={async () => {
                          setBusyUid(person.uid);
                          try {
                            await setUserApproval(person.uid, "approved");
                            setPending((prev) =>
                              prev.filter((s) => s.uid !== person.uid),
                            );
                          } finally {
                            setBusyUid(null);
                          }
                        }}
                      >
                        {t("approvalApprove")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 px-3 text-xs"
                        disabled={busyUid === person.uid}
                        onClick={async () => {
                          setBusyUid(person.uid);
                          try {
                            await setUserApproval(person.uid, "rejected");
                            setPending((prev) =>
                              prev.filter((s) => s.uid !== person.uid),
                            );
                          } finally {
                            setBusyUid(null);
                          }
                        }}
                      >
                        {t("approvalReject")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
