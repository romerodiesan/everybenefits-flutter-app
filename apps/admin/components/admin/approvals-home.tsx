"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { setUserApproval } from "@/lib/firebase/functions";
import { headlineName } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";
import { DataTable } from "@/components/ui/data-table";
import {
  RoleBadge,
  RowActionButton,
  RowActions,
  UserCell,
} from "@/components/ui/data-table-cells";
import {
  useInvalidateAdminQueries,
  usePendingApprovalsQuery,
} from "@/lib/hooks/use-admin-queries";

export function ApprovalsHome() {
  const t = useTranslations();
  const query = usePendingApprovalsQuery();
  const invalidate = useInvalidateAdminQueries();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const pending = query.data ?? [];

  const columns = useMemo<ColumnDef<UserProfile, unknown>[]>(
    () => [
      {
        id: "user",
        header: t("colName"),
        cell: ({ row }) => (
          <UserCell
            name={headlineName(row.original)}
            email={row.original.email}
            photoUrl={row.original.photoUrl}
          />
        ),
      },
      {
        id: "role",
        header: t("colRole"),
        cell: ({ row }) => (
          <RoleBadge>{row.original.role}</RoleBadge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("colActions")}</span>,
        cell: ({ row }) => {
          const person = row.original;
          return (
            <RowActions>
              <RowActionButton
                variant="secondary"
                disabled={busyUid === person.uid}
                onClick={async () => {
                  setBusyUid(person.uid);
                  try {
                    await setUserApproval(person.uid, "approved");
                    await Promise.all([
                      invalidate.invalidateApprovals(),
                      invalidate.invalidateInsights(),
                      invalidate.invalidateUsers(),
                    ]);
                  } finally {
                    setBusyUid(null);
                  }
                }}
              >
                {t("approvalApprove")}
              </RowActionButton>
              <RowActionButton
                disabled={busyUid === person.uid}
                onClick={async () => {
                  setBusyUid(person.uid);
                  try {
                    await setUserApproval(person.uid, "rejected");
                    await Promise.all([
                      invalidate.invalidateApprovals(),
                      invalidate.invalidateInsights(),
                      invalidate.invalidateUsers(),
                    ]);
                  } finally {
                    setBusyUid(null);
                  }
                }}
              >
                {t("approvalReject")}
              </RowActionButton>
            </RowActions>
          );
        },
      },
    ],
    [t, busyUid, invalidate],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("approvalsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("approvalsSubtitle")}</p>
      </header>

      <DataTable
        columns={columns}
        data={pending}
        loading={query.isLoading}
        isFetching={query.isFetching}
        emptyTitle={t("approvalsEmpty")}
        getRowId={(row) => row.uid}
      />
    </div>
  );
}
