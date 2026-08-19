"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { AdminUserRow, BulkResult } from "@pulse/firebase-web";
import {
  canAssignRoleByAuthority,
  getDefaultPermissionsForRole,
  isBuiltinRoleId,
} from "@pulse/shared";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { can, canManagePlatform, headlineName } from "@/lib/roles";
import {
  BULK_MAX_SELECTED,
  clampSelection,
  formatBulkOutcome,
  selectedIdsFromState,
} from "@/lib/bulk-selection";
import { ALL_ROLES, type UserRole } from "@/lib/types";
import { Button, SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import {
  BulkBarShell,
  BulkField,
  BulkSelect,
} from "@/components/ui/bulk-action-bar";
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
  useAdminRolesQuery,
  useAdminUsersQuery,
  useInvalidateAdminQueries,
} from "@/lib/hooks/use-admin-queries";

const ROLE_KEYS: Record<UserRole, string> = {
  student: "roleStudent",
  agent: "roleAgent",
  agency_owner: "roleAgencyOwner",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

const FILTER_SELECT_CLASS =
  "h-8 w-full min-w-[9.5rem] rounded-lg border border-glass-border bg-transparent px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

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
  const { profile, permissions } = useAuth();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);
  const canDecideApprovals = can(access, "admin.approvals.decide");
  const invalidate = useInvalidateAdminQueries();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query.trim(), 200);
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAgency, setBulkAgency] = useState("");
  const [bulkRole, setBulkRole] = useState("");

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
  const selectedIds = selectedIdsFromState(rowSelection);
  const enableBulk = canDecideApprovals || isAdmin;
  const bulkActive = selectedIds.length > 0;

  useEffect(() => {
    if (bulkActive && isAdmin) setLoadAgencies(true);
  }, [bulkActive, isAdmin]);

  const agenciesQuery = useAdminAgenciesQuery(
    { pageSize: 100 },
    loadAgencies || drawerOpen,
  );
  const rolesQuery = useAdminRolesQuery(
    { includeInactive: false, includeSystem: false },
    isAdmin,
  );
  const agencies = agenciesQuery.data?.agencies ?? [];
  const roleById = useMemo(
    () => new Map((rolesQuery.data?.roles ?? []).map((item) => [item.id, item])),
    [rolesQuery.data?.roles],
  );
  const assignableRoles = useMemo(
    () =>
      (rolesQuery.data?.roles ?? []).filter((item) =>
        canAssignRoleByAuthority({
          actorRole: profile?.role ?? "student",
          actorPermissions: permissions,
          targetRole: item.id,
          targetPermissions: item.permissions,
        }),
      ),
    [permissions, profile?.role, rolesQuery.data?.roles],
  );
  const canManageUser = (person: AdminUserRow) => {
    if (!profile || person.uid === profile.uid) return false;
    const roleDoc = roleById.get(person.role);
    if (!roleDoc && !isBuiltinRoleId(person.role)) return false;
    return canAssignRoleByAuthority({
      actorRole: profile.role,
      actorPermissions: permissions,
      targetRole: person.role,
      targetPermissions:
        roleDoc?.permissions ?? getDefaultPermissionsForRole(person.role),
    });
  };

  useEffect(() => {
    setPageToken(null);
    setTokenStack([null]);
    setRowSelection({});
    setBulkStatus("");
    setBulkAgency("");
    setBulkRole("");
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
          profileBadge: values.badgeEnabled
            ? {
                enabled: true,
                text: values.badgeText.trim(),
                icon: values.badgeIcon,
                color: values.badgeColor,
              }
            : null,
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

  const runBulk = async (action: () => Promise<BulkResult>) => {
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const result = await action();
      setBulkMessage(
        formatBulkOutcome(result, {
          success: (count) => t("bulkSuccess", { count }),
          partial: (failed, total) =>
            t("bulkPartialFailure", { failed, total }),
        }),
      );
      setRowSelection({});
      setBulkStatus("");
      setBulkAgency("");
      setBulkRole("");
      await Promise.all([
        invalidate.invalidateUsers(),
        invalidate.invalidateApprovals(),
        invalidate.invalidateInsights(),
      ]);
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const onBulkStatusChange = (value: string) => {
    setBulkStatus(value);
    if (!value) return;
    if (value === "rejected") {
      if (
        !window.confirm(
          t("bulkConfirmReject", { count: selectedIds.length }),
        )
      ) {
        setBulkStatus("");
        return;
      }
    }
    if (
      value === "pending" ||
      value === "approved" ||
      value === "rejected"
    ) {
      void runBulk(() =>
        getAdminRepository().bulkSetUserApproval(
          selectedIds,
          value,
        ),
      );
      return;
    }
    if (value === "active" || value === "deactivated") {
      if (value === "deactivated") {
        if (
          !window.confirm(
            t("bulkConfirmDeactivate", { count: selectedIds.length }),
          )
        ) {
          setBulkStatus("");
          return;
        }
      }
      void runBulk(() =>
        getAdminRepository().bulkSetUserAccountStatus(selectedIds, value),
      );
    }
  };

  const onBulkAgencyChange = (value: string) => {
    setBulkAgency(value);
    if (value === "") return;
    const orgNodeId = value === "__none__" ? null : value;
    void runBulk(() =>
      getAdminRepository().bulkAssignUsersToOrgNode(selectedIds, orgNodeId),
    );
  };

  const onBulkRoleChange = (value: string) => {
    setBulkRole(value);
    if (!value) return;
    void runBulk(() =>
      getAdminRepository().bulkSetUserRole(selectedIds, value),
    );
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
          const manageable = canManageUser(person);
          return (
            <RowActions>
              <RowActionButton
                variant="secondary"
                disabled={busyUid === person.uid || !manageable}
                title={!manageable ? t("usersHierarchyBlocked") : undefined}
                onClick={() => openEdit(person)}
              >
                {t("usersEdit")}
              </RowActionButton>
              {person.accountStatus === "deactivated" ? (
                <RowActionButton
                  variant="secondary"
                  disabled={busyUid === person.uid || !manageable}
                  title={!manageable ? t("usersHierarchyBlocked") : undefined}
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
                    busyUid === person.uid || !manageable
                  }
                  title={!manageable ? t("usersHierarchyBlocked") : undefined}
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
    [
      t,
      isAdmin,
      busyUid,
      profile,
      permissions,
      roleById,
      invalidate,
    ],
  );

  const toolbar = (
    <>
      <FilterField label={t("usersSearchLabel")} className="min-w-[16rem] flex-1">
        <SearchInput
          size="sm"
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
          title={t("usersApprovalHint")}
        >
          <option value="">{t("usersFilterAll")}</option>
          <option value="pending">{t("approvalStatusPending")}</option>
          <option value="approved">{t("approvalStatusApproved")}</option>
          <option value="rejected">{t("approvalStatusRejected")}</option>
        </select>
      </FilterField>
      {isAdmin ? (
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          {t("usersCreate")}
        </Button>
      ) : null}
    </>
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
      onClear={() => {
        setRowSelection({});
        setBulkStatus("");
        setBulkAgency("");
        setBulkRole("");
      }}
    >
      {canDecideApprovals || isAdmin ? (
        <BulkField label={t("bulkFieldStatus")}>
          <BulkSelect
            value={bulkStatus}
            disabled={bulkBusy}
            aria-label={t("bulkChangeStatus")}
            onChange={(e) => onBulkStatusChange(e.target.value)}
          >
            <option value="">{t("bulkChangeStatus")}</option>
            {canDecideApprovals ? (
              <optgroup label={t("colApproval")}>
                <option value="pending">{t("approvalStatusPending")}</option>
                <option value="approved">{t("approvalStatusApproved")}</option>
                <option value="rejected">{t("approvalStatusRejected")}</option>
              </optgroup>
            ) : null}
            {isAdmin ? (
              <optgroup label={t("colAccount")}>
                <option value="active">{t("usersReactivate")}</option>
                <option value="deactivated">{t("usersDeactivate")}</option>
              </optgroup>
            ) : null}
          </BulkSelect>
        </BulkField>
      ) : null}
      {isAdmin ? (
        <>
          <BulkField label={t("bulkFieldAgency")}>
            <BulkSelect
              value={bulkAgency}
              disabled={bulkBusy}
              aria-label={t("bulkChangeAgency")}
              onChange={(e) => onBulkAgencyChange(e.target.value)}
            >
              <option value="">{t("bulkChangeAgency")}</option>
              <option value="__none__">{t("bulkNoAgency")}</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.type === "organization"
                    ? `${agency.name} (${t("orgType_organization")})`
                    : agency.type === "sub_agency"
                      ? `${agency.name} (${t("orgType_sub_agency")})`
                      : agency.name}
                </option>
              ))}
            </BulkSelect>
          </BulkField>
          <BulkField label={t("bulkFieldRole")}>
            <BulkSelect
              value={bulkRole}
              disabled={bulkBusy}
              aria-label={t("bulkChangeRole")}
              onChange={(e) => onBulkRoleChange(e.target.value)}
            >
              <option value="">{t("bulkChangeRole")}</option>
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {ROLE_KEYS[r.id as UserRole]
                    ? t(ROLE_KEYS[r.id as UserRole])
                    : r.name}
                </option>
              ))}
            </BulkSelect>
          </BulkField>
        </>
      ) : null}
    </BulkBarShell>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("usersTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("usersSubtitle")}</p>
        <p className="mt-1 text-xs text-muted">{t("usersApprovalHint")}</p>
      </header>

      {bulkMessage ? (
        <p className="text-sm text-muted" role="status">
          {bulkMessage}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={users}
        loading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        emptyTitle={t("usersEmpty")}
        emptyHint={t("usersEmptyHint")}
        toolbar={toolbar}
        enableRowSelection={enableBulk}
        canSelectRow={canManageUser}
        rowSelection={rowSelection}
        onRowSelectionChange={(updater) => {
          setRowSelection((prev) => {
            const next =
              typeof updater === "function" ? updater(prev) : updater;
            return clampSelection(next);
          });
        }}
        bulkBar={enableBulk ? bulkBar : undefined}
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
