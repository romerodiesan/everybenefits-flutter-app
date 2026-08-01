"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listUsersForAdmin,
  updateOrgNode,
} from "@/lib/firebase/functions";
import { headlineName } from "@pulse/shared";
import type { AdminOrgNode, UserProfile } from "@/lib/types";
import { Button, Input } from "@pulse/ui";

export function OrgDetailPanel({
  node,
  isAdmin,
  busy,
  setBusy,
  onUpdated,
}: {
  node: AdminOrgNode | null;
  isAdmin: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onUpdated: () => Promise<void>;
}) {
  const t = useTranslations();
  const [nameDraft, setNameDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState<string[]>([]);
  const [directory, setDirectory] = useState<UserProfile[]>([]);
  const [directoryCursor, setDirectoryCursor] = useState<string | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    setNameDraft(node.name);
    setOwnerDraft(node.managerUids);
    setMsg(null);
  }, [node]);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedQuery(directoryQuery.trim()),
      300,
    );
    return () => window.clearTimeout(id);
  }, [directoryQuery]);

  const loadDirectory = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      if (!node || !isAdmin) return;
      setDirectoryLoading(true);
      try {
        const page = await listUsersForAdmin({
          query: debouncedQuery || undefined,
          limit: 40,
          cursor: opts?.cursor ?? null,
        });
        setDirectory((prev) =>
          opts?.append ? [...prev, ...page.users] : page.users,
        );
        setDirectoryCursor(page.nextCursor);
      } finally {
        setDirectoryLoading(false);
      }
    },
    [debouncedQuery, isAdmin, node],
  );

  useEffect(() => {
    if (!node || !isAdmin) {
      setDirectory([]);
      setDirectoryCursor(null);
      return;
    }
    void loadDirectory();
  }, [node, isAdmin, loadDirectory]);

  if (!node) {
    return (
      <aside className="admin-panel rounded-2xl p-4 text-sm text-muted">
        {t("orgSelectNode")}
      </aside>
    );
  }

  const isRoot = node.type === "organization";
  const typeKey =
    node.type === "organization"
      ? "orgType_organization"
      : node.type === "agency"
        ? "orgType_agency"
        : "orgType_sub_agency";

  return (
    <aside className="admin-panel space-y-4 rounded-2xl p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t(typeKey)}
        </p>
        <h2 className="font-display text-xl font-bold">{node.name}</h2>
        <p className="text-xs text-muted">{t("orgOwnersHint")}</p>
      </div>

      {isAdmin ? (
        <>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {t("orgName")}
            </p>
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <Button
              className="mt-2"
              disabled={busy || !nameDraft.trim() || nameDraft.trim() === node.name}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  await updateOrgNode({ id: node.id, name: nameDraft.trim() });
                  await onUpdated();
                  setMsg(t("orgSaved"));
                } catch (err) {
                  setMsg(
                    err instanceof Error ? err.message : t("errorGeneric"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("orgSaveName")}
            </Button>
          </div>

          {!isRoot ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  await updateOrgNode({ id: node.id, active: !node.active });
                  await onUpdated();
                } catch (err) {
                  setMsg(
                    err instanceof Error ? err.message : t("errorGeneric"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {node.active ? t("orgInactive") : t("orgActive")}
            </Button>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t("orgOwners")}
            </p>
            <Input
              value={directoryQuery}
              onChange={(e) => setDirectoryQuery(e.target.value)}
              placeholder={t("orgSearchDirectory")}
              className="mb-2"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {directoryLoading && directory.length === 0 ? (
                <p className="text-xs text-muted">{t("loading")}</p>
              ) : (
                directory.map((user) => {
                  const checked = ownerDraft.includes(user.uid);
                  return (
                    <label
                      key={user.uid}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setOwnerDraft((prev) =>
                            checked
                              ? prev.filter((id) => id !== user.uid)
                              : [...prev, user.uid],
                          );
                        }}
                      />
                      <span className="truncate">{headlineName(user)}</span>
                    </label>
                  );
                })
              )}
            </div>
            {directoryCursor ? (
              <Button
                variant="ghost"
                className="mt-1 h-8 px-2 text-xs"
                disabled={directoryLoading}
                onClick={() =>
                  void loadDirectory({
                    append: true,
                    cursor: directoryCursor,
                  })
                }
              >
                {t("tableLoadMore")}
              </Button>
            ) : null}
            <Button
              className="mt-2"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  await updateOrgNode({
                    id: node.id,
                    managerUids: ownerDraft,
                  });
                  await onUpdated();
                  setMsg(t("orgSaved"));
                } catch (err) {
                  setMsg(
                    err instanceof Error ? err.message : t("errorGeneric"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("orgSaveOwners")}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">{t("orgViewOnly")}</p>
      )}

      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </aside>
  );
}
