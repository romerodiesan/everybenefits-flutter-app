"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createAgency,
  createOrgNode,
  ensureOrgRoot,
  invalidateOrgSubtreeCache,
  listOrgSubtreeCached,
  repairOrgTree,
} from "@/lib/firebase/functions";
import { canManagePlatform } from "@pulse/shared";
import { useAuth } from "@/lib/providers/auth-provider";
import type { AdminOrgNode } from "@/lib/types";
import { Button, Input } from "@pulse/ui";
import { OrgDetailPanel } from "@/components/admin/org/org-detail-panel";
import {
  OrgDiagramView,
  OrgTableView,
} from "@/components/admin/org/org-views";

type ViewMode = "table" | "diagram";

const LIVE_TYPES = new Set(["organization", "agency", "sub_agency"]);

export function OrganizationsHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const [nodes, setNodes] = useState<AdminOrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewMode>("diagram");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createParent, setCreateParent] = useState<AdminOrgNode | null>(null);
  const [createName, setCreateName] = useState("");
  const [agencyQuickName, setAgencyQuickName] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      invalidateOrgSubtreeCache();
      setNodes(await listOrgSubtreeCached(null, { force: true }));
    } finally {
      setLoading(false);
      setReady(true);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const live = useMemo(
    () => nodes.filter((n) => LIVE_TYPES.has(n.type as string)),
    [nodes],
  );

  const root = useMemo(
    () => live.find((n) => n.type === "organization") ?? null,
    [live],
  );

  const agencies = useMemo(() => {
    const list = live.filter((n) => n.type === "agency");
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [live]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminOrgNode[]>();
    for (const n of live) {
      if (n.type !== "sub_agency" || !n.parentId) continue;
      const list = map.get(n.parentId) ?? [];
      list.push(n);
      map.set(n.parentId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [live]);

  const selected =
    selectedId != null
      ? nodes.find((n) => n.id === selectedId) ?? null
      : null;

  const beginCreate = (parent: AdminOrgNode) => {
    setCreateParent(parent);
    setCreateName("");
  };

  const submitCreate = async () => {
    if (!createParent || !createName.trim()) return;
    setBusy(true);
    try {
      if (createParent.type === "organization") {
        await createAgency(createName.trim());
      } else if (createParent.type === "agency") {
        await createOrgNode({
          name: createName.trim(),
          type: "sub_agency",
          parentId: createParent.id,
        });
      }
      setCreateParent(null);
      setCreateName("");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("orgTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("orgSubtitle")}</p>
        </div>
        <div className="flex rounded-xl border border-glass-border p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === "table"
                ? "bg-brand text-on-brand"
                : "text-muted hover:text-ink"
            }`}
            onClick={() => setView("table")}
          >
            {t("orgViewTable")}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === "diagram"
                ? "bg-brand text-on-brand"
                : "text-muted hover:text-ink"
            }`}
            onClick={() => setView("diagram")}
          >
            {t("orgViewDiagram")}
          </button>
        </div>
      </header>

      {isAdmin ? (
        <div className="flex flex-wrap items-end gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await ensureOrgRoot();
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("orgRootSeed")}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await repairOrgTree();
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("orgRepair")}
          </Button>
          <div className="flex min-w-[14rem] flex-1 gap-2">
            <Input
              value={agencyQuickName}
              onChange={(e) => setAgencyQuickName(e.target.value)}
              placeholder={t("orgAddAgency")}
            />
            <Button
              disabled={busy || !agencyQuickName.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await createAgency(agencyQuickName.trim());
                  setAgencyQuickName("");
                  await reload();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("orgCreate")}
            </Button>
          </div>
        </div>
      ) : null}

      {createParent ? (
        <div className="admin-panel flex flex-wrap items-end gap-2 rounded-2xl p-4">
          <div className="min-w-[12rem] flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {createParent.type === "organization"
                ? t("orgAddAgency")
                : t("orgAddSubAgency")}{" "}
              → {createParent.name}
            </p>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("orgName")}
              autoFocus
            />
          </div>
          <Button
            disabled={busy || !createName.trim()}
            onClick={() => void submitCreate()}
          >
            {t("orgCreate")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setCreateParent(null);
              setCreateName("");
            }}
          >
            {t("orgCancel")}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div
          className={`min-h-[16rem] transition-opacity ${
            loading ? "opacity-60" : "opacity-100"
          }`}
        >
          {!ready ? (
            <p className="text-sm text-muted">{t("loading")}</p>
          ) : view === "table" ? (
            <OrgTableView
              root={root}
              agencies={agencies}
              childrenByParent={childrenByParent}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={beginCreate}
              isAdmin={isAdmin}
              labels={{
                root: t("orgColRoot"),
                agency: t("orgColAgency"),
                subAgency: t("orgColSubAgency"),
                active: t("orgActive"),
                inactive: t("orgInactive"),
                addAgency: t("orgAddAgencyShort"),
                addSubAgency: t("orgAddSubAgencyShort"),
                empty: t("orgEmpty"),
              }}
            />
          ) : (
            <OrgDiagramView
              root={root}
              agencies={agencies}
              childrenByParent={childrenByParent}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={beginCreate}
              isAdmin={isAdmin}
              labels={{
                organization: t("orgType_organization"),
                agency: t("orgType_agency"),
                subAgency: t("orgType_sub_agency"),
                addAgency: t("orgAddAgencyShort"),
                addSubAgency: t("orgAddSubAgencyShort"),
                empty: t("orgEmpty"),
              }}
            />
          )}
        </div>

        <OrgDetailPanel
          node={
            selected && LIVE_TYPES.has(selected.type as string)
              ? selected
              : null
          }
          isAdmin={isAdmin}
          busy={busy}
          setBusy={setBusy}
          onUpdated={reload}
        />
      </div>
    </div>
  );
}
