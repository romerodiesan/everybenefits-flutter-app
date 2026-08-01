"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import {
  adminSendNotification,
  listOrgSubtreeCached,
} from "@/lib/firebase/functions";
import { canManagePlatform } from "@pulse/shared";
import { useAuth } from "@/lib/providers/auth-provider";
import { ALL_ROLES, type AdminOrgNode, type UserRole } from "@/lib/types";
import { Button, Input } from "@pulse/ui";

const ROLE_KEYS: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
};

type Audience = "all" | "role" | "org" | "uids";

export function NotificationsHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("/notifications");
  const [audience, setAudience] = useState<Audience>("all");
  const [role, setRole] = useState<UserRole>("agent");
  const [orgNodeId, setOrgNodeId] = useState("");
  const [uidCsv, setUidCsv] = useState("");
  const [nodes, setNodes] = useState<AdminOrgNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted">{t("notifyAdminsOnly")}</p>
      </div>
    );
  }

  async function ensureNodes() {
    if (nodes.length) return;
    setNodes(await listOrgSubtreeCached(null));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const uids =
        audience === "uids"
          ? uidCsv
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      const res = await adminSendNotification({
        title: title.trim(),
        body: body.trim(),
        href: href.trim() || "/notifications",
        audience,
        role: audience === "role" ? role : undefined,
        orgNodeId: audience === "org" ? orgNodeId : undefined,
        uids,
      });
      setResult(
        t("notifySent", {
          sent: res.sent,
          failed: res.failed,
          total: res.total,
        }),
      );
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("notifyTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("notifySubtitle")}</p>
      </header>

      <form onSubmit={onSubmit} className="admin-panel space-y-4 rounded-2xl p-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notifyTitleField")}
          </p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notifyBodyField")}
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-glass-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notifyHrefField")}
          </p>
          <Input value={href} onChange={(e) => setHref(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notifyAudience")}
          </p>
          <select
            value={audience}
            onChange={(e) => {
              const next = e.target.value as Audience;
              setAudience(next);
              if (next === "org") void ensureNodes();
            }}
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
          >
            <option value="all">{t("notifyAudienceAll")}</option>
            <option value="role">{t("notifyAudienceRole")}</option>
            <option value="org">{t("notifyAudienceOrg")}</option>
            <option value="uids">{t("notifyAudienceUids")}</option>
          </select>
        </div>
        {audience === "role" ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
          >
            {ALL_ROLES.filter((r) => r !== "guest").map((r) => (
              <option key={r} value={r}>
                {t(ROLE_KEYS[r])}
              </option>
            ))}
          </select>
        ) : null}
        {audience === "org" ? (
          <select
            value={orgNodeId}
            onChange={(e) => setOrgNodeId(e.target.value)}
            className="h-10 w-full rounded-xl border border-glass-border bg-transparent px-3 text-sm"
            required
          >
            <option value="">{t("notifyPickOrg")}</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {"—".repeat(Math.max(0, n.depth - 1))} {n.name}
              </option>
            ))}
          </select>
        ) : null}
        {audience === "uids" ? (
          <textarea
            value={uidCsv}
            onChange={(e) => setUidCsv(e.target.value)}
            placeholder={t("notifyUidsPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-glass-border bg-transparent px-3 py-2 text-sm"
            required
          />
        ) : null}
        <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>
          {busy ? t("notifySending") : t("notifySend")}
        </Button>
        {result ? <p className="text-sm text-emerald-400">{result}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </div>
  );
}
