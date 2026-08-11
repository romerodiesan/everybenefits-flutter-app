"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  bulkSetUserApproval,
  setUserApproval,
} from "@/lib/firebase/functions";
import {
  BULK_MAX_SELECTED,
  clampSelection,
  formatBulkOutcome,
  selectedIdsFromState,
} from "@/lib/bulk-selection";
import { headlineName } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";
import { DataTable } from "@/components/ui/data-table";
import {
  BulkActionButton,
  BulkBarShell,
} from "@/components/ui/bulk-action-bar";
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const pending = query.data ?? [];
  const selectedIds = selectedIdsFromState(rowSelection);

  const refresh = async () => {
    await Promise.all([
      invalidate.invalidateApprovals(),
      invalidate.invalidateInsights(),
      invalidate.invalidateUsers(),
    ]);
  };

  const runBulk = async (status: "approved" | "rejected") => {
    if (status === "rejected") {
      if (
        !window.confirm(t("bulkConfirmReject", { count: selectedIds.length }))
      ) {
        return;
      }
    }
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const result = await bulkSetUserApproval(selectedIds, status);
      setBulkMessage(
        formatBulkOutcome(result, {
          success: (count) => t("bulkSuccess", { count }),
          partial: (failed, total) =>
            t("bulkPartialFailure", { failed, total }),
        }),
      );
      setRowSelection({});
      await refresh();
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  };

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
                    await refresh();
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
                    await refresh();
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
    // refresh closes over invalidate; intentional for row actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyUid, invalidate],
  );

  const bulkBar = (
    <BulkBarShell
      selectedCount={selectedIds.length}
      selectedLabel={t("bulkSelectedLabel")}
      maxHint={
        selectedIds.length >= BULK_MAX_SELECTED
          ? t("bulkMaxSelected", { max: BULK_MAX_SELECTED })
          : null
      }
      busy={bulkBusy}
      busyLabel={t("bulkBusy")}
      clearLabel={t("bulkClear")}
      onClear={() => setRowSelection({})}
    >
      <BulkActionButton
        variant="primary"
        disabled={bulkBusy}
        onClick={() => void runBulk("approved")}
      >
        {t("bulkApprove")}
      </BulkActionButton>
      <BulkActionButton
        variant="danger"
        disabled={bulkBusy}
        onClick={() => void runBulk("rejected")}
      >
        {t("bulkReject")}
      </BulkActionButton>
    </BulkBarShell>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("approvalsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("approvalsSubtitle")}</p>
      </header>

      {bulkMessage ? (
        <p className="text-sm text-muted" role="status">
          {bulkMessage}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={pending}
        loading={query.isLoading}
        isFetching={query.isFetching}
        emptyTitle={t("approvalsEmpty")}
        getRowId={(row) => row.uid}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={(updater) => {
          setRowSelection((prev) => {
            const next =
              typeof updater === "function" ? updater(prev) : updater;
            return clampSelection(next);
          });
        }}
        bulkBar={bulkBar}
      />
    </div>
  );
}
