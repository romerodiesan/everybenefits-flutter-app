"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ROLE_CATEGORIES,
  isSystemRole,
  type RoleCategory,
  type RoleDoc,
} from "@pulse/shared";
import { useAlerts } from "@/lib/providers/alert-provider";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { canManagePlatform } from "@/lib/roles";
import { Button, SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import {
  RowActionButton,
  RowActions,
  StatusBadge,
} from "@/components/ui/data-table-cells";
import {
  RoleFormDrawer,
  type RoleFormValues,
} from "@/components/admin/role-form-drawer";
import {
  useAdminRolesQuery,
  useInvalidateAdminQueries,
} from "@/lib/hooks/use-admin-queries";

const FILTER_SELECT_CLASS =
  "h-8 w-full min-w-[9.5rem] rounded-lg border border-glass-border bg-transparent px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

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

export function RolesHome() {
  const t = useTranslations();
  const alerts = useAlerts();
  const { profile } = useAuth();
  const viewerRole = profile?.role ?? "student";
  const access = useAccess();
  const isSystem = isSystemRole(viewerRole);
  const isAdmin = canManagePlatform(access);
  const canMutateCustom = isAdmin || isSystem;
  const invalidate = useInvalidateAdminQueries();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RoleCategory | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<RoleDoc | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const rolesQuery = useAdminRolesQuery({
    category: category || undefined,
    includeInactive,
    includeSystem: false,
  });

  const roles = useMemo(() => {
    const list = rolesQuery.data?.roles ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [rolesQuery.data?.roles, query]);

  const openCreate = () => {
    setDrawerMode("create");
    setEditing(null);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (role: RoleDoc) => {
    setDrawerMode("edit");
    setEditing(role);
    setFormError(null);
    setDrawerOpen(true);
  };

  const canEditRole = (role: RoleDoc | null) => {
    if (!role) return canMutateCustom;
    if (role.locked) return false;
    if (role.editableBySystemOnly) return isSystem;
    return canMutateCustom;
  };

  const onSubmit = async (values: RoleFormValues) => {
    setFormBusy(true);
    setFormError(null);
    try {
      const repo = getAdminRepository();
      if (drawerMode === "create") {
        await repo.createRole({
          id: values.id,
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          permissions: values.permissions,
          badgeText: values.badgeText || undefined,
          badgeIcon: values.badgeIcon,
          badgeColor: values.badgeColor,
        });
      } else {
        await repo.updateRole({
          id: values.id,
          name: values.name,
          description: values.description,
          category: values.category,
          permissions: values.permissions,
          active: values.active,
          badgeText: values.badgeText || null,
          badgeIcon: values.badgeIcon,
          badgeColor: values.badgeColor,
        });
      }
      await invalidate.invalidateRoles();
      setDrawerOpen(false);
      alerts.success(t("rolesSaved"));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : t("rolesSaveError"),
      );
    } finally {
      setFormBusy(false);
    }
  };

  const onDelete = async (role: RoleDoc) => {
    if (role.builtIn) return;
    const confirmed = await alerts.confirm({
      title: t("rolesDeleteConfirmTitle"),
      description: t("rolesDeleteConfirm", { name: role.name }),
      confirmLabel: t("rolesDeleteConfirmAction"),
      danger: true,
    });
    if (!confirmed) return;
    setRowBusy(role.id);
    try {
      await getAdminRepository().deleteRole(role.id);
      await invalidate.invalidateRoles();
      alerts.success(t("rolesDeleted"));
    } catch (error) {
      alerts.error(
        error instanceof Error ? error.message : t("rolesDeleteError"),
      );
    } finally {
      setRowBusy(null);
    }
  };

  const columns = useMemo<ColumnDef<RoleDoc>[]>(
    () => [
      {
        id: "name",
        header: t("colName"),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-ink">{row.original.name}</div>
            <div className="text-xs text-muted">{row.original.id}</div>
          </div>
        ),
      },
      {
        id: "category",
        header: t("rolesCategory"),
        cell: ({ row }) => t(`roleCategory_${row.original.category}`),
      },
      {
        id: "permissions",
        header: t("rolesPermissions"),
        cell: ({ row }) =>
          t("rolesPermissionCount", {
            count: row.original.permissions.length,
          }),
      },
      {
        id: "builtIn",
        header: t("rolesBuiltIn"),
        cell: ({ row }) =>
          row.original.builtIn ? (
            <StatusBadge tone="neutral">{t("rolesBuiltInYes")}</StatusBadge>
          ) : (
            <StatusBadge tone="success">{t("rolesCustom")}</StatusBadge>
          ),
      },
      {
        id: "active",
        header: t("rolesActive"),
        cell: ({ row }) =>
          row.original.active ? (
            <StatusBadge tone="success">{t("orgActive")}</StatusBadge>
          ) : (
            <StatusBadge tone="danger">{t("orgInactive")}</StatusBadge>
          ),
      },
      {
        id: "actions",
        header: t("colActions"),
        cell: ({ row }) => {
          const role = row.original;
          const editable = canEditRole(role);
          return (
            <RowActions>
              <RowActionButton onClick={() => openEdit(role)}>
                {editable ? t("usersEdit") : t("rolesView")}
              </RowActionButton>
              {!role.builtIn && canMutateCustom ? (
                <RowActionButton
                  variant="danger"
                  disabled={rowBusy === role.id}
                  onClick={() => void onDelete(role)}
                >
                  {t("rolesDelete")}
                </RowActionButton>
              ) : null}
            </RowActions>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use latest state
    [t, isSystem, canMutateCustom, rowBusy],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("rolesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("rolesSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canMutateCustom ? (
            <Button size="sm" onClick={openCreate}>{t("rolesCreate")}</Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <FilterField label={t("usersSearchLabel")} className="sm:col-span-1">
          <SearchInput
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("rolesSearch")}
          />
        </FilterField>
        <FilterField label={t("rolesCategory")}>
          <select
            className={FILTER_SELECT_CLASS}
            value={category}
            onChange={(e) =>
              setCategory((e.target.value || "") as RoleCategory | "")
            }
          >
            <option value="">{t("usersFilterAll")}</option>
            {ROLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`roleCategory_${c}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("rolesActive")}>
          <label className="flex h-8 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            {t("rolesShowInactive")}
          </label>
        </FilterField>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        loading={rolesQuery.isLoading}
        emptyTitle={t("rolesEmpty")}
        emptyHint={t("rolesEmptyHint")}
      />

      <RoleFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        role={editing}
        canEdit={canEditRole(editing)}
        systemOnlyLocked={Boolean(
          editing?.editableBySystemOnly && !isSystem,
        )}
        busy={formBusy}
        error={formError}
        onClose={() => setDrawerOpen(false)}
        onSubmit={onSubmit}
      />
    </div>
  );
}
