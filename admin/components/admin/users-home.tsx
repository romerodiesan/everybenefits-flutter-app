"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  adminDeactivateUser,
  adminReactivateUser,
  assignUserToOrgNode,
  listOrgSubtree,
  listUsersForAdmin,
  setUserRole,
} from "@/lib/firebase/functions";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManagePlatform, headlineName } from "@/lib/roles";
import { ALL_ROLES, type AdminOrgNode, type UserProfile, type UserRole } from "@/lib/types";
import { Button, Input } from "@/components/ui/primitives";

const ROLE_KEYS: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
};

export function UsersHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nodes, setNodes] = useState<AdminOrgNode[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [list, org] = await Promise.all([
        listUsersForAdmin({
          query: query.trim() || undefined,
          role: role || undefined,
          approvalStatus: approvalStatus || undefined,
          accountStatus: accountStatus || undefined,
          limit: 150,
        }),
        listOrgSubtree(null),
      ]);
      setUsers(list);
      setNodes(org);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("usersTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("usersSubtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("usersSearch")}
          className="min-w-[12rem] flex-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "")}
          className="h-10 rounded-xl border border-glass-border bg-transparent px-3 text-sm"
          aria-label={t("usersFilterRole")}
        >
          <option value="">{t("usersFilterAll")}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE_KEYS[r])}
            </option>
          ))}
        </select>
        <select
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value)}
          className="h-10 rounded-xl border border-glass-border bg-transparent px-3 text-sm"
          aria-label={t("usersFilterApproval")}
        >
          <option value="">{t("usersFilterAll")}</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <select
          value={accountStatus}
          onChange={(e) => setAccountStatus(e.target.value)}
          className="h-10 rounded-xl border border-glass-border bg-transparent px-3 text-sm"
          aria-label={t("usersFilterAccount")}
        >
          <option value="">{t("usersFilterAll")}</option>
          <option value="active">active</option>
          <option value="deactivated">deactivated</option>
          <option value="pendingDeletion">pendingDeletion</option>
        </select>
        <Button onClick={() => void reload()} disabled={loading}>
          {t("usersSave")}
        </Button>
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-2.5 font-bold">{t("colName")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colEmail")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colRole")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colAgency")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colApproval")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colAccount")}</th>
              <th className="px-4 py-2.5 text-right font-bold">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-muted">
                  {t("loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-muted">
                  {t("usersEmpty")}
                </td>
              </tr>
            ) : (
              users.map((person) => (
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
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={person.role}
                        disabled={busyUid === person.uid}
                        className="h-8 rounded-lg border border-glass-border bg-transparent px-2 text-xs"
                        onChange={async (e) => {
                          const next = e.target.value as UserRole;
                          setBusyUid(person.uid);
                          try {
                            await setUserRole(person.uid, next);
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.uid === person.uid ? { ...u, role: next } : u,
                              ),
                            );
                          } finally {
                            setBusyUid(null);
                          }
                        }}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(ROLE_KEYS[r])}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t(ROLE_KEYS[person.role])
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={person.orgNodeId ?? ""}
                      disabled={busyUid === person.uid}
                      className="h-8 max-w-[10rem] rounded-lg border border-glass-border bg-transparent px-2 text-xs"
                      onChange={async (e) => {
                        const next = e.target.value || null;
                        setBusyUid(person.uid);
                        try {
                          await assignUserToOrgNode(person.uid, next);
                          const node = nodes.find((n) => n.id === next);
                          setUsers((prev) =>
                            prev.map((u) =>
                              u.uid === person.uid
                                ? {
                                    ...u,
                                    orgNodeId: next,
                                    agency: node?.name ?? u.agency,
                                  }
                                : u,
                            ),
                          );
                        } finally {
                          setBusyUid(null);
                        }
                      }}
                    >
                      <option value="">{t("none")}</option>
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {"—".repeat(n.depth - 1)} {n.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {person.approvalStatus ?? t("none")}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {person.accountStatus ?? "active"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      person.accountStatus === "deactivated" ? (
                        <Button
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={busyUid === person.uid}
                          onClick={async () => {
                            setBusyUid(person.uid);
                            try {
                              await adminReactivateUser(person.uid);
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u.uid === person.uid
                                    ? { ...u, accountStatus: "active" }
                                    : u,
                                ),
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          {t("usersReactivate")}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="h-8 px-3 text-xs"
                          disabled={
                            busyUid === person.uid ||
                            person.uid === profile?.uid
                          }
                          onClick={async () => {
                            setBusyUid(person.uid);
                            try {
                              await adminDeactivateUser(person.uid);
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u.uid === person.uid
                                    ? { ...u, accountStatus: "deactivated" }
                                    : u,
                                ),
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          {t("usersDeactivate")}
                        </Button>
                      )
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
