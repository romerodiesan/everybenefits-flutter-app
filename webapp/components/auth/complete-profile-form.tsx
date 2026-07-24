"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import { useAuth } from "@/lib/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/users";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import { DEFAULT_AGENCY, type UserRole } from "@/lib/types";

export function CompleteProfileForm() {
  const t = useTranslations();
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [role, setRole] = useState<"student" | "agent">("student");
  const [displayName, setDisplayName] = useState("");
  const [npn, setNpn] = useState("");
  const [agency, setAgency] = useState(DEFAULT_AGENCY);
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile?.profileCompleted || profile?.isAnonymous) {
      router.replace("/home");
    }
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [loading, user, profile, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const nextRole: UserRole = role;
      await updateUserProfile(profile, {
        displayName: displayName.trim() || profile.displayName,
        role: nextRole,
        profileCompleted: true,
        npn: role === "agent" ? npn.trim() : null,
        agency: role === "agent" ? agency.trim() || DEFAULT_AGENCY : DEFAULT_AGENCY,
        addressStreet: role === "agent" ? street.trim() : null,
        addressApt: role === "agent" ? apt.trim() : null,
        addressCity: role === "agent" ? city.trim() : null,
        addressState: role === "agent" ? state.trim().toUpperCase() : null,
        addressZip: role === "agent" ? zip.trim() : null,
      });
      if (role === "agent") {
        await ensureDefaultAgentGroup().catch(() => undefined);
      }
      await refreshProfile();
      router.replace("/home");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center text-muted">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-lg">
        <h1 className="font-display text-3xl font-bold">
          {t("completeProfileTitle")}
        </h1>
        <p className="mt-2 text-muted">{t("completeProfileSubtitle")}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("displayName")}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-2xl border p-4 text-left transition ${
                role === "student"
                  ? "border-brand bg-brand/15"
                  : "border-glass-border"
              }`}
            >
              <p className="font-display font-bold">{t("chooseStudent")}</p>
              <p className="mt-1 text-sm text-muted">{t("roleStudent")}</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("agent")}
              className={`rounded-2xl border p-4 text-left transition ${
                role === "agent"
                  ? "border-brand bg-brand/15"
                  : "border-glass-border"
              }`}
            >
              <p className="font-display font-bold">{t("chooseAgent")}</p>
              <p className="mt-1 text-sm text-muted">{t("roleAgent")}</p>
            </button>
          </div>

          {role === "agent" && (
            <div className="space-y-4 border-t border-glass-border pt-4">
              <div>
                <Label>{t("npn")}</Label>
                <Input value={npn} onChange={(e) => setNpn(e.target.value)} />
              </div>
              <div>
                <Label>{t("agency")}</Label>
                <Input value={agency} onChange={(e) => setAgency(e.target.value)} />
              </div>
              <div>
                <Label>{t("addressStreet")}</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("addressApt")}</Label>
                  <Input value={apt} onChange={(e) => setApt(e.target.value)} />
                </div>
                <div>
                  <Label>{t("addressCity")}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("addressState")}</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>{t("addressZip")}</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("saveProfile")}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
