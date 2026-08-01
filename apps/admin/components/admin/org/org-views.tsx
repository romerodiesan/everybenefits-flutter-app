"use client";

import type { AdminOrgNode } from "@/lib/types";
import { Button } from "@pulse/ui";

export function OrgNodeCard({
  node,
  selected,
  onSelect,
  typeLabel,
  compact,
}: {
  node: AdminOrgNode;
  selected: boolean;
  onSelect: (id: string) => void;
  typeLabel: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={`min-w-[9.5rem] max-w-[14rem] rounded-xl border px-3 py-2.5 text-left transition ${
        selected
          ? "border-brand bg-brand/10 shadow-sm"
          : "border-glass-border bg-sheet hover:border-brand/40"
      } ${!node.active ? "opacity-50" : ""} ${compact ? "py-2" : ""}`}
    >
      <p className="truncate text-sm font-semibold text-ink">{node.name}</p>
      <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-muted">
        {typeLabel}
      </p>
    </button>
  );
}

export function OrgTableView({
  root,
  agencies,
  childrenByParent,
  selectedId,
  onSelect,
  onAddChild,
  isAdmin,
  labels,
}: {
  root: AdminOrgNode | null;
  agencies: AdminOrgNode[];
  childrenByParent: Map<string, AdminOrgNode[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parent: AdminOrgNode) => void;
  isAdmin: boolean;
  labels: {
    root: string;
    agency: string;
    subAgency: string;
    active: string;
    inactive: string;
    addAgency: string;
    addSubAgency: string;
    empty: string;
  };
}) {
  if (!root && agencies.length === 0) {
    return <p className="text-sm text-muted">{labels.empty}</p>;
  }

  const rows: Array<{
    node: AdminOrgNode;
    indent: number;
    col: "root" | "agency" | "sub";
  }> = [];
  if (root) rows.push({ node: root, indent: 0, col: "root" });
  for (const agency of agencies) {
    rows.push({ node: agency, indent: 1, col: "agency" });
    for (const sub of childrenByParent.get(agency.id) ?? []) {
      rows.push({ node: sub, indent: 2, col: "sub" });
    }
  }

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-glass-border text-[11px] uppercase tracking-[0.12em] text-muted">
            <th className="px-4 py-2.5 font-bold">{labels.root}</th>
            <th className="px-4 py-2.5 font-bold">{labels.agency}</th>
            <th className="px-4 py-2.5 font-bold">{labels.subAgency}</th>
            <th className="px-4 py-2.5 font-bold">{labels.active}</th>
            <th className="px-4 py-2.5 text-right font-bold"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, col }) => {
            const selected = selectedId === node.id;
            return (
              <tr
                key={node.id}
                className={`cursor-pointer border-b border-glass-border last:border-0 ${
                  selected ? "bg-brand/5" : "hover:bg-white/[0.03]"
                }`}
                onClick={() => onSelect(node.id)}
              >
                <td className="px-4 py-3 font-semibold">
                  {col === "root" ? node.name : ""}
                </td>
                <td className="px-4 py-3">
                  {col === "agency" ? (
                    <span className="font-medium">{node.name}</span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {col === "sub" ? node.name : ""}
                </td>
                <td className="px-4 py-3 text-muted">
                  {node.active ? labels.active : labels.inactive}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && col === "root" ? (
                    <Button
                      variant="secondary"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(node);
                      }}
                    >
                      {labels.addAgency}
                    </Button>
                  ) : null}
                  {isAdmin && col === "agency" ? (
                    <Button
                      variant="secondary"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(node);
                      }}
                    >
                      {labels.addSubAgency}
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OrgDiagramView({
  root,
  agencies,
  childrenByParent,
  selectedId,
  onSelect,
  onAddChild,
  isAdmin,
  labels,
}: {
  root: AdminOrgNode | null;
  agencies: AdminOrgNode[];
  childrenByParent: Map<string, AdminOrgNode[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parent: AdminOrgNode) => void;
  isAdmin: boolean;
  labels: {
    organization: string;
    agency: string;
    subAgency: string;
    addAgency: string;
    addSubAgency: string;
    empty: string;
  };
}) {
  if (!root && agencies.length === 0) {
    return <p className="text-sm text-muted">{labels.empty}</p>;
  }

  return (
    <div className="overflow-auto rounded-2xl border border-glass-border bg-ink/[0.02] p-6 dark:bg-white/[0.02]">
      <div className="mx-auto flex min-w-max flex-col items-center gap-0">
        {root ? (
          <div className="flex flex-col items-center">
            <OrgNodeCard
              node={root}
              selected={selectedId === root.id}
              onSelect={onSelect}
              typeLabel={labels.organization}
            />
            {isAdmin ? (
              <Button
                variant="ghost"
                className="mt-2 h-8 px-3 text-xs"
                onClick={() => onAddChild(root)}
              >
                {labels.addAgency}
              </Button>
            ) : null}
            {agencies.length > 0 ? (
              <div className="mt-2 h-6 w-px bg-glass-border" aria-hidden />
            ) : null}
          </div>
        ) : null}

        {agencies.length > 0 ? (
          <div className="relative flex items-start justify-center gap-8 pt-2">
            {agencies.length > 1 ? (
              <div
                className="absolute left-[12%] right-[12%] top-0 h-px bg-glass-border"
                aria-hidden
              />
            ) : null}
            {agencies.map((agency) => {
              const subs = childrenByParent.get(agency.id) ?? [];
              return (
                <div
                  key={agency.id}
                  className="relative flex flex-col items-center"
                >
                  <div className="h-2 w-px bg-glass-border" aria-hidden />
                  <OrgNodeCard
                    node={agency}
                    selected={selectedId === agency.id}
                    onSelect={onSelect}
                    typeLabel={labels.agency}
                  />
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      className="mt-1.5 h-7 px-2 text-[11px]"
                      onClick={() => onAddChild(agency)}
                    >
                      {labels.addSubAgency}
                    </Button>
                  ) : null}
                  {subs.length > 0 ? (
                    <>
                      <div
                        className="mt-1 h-4 w-px bg-glass-border"
                        aria-hidden
                      />
                      {subs.length > 1 ? (
                        <div
                          className="mb-0 h-px w-[70%] bg-glass-border"
                          aria-hidden
                        />
                      ) : null}
                      <div className="mt-0 flex items-start gap-3 pt-2">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex flex-col items-center"
                          >
                            <div
                              className="mb-2 h-2 w-px bg-glass-border"
                              aria-hidden
                            />
                            <OrgNodeCard
                              node={sub}
                              selected={selectedId === sub.id}
                              onSelect={onSelect}
                              typeLabel={labels.subAgency}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
