"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { OrgNode, RoleDoc, UserRole } from "@pulse/shared";
import type { AdminUserRow } from "@pulse/firebase-web";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/drawer";
import { useAdminRolesQuery } from "@/lib/hooks/use-admin-queries";

const ROLE_KEYS: Partial<Record<UserRole, string>> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  agency_owner: "roleAgencyOwner",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

export type UserFormValues = {
  email: string;
  displayName: string;
  password: string;
  role: string;
  orgNodeId: string;
  npn: string;
  approvalStatus: "pending" | "approved" | "rejected";
};

const emptyCreate: UserFormValues = {
  email: "",
  displayName: "",
  password: "",
  role: "student",
  orgNodeId: "",
  npn: "",
  approvalStatus: "approved",
};

function roleLabel(t: (key: string) => string, role: RoleDoc): string {
  const key = ROLE_KEYS[role.id as UserRole];
  if (key) {
    try {
      return t(key);
    } catch {
      /* fall through */
    }
  }
  return role.name;
}

export function UserFormDrawer({
  open,
  mode,
  user,
  agencies,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  user: AdminUserRow | null;
  agencies: OrgNode[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const t = useTranslations();
  const [values, setValues] = useState<UserFormValues>(emptyCreate);
  const rolesQuery = useAdminRolesQuery(
    { includeInactive: false, includeSystem: false },
    open,
  );
  const assignableRoles = rolesQuery.data?.roles ?? [];

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setValues({
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        password: "",
        role: user.role,
        orgNodeId: user.orgNodeId ?? "",
        npn: user.npn ?? "",
        approvalStatus: user.approvalStatus ?? "approved",
      });
    } else {
      setValues(emptyCreate);
    }
  }, [open, mode, user]);

  return (
    <Drawer
      open={open}
      title={mode === "create" ? t("usersCreate") : t("usersEdit")}
      subtitle={
        mode === "create" ? t("usersCreateHint") : t("usersEditHint")
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t("orgCancel")}
          </Button>
          <Button
            disabled={busy}
            onClick={() => void onSubmit(values)}
          >
            {busy ? t("loading") : t("usersSave")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? (
          <p className="rounded-xl border border-[#B42318]/40 bg-[#B42318]/10 px-3 py-2 text-sm text-[#F97066]">
            {error}
          </p>
        ) : null}
        <div>
          <Label>{t("colEmail")}</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(e) =>
              setValues((v) => ({ ...v, email: e.target.value }))
            }
            required
            autoComplete="off"
          />
        </div>
        <div>
          <Label>{t("colName")}</Label>
          <Input
            value={values.displayName}
            onChange={(e) =>
              setValues((v) => ({ ...v, displayName: e.target.value }))
            }
          />
        </div>
        {mode === "create" ? (
          <div>
            <Label>{t("usersPassword")}</Label>
            <Input
              type="password"
              value={values.password}
              onChange={(e) =>
                setValues((v) => ({ ...v, password: e.target.value }))
              }
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        ) : null}
        <div>
          <Label>{t("colRole")}</Label>
          <select
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
            value={values.role}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                role: e.target.value,
              }))
            }
          >
            {assignableRoles.length === 0 ? (
              <option value={values.role}>{values.role}</option>
            ) : (
              assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {roleLabel(t, r)}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <Label>{t("colAgency")}</Label>
          <select
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
            value={values.orgNodeId}
            onChange={(e) =>
              setValues((v) => ({ ...v, orgNodeId: e.target.value }))
            }
          >
            <option value="">{t("none")}</option>
            {agencies.map((n) => (
              <option key={n.id} value={n.id}>
                {n.type === "organization"
                  ? `${n.name} (${t("orgType_organization")})`
                  : n.type === "sub_agency"
                    ? `${n.name} (${t("orgType_sub_agency")})`
                    : n.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t("colApproval")}</Label>
          <select
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
            value={values.approvalStatus}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                approvalStatus: e.target.value as UserFormValues["approvalStatus"],
              }))
            }
          >
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div>
          <Label>NPN</Label>
          <Input
            value={values.npn}
            onChange={(e) => setValues((v) => ({ ...v, npn: e.target.value }))}
          />
        </div>
      </div>
    </Drawer>
  );
}
