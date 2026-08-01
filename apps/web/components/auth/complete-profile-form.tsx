"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@pulse/ui";
import { ProfileFormSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/users";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import { DEFAULT_AGENCY, type UserRole } from "@/lib/types";
import {
  belongsInDefaultAgentGroup,
  needsProfileCompletion,
  normalizePersonName,
  requiresLicenseProfile,
  validateDisplayName,
  validateNpn,
  validateUsState,
  validateUsZip,
} from "@/lib/roles";

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

  const lockedRole =
    profile &&
    profile.role !== "student" &&
    profile.role !== "guest" &&
    profile.role !== "agent"
      ? profile.role
      : null;
  const effectiveRole: UserRole = lockedRole ?? role;
  const needsLicense = requiresLicenseProfile(effectiveRole);
  const canPickRole = !lockedRole && profile?.role !== "agent";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profile) return;
    if (profile.isAnonymous) {
      router.replace("/home");
      return;
    }
    if (!needsProfileCompletion(profile)) {
      router.replace("/home");
      return;
    }
    startTransition(() => {
      if (profile.displayName) {
        setDisplayName(normalizePersonName(profile.displayName));
      }
      if (profile.role === "agent") setRole("agent");
      if (profile.npn) setNpn(profile.npn);
      if (profile.agency) setAgency(profile.agency);
      if (profile.addressStreet) setStreet(profile.addressStreet);
      if (profile.addressApt) setApt(profile.addressApt);
      if (profile.addressCity) setCity(profile.addressCity);
      if (profile.addressState) setState(profile.addressState);
      if (profile.addressZip) setZip(profile.addressZip);
    });
  }, [loading, user, profile, router]);

  function nameErrorMessage(issue: string) {
    if (issue === "email_as_name") return t("validationNameEmail");
    if (issue === "need_last_name") return t("validationNameLast");
    if (issue === "too_short") return t("validationNameShort");
    return t("validationName");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const name = validateDisplayName(displayName);
      if (!name.ok) {
        setError(nameErrorMessage(name.issue));
        return;
      }

      let nextNpn: string | null = null;
      let nextStreet: string | null = null;
      let nextApt: string | null = null;
      let nextCity: string | null = null;
      let nextState: string | null = null;
      let nextZip: string | null = null;
      let nextAgency = DEFAULT_AGENCY;

      if (needsLicense) {
        const npnResult = validateNpn(npn);
        if (!npnResult.ok) {
          setError(
            npnResult.issue === "empty" ? t("validationNpn") : t("validationNpnLength"),
          );
          return;
        }
        nextNpn = npnResult.value;
        nextStreet = street.trim();
        nextApt = apt.trim() || null;
        nextCity = city.trim();
        nextState = validateUsState(state);
        nextZip = validateUsZip(zip);
        nextAgency = agency.trim() || DEFAULT_AGENCY;
        if (!nextStreet || !nextCity || !nextState || !nextZip) {
          setError(t("validationAddress"));
          return;
        }
      }

      const nextRole: UserRole = lockedRole ?? role;
      await updateUserProfile(profile, {
        displayName: name.value,
        role: nextRole,
        profileCompleted: true,
        npn: nextNpn,
        agency: nextAgency,
        addressStreet: nextStreet,
        addressApt: nextApt,
        addressCity: nextCity,
        addressState: nextState,
        addressZip: nextZip,
      });
      if (belongsInDefaultAgentGroup(nextRole)) {
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
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
        <Panel className="w-full max-w-lg">
          <ProfileFormSkeleton />
        </Panel>
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
        <p className="mt-2 text-sm text-muted">{t("completeProfileNameHint")}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("displayName")}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() =>
                setDisplayName((v) => normalizePersonName(v))
              }
              placeholder={t("displayNamePlaceholder")}
              required
            />
          </div>

          {canPickRole && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
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
                className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                  role === "agent"
                    ? "border-brand bg-brand/15"
                    : "border-glass-border"
                }`}
              >
                <p className="font-display font-bold">{t("chooseAgent")}</p>
                <p className="mt-1 text-sm text-muted">{t("roleAgent")}</p>
              </button>
            </div>
          )}

          {needsLicense && (
            <div className="space-y-4 border-t border-glass-border pt-4">
              <div>
                <Label>{t("npn")}</Label>
                <Input
                  value={npn}
                  onChange={(e) =>
                    setNpn(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                  inputMode="numeric"
                  pattern="\d{7,9}"
                  minLength={7}
                  maxLength={9}
                  required
                />
                <p className="mt-1 text-xs text-muted">{t("npnHint")}</p>
              </div>
              <div>
                <Label>{t("agency")}</Label>
                <Input
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("addressStreet")}</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("addressApt")}</Label>
                  <Input value={apt} onChange={(e) => setApt(e.target.value)} />
                </div>
                <div>
                  <Label>{t("addressCity")}</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("addressState")}</Label>
                  <Input
                    value={state}
                    onChange={(e) =>
                      setState(e.target.value.toUpperCase().slice(0, 2))
                    }
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label>{t("addressZip")}</Label>
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t("loading") : t("saveProfile")}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
