"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUserRow } from "@pulse/firebase-web";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { canManagePlatform, headlineName } from "@/lib/roles";
import { ALL_ROLES, type UserRole } from "@/lib/types";
import { Button, SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import {
  RoleBadge,
  RowActionButton,
  RowActions,
  StatusBadge,
  UserCell,
} from "@/components/ui/data-table-cells";
import {
  UserFormDrawer,
  type UserFormValues,
} from "@/components/admin/user-form-drawer";
import {
  useAdminAgenciesQuery,
  useAdminUsersQuery,
  useInvalidateAdminQueries,
} from "@/lib/hooks/use-admin-queries";

const ROLE_KEYS: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

const FILTER_SELECT_CLASS =
  "h-10 w-full min-w-[9.5rem] rounded-xl border border-glass-border bg-transparent px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function approvalTone(
  status: string | undefined,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function UsersHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);
  const invalidate = useInvalidateAdminQueries();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query.trim(), 300);
  const [role, setRole] = useState<UserRole | "">("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [tokenStack, setTokenStack] = useState<(string | null)[]>([null]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadAgencies, setLoadAgencies] = useState(false);

  const filters = useMemo(
    () => ({
      query: debouncedQuery || undefined,
      role: role || undefined,
      approvalStatus: approvalStatus || undefined,
      pageSize,
      pageToken,
    }),
    [debouncedQuery, role, approvalStatus, pageSize, pageToken],
  );

  const usersQuery = useAdminUsersQuery(filters);
  const agenciesQuery = useAdminAgenciesQuery(
    { pageSize: 100 },
    loadAgencies || drawerOpen,
  );

  useEffect(() => {
    setPageToken(null);
    setTokenStack([null]);
  }, [debouncedQuery, role, approvalStatus, pageSize]);

  const users = usersQuery.data?.users ?? [];
  const nextPageToken = usersQuery.data?.nextPageToken ?? null;

  const openCreate = () => {
    setLoadAgencies(true);
    setDrawerMode("create");
    setEditing(null);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (user: AdminUserRow) => {
    setLoadAgencies(true);
    setDrawerMode("edit");
    setEditing(user);
    setFormError(null);
    setDrawerOpen(true);
  };

  const onSubmitForm = async (values: UserFormValues) => {
    setFormBusy(true);
    setFormError(null);
    try {
      const repo = getAdminRepository();
      if (drawerMode === "create") {
        await repo.createUser({
          email: values.email.trim(),
          password: values.password,
          displayName: values.displayName.trim() || undefined,
          role: values.role,
          orgNodeId: values.orgNodeId || null,
          npn: values.npn.trim() || null,
          approvalStatus: values.approvalStatus,
        });
      } else if (editing) {
        await repo.updateUser({
          uid: editing.uid,
          email: values.email.trim(),
          displayName: values.displayName.trim(),
          role: values.role,
          orgNodeId: values.orgNodeId || null,
          npn: values.npn.trim() || null,
          approvalStatus: values.approvalStatus,
        });
      }
      setDrawerOpen(false);
      await Promise.all([
        invalidate.invalidateUsers(),
        invalidate.invalidateInsights(),
      ]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<AdminUserRow, unknown>[]>(
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
          <RoleBadge>
            {ROLE_KEYS[row.original.role]
              ? t(ROLE_KEYS[row.original.role])
              : row.original.role}
          </RoleBadge>
        ),
      },
      {
        id: "agency",
        header: t("colAgency"),
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {row.original.agency ?? t("none")}
          </span>
        ),
      },
      {
        id: "approval",
        header: t("colApproval"),
        cell: ({ row }) => (
          <StatusBadge tone={approvalTone(row.original.approvalStatus)}>
            {row.original.approvalStatus === "approved"
              ? t("approvalStatusApproved")
              : row.original.approvalStatus === "pending"
                ? t("approvalStatusPending")
                : row.original.approvalStatus === "rejected"
                  ? t("approvalStatusRejected")
                  : t("none")}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="block text-right">{t("colActions")}</span>
        ),
        cell: ({ row }) => {
          const person = row.original;
          if (!isAdmin) return null;
          return (
            <RowActions>
              <RowActionButton
                variant="secondary"
                disabled={busyUid === person.uid}
                onClick={() => openEdit(person)}
              >
                {t("usersEdit")}
              </RowActionButton>
              {person.accountStatus === "deactivated" ? (
                <RowActionButton
                  variant="secondary"
                  disabled={busyUid === person.uid}
                  onClick={async () => {
                    setBusyUid(person.uid);
                    try {
                      await getAdminRepository().reactivateUser(person.uid);
                      await Promise.all([
                        invalidate.invalidateUsers(),
                        invalidate.invalidateInsights(),
                      ]);
                    } finally {
                      setBusyUid(null);
                    }
                  }}
                >
                  {t("usersReactivate")}
                </RowActionButton>
              ) : (
                <RowActionButton
                  disabled={
                    busyUid === person.uid || person.uid === profile?.uid
                  }
                  onClick={async () => {
                    setBusyUid(person.uid);
                    try {
                      await getAdminRepository().deactivateUser(person.uid);
                      await Promise.all([
                        invalidate.invalidateUsers(),
                        invalidate.invalidateInsights(),
                      ]);
                    } finally {
                      setBusyUid(null);
                    }
                  }}
                >
                  {t("usersDeactivate")}
                </RowActionButton>
              )}
            </RowActions>
          );
        },
      },
    ],
    [t, isAdmin, busyUid, profile?.uid, invalidate],
  );

  const toolbar = (
    <>
      <FilterField label={t("usersSearchLabel")} className="min-w-[16rem] flex-1">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("usersSearch")}
          aria-label={t("usersSearchLabel")}
        />
      </FilterField>
      <FilterField label={t("usersFilterRole")}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "")}
          className={FILTER_SELECT_CLASS}
        >
          <option value="">{t("usersFilterAll")}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE_KEYS[r])}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label={t("usersFilterApproval")}>
        <select
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value)}
          className={FILTER_SELECT_CLASS}
        >
          <option value="">{t("usersFilterAll")}</option>
          <option value="pending">{t("approvalStatusPending")}</option>
          <option value="approved">{t("approvalStatusApproved")}</option>
          <option value="rejected">{t("approvalStatusRejected")}</option>
        </select>
      </FilterField>
      {isAdmin ? (
        <Button className="shrink-0" onClick={openCreate}>
          {t("usersCreate")}
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("usersTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("usersSubtitle")}</p>
      </header>

      <DataTable
        columns={columns}
        data={users}
        loading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        emptyTitle={t("usersEmpty")}
        emptyHint={t("usersEmptyHint")}
        toolbar={toolbar}
        getRowId={(row) => row.uid}
        pageSize={pageSize}
        canPreviousPage={tokenStack.length > 1}
        canNextPage={Boolean(nextPageToken)}
        onPreviousPage={() => {
          setTokenStack((s) => {
            if (s.length <= 1) return s;
            const next = s.slice(0, -1);
            setPageToken(next[next.length - 1] ?? null);
            return next;
          });
        }}
        onNextPage={() => {
          if (!nextPageToken) return;
          setTokenStack((s) => [...s, nextPageToken]);
          setPageToken(nextPageToken);
        }}
        onPageSizeChange={setPageSize}
        previousLabel={t("usersPrev")}
        nextLabel={t("usersNext")}
        rowsLabel={t("tableRows")}
      />

      <UserFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        user={editing}
        agencies={agenciesQuery.data?.agencies ?? []}
        busy={formBusy}
        error={formError}
        onClose={() => setDrawerOpen(false)}
        onSubmit={onSubmitForm}
      />
    </div>
  );
}
