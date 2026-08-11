"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { AdminUserRow } from "@pulse/firebase-web";
import type { OrgNode } from "@pulse/shared";
import { ORG_OWNER_UIDS_CAP } from "@pulse/shared";
import { canManagePlatform } from "@/lib/roles";
import {
  BULK_MAX_SELECTED,
  clampSelection,
  formatBulkOutcome,
  selectedIdsFromState,
} from "@/lib/bulk-selection";
import { useAccess } from "@/lib/providers/auth-provider";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { uploadOrgLogo } from "@/lib/firebase/org";
import {
  ORG_DEPTH_TYPE,
  isValidChildType,
  type OrgNodeType,
} from "@/lib/types";
import { Button, Input, Label, SearchInput } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/drawer";
import { DataTable } from "@/components/ui/data-table";
import {
  BulkActionButton,
  BulkBarShell,
} from "@/components/ui/bulk-action-bar";
import {
  RowActionButton,
  RowActions,
  StatusBadge,
} from "@/components/ui/data-table-cells";
import { OrgTreeSkeleton } from "@/components/ui/data-table-skeleton";
import {
  fetchOrgChildren,
  useAdminAgenciesQuery,
  useInvalidateAdminQueries,
  useOrgRootsQuery,
} from "@/lib/hooks/use-admin-queries";

type TreeNodeState = OrgNode & {
  childrenLoaded?: boolean;
  children?: TreeNodeState[];
  expanded?: boolean;
};

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function toTreeNodes(nodes: OrgNode[]): TreeNodeState[] {
  return nodes.map((n) => ({
    ...n,
    children: [],
    childrenLoaded: false,
    expanded: false,
  }));
}

function suggestedChildType(parent: OrgNode): OrgNodeType | null {
  if (parent.type === "agency" || parent.type === "sub_agency") {
    return "agency";
  }
  if (parent.depth >= 7) return null;
  const next = ORG_DEPTH_TYPE[(parent.depth + 1) as 2 | 3 | 4 | 5 | 6 | 7];
  if (!next) return null;
  if (next === "sub_agency") return "agency";
  return isValidChildType(parent.type, next) ? next : null;
}

function emptyAgencyForm() {
  return {
    name: "",
    parentId: "",
    email: "",
    paymentsEmail: "",
    npn: "",
    agencyLicense: "",
    ein: "",
    logoUrl: null as string | null,
    ownerUids: [] as string[],
    ownerLabels: {} as Record<string, string>,
  };
}

export function OrganizationsHome() {
  const t = useTranslations();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);
  const [tab, setTab] = useState<"tree" | "agencies">("tree");
  const invalidate = useInvalidateAdminQueries();
  const queryClient = useQueryClient();
  const repo = getAdminRepository();

  const rootsQuery = useOrgRootsQuery();
  const [treeUi, setTreeUi] = useState<
    Record<string, { expanded: boolean; children?: TreeNodeState[] }>
  >({});
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<TreeNodeState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [editName, setEditName] = useState("");

  const [agencyQuery, setAgencyQuery] = useState("");
  const debouncedAgencyQuery = useDebounced(agencyQuery.trim(), 300);
  const [agencyPageSize, setAgencyPageSize] = useState(25);
  const [agencyToken, setAgencyToken] = useState<string | null>(null);
  const [agencyStack, setAgencyStack] = useState<(string | null)[]>([null]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [agencyDrawer, setAgencyDrawer] = useState(false);
  const [agencyEdit, setAgencyEdit] = useState<OrgNode | null>(null);
  const [agencyForm, setAgencyForm] = useState(emptyAgencyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const debouncedOwnerSearch = useDebounced(ownerSearch.trim(), 300);
  const [ownerHits, setOwnerHits] = useState<AdminUserRow[]>([]);
  const [agencySelection, setAgencySelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const parentsQuery = useAdminAgenciesQuery(
    { pageSize: 200, includeInactive: false },
    agencyDrawer && !agencyEdit,
  );
  const parentOptions = parentsQuery.data?.agencies ?? [];

  const agenciesQuery = useAdminAgenciesQuery(
    {
      pageSize: agencyPageSize,
      pageToken: agencyToken,
      query: debouncedAgencyQuery || undefined,
      includeInactive,
    },
    tab === "agencies",
  );
  const agencies = agenciesQuery.data?.agencies ?? [];
  const agencyNext = agenciesQuery.data?.nextPageToken ?? null;

  const roots = useMemo(() => {
    const base = toTreeNodes(rootsQuery.data ?? []);
    const applyUi = (nodes: TreeNodeState[]): TreeNodeState[] =>
      nodes.map((n) => {
        const ui = treeUi[n.id];
        const children = ui?.children ?? n.children ?? [];
        return {
          ...n,
          expanded: ui?.expanded ?? false,
          childrenLoaded: Boolean(ui?.children) || n.childrenLoaded,
          children: applyUi(children),
        };
      });
    return applyUi(base);
  }, [rootsQuery.data, treeUi]);

  useEffect(() => {
    const nodes = rootsQuery.data ?? [];
    for (const node of nodes.slice(0, 8)) {
      void fetchOrgChildren(queryClient, node.id);
    }
  }, [rootsQuery.data, queryClient]);

  useEffect(() => {
    setAgencyToken(null);
    setAgencyStack([null]);
    setAgencySelection({});
  }, [debouncedAgencyQuery, agencyPageSize, includeInactive]);

  useEffect(() => {
    if (!agencyDrawer || !debouncedOwnerSearch) {
      setOwnerHits([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await repo.listUsers({
          query: debouncedOwnerSearch,
          pageSize: 8,
        });
        if (!cancelled) setOwnerHits(result.users);
      } catch {
        if (!cancelled) setOwnerHits([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agencyDrawer, debouncedOwnerSearch, repo]);

  const selectedAgencyIds = selectedIdsFromState(agencySelection);

  const runAgencyBulk = async (active: boolean) => {
    if (!active) {
      if (
        !window.confirm(
          t("bulkConfirmDeactivateAgencies", {
            count: selectedAgencyIds.length,
          }),
        )
      ) {
        return;
      }
    }
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const result = await repo.bulkSetOrgNodesActive(
        selectedAgencyIds,
        active,
      );
      setBulkMessage(
        formatBulkOutcome(result, {
          success: (count) => t("bulkSuccess", { count }),
          partial: (failed, total) =>
            t("bulkPartialFailure", { failed, total }),
        }),
      );
      setAgencySelection({});
      await Promise.all([
        invalidate.invalidateAgencies(),
        invalidate.invalidateInsights(),
      ]);
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const refreshTree = async () => {
    setTreeUi({});
    await invalidate.invalidateOrgs();
  };

  const toggleExpand = async (node: TreeNodeState) => {
    if (node.expanded) {
      setTreeUi((prev) => ({
        ...prev,
        [node.id]: {
          ...prev[node.id],
          expanded: false,
          children: prev[node.id]?.children,
        },
      }));
      return;
    }

    let children = treeUi[node.id]?.children;
    if (!children) {
      setBusy(true);
      try {
        const loaded = await fetchOrgChildren(queryClient, node.id);
        children = toTreeNodes(loaded);
      } finally {
        setBusy(false);
      }
    }

    setTreeUi((prev) => ({
      ...prev,
      [node.id]: { expanded: true, children },
    }));
  };

  const openNodeDrawer = (node: TreeNodeState) => {
    setSelected(node);
    setEditName(node.name);
    setChildName("");
    setDrawerOpen(true);
  };

  const openAgencyCreate = () => {
    setAgencyEdit(null);
    setAgencyForm(emptyAgencyForm());
    setLogoFile(null);
    setOwnerSearch("");
    setAgencyDrawer(true);
  };

  const openAgencyEdit = (agency: OrgNode) => {
    setAgencyEdit(agency);
    const labels: Record<string, string> = {};
    for (const uid of agency.ownerUids ?? []) {
      labels[uid] = uid.slice(0, 8);
    }
    setAgencyForm({
      name: agency.name,
      parentId: agency.parentId ?? "",
      email: agency.email ?? "",
      paymentsEmail: agency.paymentsEmail ?? "",
      npn: agency.npn ?? "",
      agencyLicense: agency.agencyLicense ?? "",
      ein: agency.ein ?? "",
      logoUrl: agency.logoUrl,
      ownerUids: [...(agency.ownerUids ?? [])],
      ownerLabels: labels,
    });
    setLogoFile(null);
    setOwnerSearch("");
    setAgencyDrawer(true);
  };

  const saveAgency = async () => {
    const name = agencyForm.name.trim();
    if (!name) return;
    if (!agencyEdit && !agencyForm.parentId) return;
    setBusy(true);
    try {
      const profile = {
        email: agencyForm.email.trim() || null,
        paymentsEmail: agencyForm.paymentsEmail.trim() || null,
        npn: agencyForm.npn.trim() || null,
        agencyLicense: agencyForm.agencyLicense.trim() || null,
        ein: agencyForm.ein.trim() || null,
        ownerUids: agencyForm.ownerUids,
        logoUrl: agencyForm.logoUrl,
      };

      if (agencyEdit) {
        let logoUrl = profile.logoUrl;
        if (logoFile) {
          logoUrl = await uploadOrgLogo(agencyEdit.id, logoFile);
        }
        await repo.updateOrgNode({
          id: agencyEdit.id,
          name,
          ...profile,
          logoUrl,
        });
      } else {
        const created = await repo.createOrgNode({
          name,
          type: "agency",
          parentId: agencyForm.parentId,
          ...profile,
        });
        if (created && logoFile) {
          const logoUrl = await uploadOrgLogo(created.id, logoFile);
          await repo.updateOrgNode({ id: created.id, logoUrl });
        }
      }
      setAgencyDrawer(false);
      await Promise.all([
        invalidate.invalidateAgencies(),
        invalidate.invalidateInsights(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  const childType = selected ? suggestedChildType(selected) : null;

  const renderTree = (nodes: TreeNodeState[], depth = 0): ReactNode => (
    <ul
      className={
        depth === 0
          ? "studio-panel divide-y divide-glass-border rounded-2xl"
          : "border-l border-glass-border/60"
      }
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className="flex flex-wrap items-center gap-2 px-3 py-2.5 hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
            style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
          >
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/[0.06]"
              aria-label={node.expanded ? "Collapse" : "Expand"}
              disabled={busy || node.depth >= 7}
              onClick={() => void toggleExpand(node)}
            >
              {node.depth >= 7 ? "·" : node.expanded ? "▾" : "▸"}
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => openNodeDrawer(node)}
            >
              <p className="truncate text-sm font-semibold">{node.name}</p>
              <p className="text-[11px] text-muted">
                {t(`orgType_${node.type}`)} ·{" "}
                {node.active ? t("orgActive") : t("orgInactive")}
              </p>
            </button>
          </div>
          {node.expanded && node.children && node.children.length > 0
            ? renderTree(node.children, depth + 1)
            : null}
          {node.expanded &&
          node.childrenLoaded &&
          node.children?.length === 0 ? (
            <p
              className="px-3 py-2 text-xs text-muted"
              style={{ paddingLeft: `${1.75 + depth * 0.9}rem` }}
            >
              {t("orgNoChildren")}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );

  const agencyColumns = useMemo<ColumnDef<OrgNode, unknown>[]>(
    () => [
      {
        id: "name",
        header: t("orgName"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            {row.original.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.logoUrl}
                alt=""
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/5 text-[10px] font-bold text-muted">
                {row.original.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{row.original.name}</p>
              {row.original.email ? (
                <p className="truncate text-[11px] text-muted">
                  {row.original.email}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: t("rolesBuiltIn"),
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {t(`orgType_${row.original.type}`)}
          </span>
        ),
      },
      {
        id: "status",
        header: t("orgActive"),
        cell: ({ row }) => (
          <StatusBadge tone={row.original.active ? "success" : "danger"}>
            {row.original.active ? t("orgActive") : t("orgInactive")}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="block text-right">{t("colActions")}</span>
        ),
        cell: ({ row }) => {
          const agency = row.original;
          if (!isAdmin) return null;
          return (
            <RowActions>
              <RowActionButton
                variant="secondary"
                onClick={() => openAgencyEdit(agency)}
              >
                {t("usersEdit")}
              </RowActionButton>
              <RowActionButton
                onClick={async () => {
                  setBusy(true);
                  try {
                    await repo.updateOrgNode({
                      id: agency.id,
                      active: !agency.active,
                    });
                    await invalidate.invalidateAgencies();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {agency.active ? t("orgSoftDelete") : t("orgActive")}
              </RowActionButton>
            </RowActions>
          );
        },
      },
    ],
    [t, isAdmin, invalidate, repo],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("orgTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("orgSubtitle")}</p>
        </div>
        {isAdmin && tab === "tree" ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await repo.ensureOrgRoot();
                await refreshTree();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("orgRootSeed")}
          </Button>
        ) : null}
        {isAdmin && tab === "agencies" ? (
          <Button onClick={openAgencyCreate}>{t("orgCreateAgency")}</Button>
        ) : null}
      </header>

      <div className="flex gap-2 border-b border-glass-border pb-2">
        <Button
          variant={tab === "tree" ? "secondary" : "ghost"}
          className="h-9 px-3 text-xs"
          onClick={() => setTab("tree")}
        >
          {t("orgTabTree")}
        </Button>
        <Button
          variant={tab === "agencies" ? "secondary" : "ghost"}
          className="h-9 px-3 text-xs"
          onClick={() => setTab("agencies")}
        >
          {t("orgTabAgencies")}
        </Button>
      </div>

      {tab === "tree" ? (
        rootsQuery.isLoading && roots.length === 0 ? (
          <OrgTreeSkeleton />
        ) : roots.length === 0 ? (
          <p className="text-sm text-muted">{t("orgEmpty")}</p>
        ) : (
          renderTree(roots)
        )
      ) : (
        <>
          {bulkMessage ? (
            <p className="text-sm text-muted" role="status">
              {bulkMessage}
            </p>
          ) : null}
          <DataTable
            columns={agencyColumns}
            data={agencies}
            loading={agenciesQuery.isLoading}
            isFetching={agenciesQuery.isFetching}
            emptyTitle={t("orgAgenciesEmpty")}
            getRowId={(row) => row.id}
            enableRowSelection={isAdmin}
            rowSelection={agencySelection}
            onRowSelectionChange={(updater) => {
              setAgencySelection((prev) => {
                const next =
                  typeof updater === "function" ? updater(prev) : updater;
                return clampSelection(next);
              });
            }}
            bulkBar={
              isAdmin ? (
                <BulkBarShell
                  selectedCount={selectedAgencyIds.length}
                  selectedLabel={t("bulkSelectedLabel")}
                  maxHint={
                    selectedAgencyIds.length >= BULK_MAX_SELECTED
                      ? t("bulkMaxSelected", { max: BULK_MAX_SELECTED })
                      : null
                  }
                  busy={bulkBusy}
                  busyLabel={t("bulkBusy")}
                  clearLabel={t("bulkClear")}
                  onClear={() => setAgencySelection({})}
                >
                  <BulkActionButton
                    variant="primary"
                    disabled={bulkBusy}
                    onClick={() => void runAgencyBulk(true)}
                  >
                    {t("bulkActivate")}
                  </BulkActionButton>
                  <BulkActionButton
                    variant="danger"
                    disabled={bulkBusy}
                    onClick={() => void runAgencyBulk(false)}
                  >
                    {t("bulkDeactivate")}
                  </BulkActionButton>
                </BulkBarShell>
              ) : undefined
            }
            pageSize={agencyPageSize}
            canPreviousPage={agencyStack.length > 1}
            canNextPage={Boolean(agencyNext)}
            onPreviousPage={() => {
              setAgencyStack((s) => {
                if (s.length <= 1) return s;
                const next = s.slice(0, -1);
                setAgencyToken(next[next.length - 1] ?? null);
                return next;
              });
            }}
            onNextPage={() => {
              if (!agencyNext) return;
              setAgencyStack((s) => [...s, agencyNext]);
              setAgencyToken(agencyNext);
            }}
            onPageSizeChange={setAgencyPageSize}
            previousLabel={t("usersPrev")}
            nextLabel={t("usersNext")}
            rowsLabel={t("tableRows")}
            toolbar={
              <>
                <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t("usersSearchLabel")}
                  </span>
                  <SearchInput
                    value={agencyQuery}
                    onChange={(e) => setAgencyQuery(e.target.value)}
                    placeholder={t("orgAgencySearch")}
                    aria-label={t("orgAgencySearch")}
                  />
                </label>
                <label className="mb-2.5 flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                  {t("orgShowInactive")}
                </label>
              </>
            }
          />
        </>
      )}

      <Drawer
        open={drawerOpen && Boolean(selected)}
        title={selected?.name ?? ""}
        subtitle={
          selected
            ? `${t(`orgType_${selected.type}`)} · depth ${selected.depth}`
            : undefined
        }
        onClose={() => setDrawerOpen(false)}
        footer={
          isAdmin && selected ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (!selected) return;
                  setBusy(true);
                  try {
                    await repo.updateOrgNode({
                      id: selected.id,
                      active: !selected.active,
                    });
                    setDrawerOpen(false);
                    await refreshTree();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {selected.active ? t("orgInactive") : t("orgActive")}
              </Button>
              <Button
                disabled={busy || !editName.trim()}
                onClick={async () => {
                  if (!selected) return;
                  setBusy(true);
                  try {
                    await repo.updateOrgNode({
                      id: selected.id,
                      name: editName.trim(),
                    });
                    setDrawerOpen(false);
                    await refreshTree();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("usersSave")}
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected && isAdmin ? (
          <div className="space-y-4">
            <div>
              <Label>{t("orgName")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            {childType ? (
              <div className="space-y-2 border-t border-glass-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {t("orgAddChild")} · {t(`orgType_${childType}`)}
                </p>
                <Input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder={t("orgName")}
                />
                <Button
                  className="w-full"
                  disabled={busy || !childName.trim()}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await repo.createOrgNode({
                        name: childName.trim(),
                        type: childType,
                        parentId: selected.id,
                      });
                      setChildName("");
                      setDrawerOpen(false);
                      await Promise.all([
                        refreshTree(),
                        invalidate.invalidateInsights(),
                      ]);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("orgCreate")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("orgViewOnly")}</p>
        )}
      </Drawer>

      <Drawer
        open={agencyDrawer}
        title={agencyEdit ? t("orgEditAgency") : t("orgCreateAgency")}
        onClose={() => setAgencyDrawer(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAgencyDrawer(false)}>
              {t("orgCancel")}
            </Button>
            <Button
              disabled={
                busy ||
                !agencyForm.name.trim() ||
                (!agencyEdit && !agencyForm.parentId)
              }
              onClick={() => void saveAgency()}
            >
              {t("usersSave")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>{t("orgName")}</Label>
            <Input
              value={agencyForm.name}
              onChange={(e) =>
                setAgencyForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>
          {!agencyEdit ? (
            <div>
              <Label>{t("orgParentRegion")}</Label>
              <p className="mb-1 text-[11px] text-muted">{t("orgParentHint")}</p>
              <select
                className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink"
                value={agencyForm.parentId}
                onChange={(e) =>
                  setAgencyForm((f) => ({ ...f, parentId: e.target.value }))
                }
              >
                <option value="">{t("none")}</option>
                {parentOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.type === "organization"
                      ? `${r.name} (${t("orgType_organization")})`
                      : r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <Label>{t("orgLogo")}</Label>
            <div className="mt-1 flex items-center gap-3">
              {agencyForm.logoUrl || logoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    logoFile
                      ? URL.createObjectURL(logoFile)
                      : (agencyForm.logoUrl ?? "")
                  }
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-xs text-muted">
                  —
                </span>
              )}
              <label className="cursor-pointer text-sm font-medium text-brand">
                {t("orgLogoUpload")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setLogoFile(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>{t("orgEmail")}</Label>
            <Input
              type="email"
              value={agencyForm.email}
              onChange={(e) =>
                setAgencyForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>{t("orgPaymentsEmail")}</Label>
            <Input
              type="email"
              value={agencyForm.paymentsEmail}
              onChange={(e) =>
                setAgencyForm((f) => ({
                  ...f,
                  paymentsEmail: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label>{t("orgNpn")}</Label>
            <Input
              value={agencyForm.npn}
              onChange={(e) =>
                setAgencyForm((f) => ({ ...f, npn: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>{t("orgAgencyLicense")}</Label>
            <Input
              value={agencyForm.agencyLicense}
              onChange={(e) =>
                setAgencyForm((f) => ({
                  ...f,
                  agencyLicense: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label>{t("orgEin")}</Label>
            <Input
              value={agencyForm.ein}
              onChange={(e) =>
                setAgencyForm((f) => ({ ...f, ein: e.target.value }))
              }
              placeholder="XX-XXXXXXX"
            />
          </div>

          <div className="space-y-2 border-t border-glass-border pt-3">
            <Label>{t("orgOwners")}</Label>
            {agencyForm.ownerUids.length === 0 ? (
              <p className="text-xs text-muted">{t("orgOwnersEmpty")}</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {agencyForm.ownerUids.map((uid) => (
                  <li
                    key={uid}
                    className="flex items-center gap-1 rounded-full border border-glass-border bg-sheet px-2.5 py-1 text-xs"
                  >
                    <span className="max-w-[10rem] truncate">
                      {agencyForm.ownerLabels[uid] ?? uid.slice(0, 8)}
                    </span>
                    <button
                      type="button"
                      className="text-muted hover:text-ink"
                      aria-label="Remove"
                      onClick={() =>
                        setAgencyForm((f) => ({
                          ...f,
                          ownerUids: f.ownerUids.filter((id) => id !== uid),
                        }))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {agencyForm.ownerUids.length < ORG_OWNER_UIDS_CAP ? (
              <>
                <SearchInput
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder={t("orgOwnersSearch")}
                  aria-label={t("orgOwnersSearch")}
                />
                {ownerHits.length > 0 ? (
                  <ul className="max-h-40 overflow-auto rounded-xl border border-glass-border">
                    {ownerHits
                      .filter((u) => !agencyForm.ownerUids.includes(u.uid))
                      .map((u) => {
                        const label =
                          u.displayName?.trim() ||
                          u.email?.trim() ||
                          u.uid.slice(0, 8);
                        return (
                          <li key={u.uid}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-ink/[0.04]"
                              onClick={() => {
                                setAgencyForm((f) => ({
                                  ...f,
                                  ownerUids: [...f.ownerUids, u.uid],
                                  ownerLabels: {
                                    ...f.ownerLabels,
                                    [u.uid]: label,
                                  },
                                }));
                                setOwnerSearch("");
                                setOwnerHits([]);
                              }}
                            >
                              <span className="font-medium">{label}</span>
                              {u.email ? (
                                <span className="text-[11px] text-muted">
                                  {u.email}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
