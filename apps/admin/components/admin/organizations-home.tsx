"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { OrgNode } from "@pulse/shared";
import { canManagePlatform } from "@/lib/roles";
import {
  BULK_MAX_SELECTED,
  clampSelection,
  formatBulkOutcome,
  selectedIdsFromState,
} from "@/lib/bulk-selection";
import { useAccess } from "@/lib/providers/auth-provider";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { ORG_DEPTH_TYPE, type OrgNodeType } from "@/lib/types";
import { Button, Input, Label, SearchInput } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/drawer";
import { DataTable } from "@/components/ui/data-table";
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
  useOrgNodesByTypeQuery,
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
  const [agencyName, setAgencyName] = useState("");
  const [agencyParentId, setAgencyParentId] = useState("");
  const [agencySelection, setAgencySelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const regionsQuery = useOrgNodesByTypeQuery(
    "region",
    200,
    tab === "agencies" || agencyDrawer,
  );
  const regions = regionsQuery.data ?? [];
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

  // Prefetch first-level children so expanding roots feels instant.
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
        [node.id]: { ...prev[node.id], expanded: false, children: prev[node.id]?.children },
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

  const childType: OrgNodeType | null = selected
    ? selected.depth < 7
      ? ORG_DEPTH_TYPE[(selected.depth + 1) as 2 | 3 | 4 | 5 | 6 | 7]
      : null
    : null;

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
              style={{ paddingLeft: `${1.6 + depth * 0.9}rem` }}
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
          <span className="font-semibold">{row.original.name}</span>
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
                onClick={() => {
                  setAgencyEdit(agency);
                  setAgencyName(agency.name);
                  setAgencyDrawer(true);
                }}
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
          <Button
            onClick={() => {
              setAgencyEdit(null);
              setAgencyName("");
              setAgencyParentId(regions[0]?.id ?? "");
              setAgencyDrawer(true);
            }}
          >
            {t("orgCreateAgency")}
          </Button>
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
                <>
                  <span className="text-sm font-semibold text-ink">
                    {t("bulkSelected", { count: selectedAgencyIds.length })}
                  </span>
                  {selectedAgencyIds.length >= BULK_MAX_SELECTED ? (
                    <span className="text-xs text-muted">
                      {t("bulkMaxSelected", { max: BULK_MAX_SELECTED })}
                    </span>
                  ) : null}
                  <Button
                    className="h-8 px-3 text-xs"
                    disabled={bulkBusy}
                    onClick={() => void runAgencyBulk(true)}
                  >
                    {t("bulkActivate")}
                  </Button>
                  <Button
                    variant="danger"
                    className="h-8 px-3 text-xs"
                    disabled={bulkBusy}
                    onClick={() => void runAgencyBulk(false)}
                  >
                    {t("bulkDeactivate")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs"
                    disabled={bulkBusy}
                    onClick={() => setAgencySelection({})}
                  >
                    {t("bulkClear")}
                  </Button>
                  {bulkBusy ? (
                    <span className="text-xs text-muted">{t("bulkBusy")}</span>
                  ) : null}
                </>
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
                !agencyName.trim() ||
                (!agencyEdit && !agencyParentId)
              }
              onClick={async () => {
                setBusy(true);
                try {
                  if (agencyEdit) {
                    await repo.updateOrgNode({
                      id: agencyEdit.id,
                      name: agencyName.trim(),
                    });
                  } else {
                    await repo.createOrgNode({
                      name: agencyName.trim(),
                      type: "agency",
                      parentId: agencyParentId,
                    });
                  }
                  setAgencyDrawer(false);
                  await Promise.all([
                    invalidate.invalidateAgencies(),
                    invalidate.invalidateInsights(),
                  ]);
                } finally {
                  setBusy(false);
                }
              }}
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
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
            />
          </div>
          {!agencyEdit ? (
            <div>
              <Label>{t("orgParentRegion")}</Label>
              <select
                className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink"
                value={agencyParentId}
                onChange={(e) => setAgencyParentId(e.target.value)}
              >
                <option value="">{t("none")}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
