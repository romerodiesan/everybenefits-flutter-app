"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ROLE_CATEGORIES,
  permissionNameMessageKey,
  type PermissionCategory,
  type RoleCategory,
  type RoleDoc,
} from "@pulse/shared";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/drawer";

export type RoleFormValues = {
  id: string;
  name: string;
  description: string;
  category: RoleCategory;
  permissions: string[];
  active: boolean;
};

const emptyCreate: RoleFormValues = {
  id: "",
  name: "",
  description: "",
  category: "custom",
  permissions: [],
  active: true,
};

function PermissionMatrix({
  selected,
  disabled,
  onChange,
}: {
  selected: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations();
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [openCategories, setOpenCategories] = useState<Set<PermissionCategory>>(
    () => new Set(["platform", "admin"]),
  );

  const toggle = (key: string) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  const toggleCategory = (category: PermissionCategory, on: boolean) => {
    if (disabled) return;
    const keys = PERMISSION_CATALOG.filter((p) => p.category === category).map(
      (p) => p.key,
    );
    const next = new Set(selectedSet);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    onChange([...next]);
  };

  const toggleOpen = (category: PermissionCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const permissionLabel = (key: string, fallback: string) => {
    const msgKey = permissionNameMessageKey(key);
    return t.has(msgKey) ? t(msgKey) : fallback;
  };

  return (
    <div className="space-y-2">
      {PERMISSION_CATEGORIES.map((category) => {
        const items = PERMISSION_CATALOG.filter((p) => p.category === category);
        const selectedInCategory = items.filter((p) =>
          selectedSet.has(p.key),
        ).length;
        const allOn = items.length > 0 && selectedInCategory === items.length;
        const isOpen = openCategories.has(category);

        return (
          <section
            key={category}
            className="overflow-hidden rounded-xl border border-glass-border"
          >
            <div className="flex items-center gap-1 bg-white/[0.02] px-2 py-1.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-white/[0.04]"
                aria-expanded={isOpen}
                onClick={() => toggleOpen(category)}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-muted transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path
                      d="M6 3.5 10.5 8 6 12.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    {t(`permCategory_${category}`)}
                  </span>
                  <span className="block text-[11px] text-muted/80">
                    {t("rolesCategorySelected", {
                      selected: selectedInCategory,
                      total: items.length,
                    })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category, !allOn);
                }}
              >
                {allOn ? t("rolesDeselectCategory") : t("rolesSelectCategory")}
              </button>
            </div>
            {isOpen ? (
              <ul className="space-y-2 border-t border-glass-border px-3 py-3">
                {items.map((perm) => (
                  <li key={perm.key}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedSet.has(perm.key)}
                        disabled={disabled}
                        onChange={() => toggle(perm.key)}
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-ink">
                          {permissionLabel(perm.key, perm.name)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {perm.description}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted/70">
                          {perm.key}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function RoleFormDrawer({
  open,
  mode,
  role,
  canEdit,
  systemOnlyLocked,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  role: RoleDoc | null;
  canEdit: boolean;
  systemOnlyLocked: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const t = useTranslations();
  const [values, setValues] = useState<RoleFormValues>(emptyCreate);
  const readOnly = !canEdit;

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && role) {
      setValues({
        id: role.id,
        name: role.name,
        description: role.description ?? "",
        category: role.category,
        permissions: [...role.permissions],
        active: role.active,
      });
    } else {
      setValues(emptyCreate);
    }
  }, [open, mode, role]);

  return (
    <Drawer
      open={open}
      title={mode === "create" ? t("rolesCreate") : t("rolesEdit")}
      subtitle={
        systemOnlyLocked
          ? t("rolesSystemOnlyHint")
          : mode === "create"
            ? t("rolesCreateHint")
            : t("rolesEditHint")
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t("orgCancel")}
          </Button>
          {canEdit ? (
            <Button disabled={busy} onClick={() => void onSubmit(values)}>
              {busy ? t("loading") : t("usersSave")}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-[#B42318]/40 bg-[#B42318]/10 px-3 py-2 text-sm text-[#F97066]">
            {error}
          </p>
        ) : null}
        {systemOnlyLocked ? (
          <p className="rounded-xl border border-glass-border bg-white/[0.03] px-3 py-2 text-sm text-muted">
            {t("rolesSystemOnlyHint")}
          </p>
        ) : null}
        {mode === "create" ? (
          <div>
            <Label>{t("rolesSlug")}</Label>
            <Input
              value={values.id}
              disabled={readOnly}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                }))
              }
              placeholder="custom-ops"
              autoComplete="off"
            />
          </div>
        ) : (
          <div>
            <Label>{t("rolesSlug")}</Label>
            <Input value={values.id} disabled />
          </div>
        )}
        <div>
          <Label>{t("colName")}</Label>
          <Input
            value={values.name}
            disabled={readOnly}
            onChange={(e) =>
              setValues((v) => ({ ...v, name: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>{t("rolesDescription")}</Label>
          <Input
            value={values.description}
            disabled={readOnly}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>{t("rolesCategory")}</Label>
          <select
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
            value={values.category}
            disabled={readOnly}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                category: e.target.value as RoleCategory,
              }))
            }
          >
            {ROLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`roleCategory_${c}`)}
              </option>
            ))}
          </select>
        </div>
        {mode === "edit" && !role?.builtIn ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.active}
              disabled={readOnly}
              onChange={(e) =>
                setValues((v) => ({ ...v, active: e.target.checked }))
              }
            />
            {t("rolesActive")}
          </label>
        ) : null}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>{t("rolesPermissions")}</Label>
            <span className="text-xs text-muted">
              {t("rolesPermissionCount", { count: values.permissions.length })}
            </span>
          </div>
          <PermissionMatrix
            selected={values.permissions}
            disabled={readOnly}
            onChange={(permissions) =>
              setValues((v) => ({ ...v, permissions }))
            }
          />
        </div>
      </div>
    </Drawer>
  );
}
