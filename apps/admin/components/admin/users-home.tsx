"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  adminDeactivateUser,
  adminReactivateUser,
  assignUserToOrgNode,
  createUserInvite,
  listOrgSubtreeCached,
  listUsersForAdmin,
  setUserRole,
} from "@/lib/firebase/functions";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManagePlatform, headlineName } from "@pulse/shared";
import { ALL_ROLES, type AdminOrgNode, type UserProfile, type UserRole } from "@/lib/types";
import { Button, Input } from "@pulse/ui";
import { TablePagination, TableSkeleton } from "@pulse/ui";

const ROLE_KEYS: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
};

const DEFAULT_PAGE_SIZE = 50;

export function UsersHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nodes, setNodes] = useState<AdminOrgNode[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("agent");
  const [inviteOrg, setInviteOrg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const nodesLoaded = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const loadPage = useCallback(
    async (cursor: string | null, opts?: { resetStack?: boolean }) => {
      setLoading(true);
      try {
        const [page, org] = await Promise.all([
          listUsersForAdmin({
            query: debouncedQuery || undefined,
            role: role || undefined,
            approvalStatus: approvalStatus || undefined,
            accountStatus: accountStatus || undefined,
            limit: pageSize,
            cursor,
          }),
          nodesLoaded.current
            ? Promise.resolve(null)
            : listOrgSubtreeCached(null),
        ]);
        setUsers(page.users);
        setNextCursor(page.nextCursor);
        setLoadError(null);
        if (org) {
          setNodes(org);
          nodesLoaded.current = true;
        }
        if (opts?.resetStack) {
          setCursorStack([null]);
          setPageIndex(0);
        }
      } catch (err) {
        setUsers([]);
        setNextCursor(null);
        setLoadError(
          err instanceof Error ? err.message : t("errorGeneric"),
        );
        if (opts?.resetStack) {
          setCursorStack([null]);
          setPageIndex(0);
        }
      } finally {
        setLoading(false);
        setReady(true);
      }
    },
    [accountStatus, approvalStatus, debouncedQuery, pageSize, role, t],
  );

  useEffect(() => {
    void loadPage(null, { resetStack: true });
  }, [loadPage]);

  const goNext = () => {
    if (!nextCursor || loading) return;
    const nextIndex = pageIndex + 1;
    setCursorStack((prev) => {
      const copy = prev.slice(0, nextIndex);
      copy[nextIndex] = nextCursor;
      return copy;
    });
    setPageIndex(nextIndex);
    void loadPage(nextCursor);
  };

  const goPrev = () => {
    if (pageIndex <= 0 || loading) return;
    const prevIndex = pageIndex - 1;
    const cursor = cursorStack[prevIndex] ?? null;
    setPageIndex(prevIndex);
    void loadPage(cursor);
  };

  const applyFilters = () => {
    void loadPage(null, { resetStack: true });
  };

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
        <Button onClick={applyFilters} disabled={loading}>
          {t("usersSave")}
        </Button>
      </div>

      {isAdmin ? (
        <div className="admin-panel space-y-3 rounded-2xl p-4">
          <h2 className="font-display text-lg font-bold">
            {t("usersInviteTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("usersInviteEmail")}
              className="min-w-[12rem] flex-1"
            />
            <Input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={t("usersInviteName")}
              className="min-w-[10rem] flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="h-10 rounded-xl border border-glass-border bg-transparent px-3 text-sm"
              aria-label={t("usersInviteRole")}
            >
              {ALL_ROLES.filter((r) => r !== "guest").map((r) => (
                <option key={r} value={r}>
                  {t(ROLE_KEYS[r])}
                </option>
              ))}
            </select>
            <select
              value={inviteOrg}
              onChange={(e) => setInviteOrg(e.target.value)}
              className="h-10 max-w-[12rem] rounded-xl border border-glass-border bg-transparent px-3 text-sm"
              aria-label={t("usersInviteOrg")}
            >
              <option value="">{t("none")}</option>
              {nodes
                .filter((n) => n.type === "agency")
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
            <Button
              disabled={inviteBusy || !inviteEmail.trim()}
              onClick={async () => {
                setInviteBusy(true);
                setInviteMsg(null);
                try {
                  const res = await createUserInvite({
                    email: inviteEmail.trim(),
                    role: inviteRole,
                    displayName: inviteName.trim() || undefined,
                    orgNodeId: inviteOrg || null,
                  });
                  setInviteMsg(t("usersInviteSuccess", { email: res.email }));
                  setInviteEmail("");
                  setInviteName("");
                  await loadPage(cursorStack[pageIndex] ?? null);
                } catch (err) {
                  setInviteMsg(
                    err instanceof Error ? err.message : t("errorGeneric"),
                  );
                } finally {
                  setInviteBusy(false);
                }
              }}
            >
              {t("usersInviteSubmit")}
            </Button>
          </div>
          {inviteMsg ? (
            <p className="text-sm text-muted">{inviteMsg}</p>
          ) : null}
        </div>
      ) : null}

      {loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : null}

      {loading && !ready ? (
        <TableSkeleton columns={7} rows={8} />
      ) : (
        <div className="admin-panel flex min-h-0 flex-col overflow-hidden">
          <div className="max-h-[min(36rem,calc(100svh-18rem))] overflow-auto">
            <div className="min-w-[52rem]">
              <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr className="border-b border-glass-border text-[11px] uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-2.5 font-bold">{t("colName")}</th>
                  <th className="px-4 py-2.5 font-bold">{t("colEmail")}</th>
                  <th className="px-4 py-2.5 font-bold">{t("colRole")}</th>
                  <th className="px-4 py-2.5 font-bold">{t("colAgency")}</th>
                  <th className="px-4 py-2.5 font-bold">{t("colApproval")}</th>
                  <th className="px-4 py-2.5 font-bold">{t("colAccount")}</th>
                  <th className="px-4 py-2.5 text-right font-bold">
                    {t("colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, r) => (
                    <tr key={`sk-${r}`} className="border-b border-glass-border">
                      {Array.from({ length: 7 }).map((_, c) => (
                        <td key={c} className="px-4 py-3">
                          <span
                            className={`block h-4 animate-pulse rounded-md bg-white/[0.06] ${
                              c === 0 ? "w-28" : "w-20"
                            }`}
                            aria-hidden
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : ready && users.length === 0 ? (
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
                                    u.uid === person.uid
                                      ? { ...u, role: next }
                                      : u,
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
                              {"—".repeat(Math.max(0, n.depth - 1))} {n.name}
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
                                        ? {
                                            ...u,
                                            accountStatus: "deactivated",
                                          }
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
          <div className="shrink-0 px-4 pb-3">
            <TablePagination
              pageSize={pageSize}
              showing={users.length}
              hasPrev={pageIndex > 0}
              hasNext={Boolean(nextCursor)}
              onPrev={goPrev}
              onNext={goNext}
              onPageSizeChange={(size) => setPageSize(size)}
              loading={loading}
              labelShowing={t("tableShowing", { count: users.length })}
              labelPrev={t("tablePrev")}
              labelNext={t("tableNext")}
              labelPageSize={t("tablePageSize")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
