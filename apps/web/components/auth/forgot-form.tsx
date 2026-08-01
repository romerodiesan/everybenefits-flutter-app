"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@pulse/ui";
import { resetPassword } from "@/lib/firebase/auth";

export function ForgotForm() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <h1 className="font-display text-3xl font-bold">{t("forgotTitle")}</h1>
        <p className="mt-2 text-muted">{t("forgotSubtitle")}</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("email")}</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {sent && (
            <p className="text-sm text-brand">{t("resetLinkSent")}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("sendReset")}
          </Button>
        </form>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-brand hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </Panel>
    </div>
  );
}
