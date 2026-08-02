"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { canManagePlatform } from "@/lib/roles";
import { useAuth } from "@/lib/providers/auth-provider";
import { useOrgTree } from "@/lib/hooks/use-org-tree";
import { ORG_DEPTH_TYPE, type OrgNodeType } from "@/lib/types";
import { Button, Input } from "@/components/ui/primitives";

export function OrganizationsHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const { nodes, loading, reload, ensureRoot, createNode, updateNode } =
    useOrgTree();
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () =>
      [...nodes].sort((a, b) => {
        const pathA = a.path.join("/");
        const pathB = b.path.join("/");
        return pathA.localeCompare(pathB);
      }),
    [nodes],
  );

  const parent = parentId ? nodes.find((n) => n.id === parentId) : null;
  const childType: OrgNodeType | null = parent
    ? parent.depth < 7
      ? ORG_DEPTH_TYPE[(parent.depth + 1) as 2 | 3 | 4 | 5 | 6 | 7]
      : null
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("orgTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("orgSubtitle")}</p>
        </div>
        {isAdmin ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await ensureRoot();
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("orgRootSeed")}
          </Button>
        ) : null}
      </header>

      {isAdmin && childType && parent ? (
        <div className="studio-panel flex flex-wrap items-end gap-2 rounded-2xl p-4">
          <div className="min-w-[12rem] flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {t("orgAddChild")} · {t(`orgType_${childType}`)} under {parent.name}
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("orgName")}
            />
          </div>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await createNode({
                  name: name.trim(),
                  type: childType,
                  parentId: parent.id,
                });
                setName("");
                setParentId(null);
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("orgCreate")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setParentId(null);
              setName("");
            }}
          >
            {t("orgCancel")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted">{t("orgEmpty")}</p>
      ) : (
        <ul className="studio-panel divide-y divide-glass-border rounded-2xl">
          {sorted.map((node) => (
            <li
              key={node.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
              style={{ paddingLeft: `${0.75 + (node.depth - 1) * 1.1}rem` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{node.name}</p>
                <p className="text-xs text-muted">
                  {t(`orgType_${node.type}`)} · depth {node.depth} ·{" "}
                  {node.active ? t("orgActive") : t("orgInactive")}
                </p>
              </div>
              {isAdmin && node.depth < 7 ? (
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => setParentId(node.id)}
                >
                  {t("orgAddChild")}
                </Button>
              ) : null}
              {isAdmin ? (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await updateNode({
                        id: node.id,
                        active: !node.active,
                      });
                      await reload();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {node.active ? t("orgInactive") : t("orgActive")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
