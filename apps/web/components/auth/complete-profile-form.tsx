"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import { ProfileFormSkeleton } from "@/components/ui/skeleton";
import { UsAddressFields } from "@/components/address/us-address-fields";
import { AgencySelect } from "@/components/auth/agency-select";
import { useAuth } from "@/lib/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/users";
import { validateUsAddress } from "@/lib/firebase/address";
import { type UserRole } from "@/lib/types";
import {
  composeDisplayName,
  needsProfileCompletion,
  normalizePersonName,
  requiresLicenseProfile,
  splitDisplayName,
  validateFamilyName,
  validateGivenName,
  validateNpn,
  validateUsState,
  validateUsZip,
} from "@/lib/roles";
import { postLoginPath, readLoginNext } from "@/lib/auth-redirect";

export function CompleteProfileForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth();
  const [role, setRole] = useState<"student" | "agent">("student");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [npn, setNpn] = useState("");
  const [agency, setAgency] = useState("");
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextParam = readLoginNext(params.get("next"));
  const afterAuth = postLoginPath(nextParam);
  const nextQuery = nextParam
    ? `?next=${encodeURIComponent(nextParam)}`
    : "";

  const lockedRole =
    profile &&
    profile.role !== "student" &&
    profile.role !== "agent"
      ? profile.role
      : null;
  const effectiveRole: UserRole = lockedRole ?? role;
  const needsLicense = requiresLicenseProfile(effectiveRole);
  const canPickRole = !lockedRole && profile?.role !== "agent";

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.replace(`/login${nextQuery}`);
      return;
    }
    if (!profile) return;
    if (profile.isAnonymous) {
      router.replace(afterAuth);
      return;
    }
    if (!needsProfileCompletion(profile)) {
      router.replace(afterAuth);
      return;
    }
    startTransition(() => {
      if (profile.displayName) {
        const parts = splitDisplayName(profile.displayName);
        setGivenName(parts.givenName);
        setFamilyName(parts.familyName);
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
  }, [loading, profileLoading, user, profile, router, afterAuth, nextQuery]);

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
      const given = validateGivenName(givenName);
      if (!given.ok) {
        setError(nameErrorMessage(given.issue));
        return;
      }
      const family = validateFamilyName(familyName);
      if (!family.ok) {
        setError(nameErrorMessage(family.issue));
        return;
      }
      const displayName = composeDisplayName(given.value, family.value);

      let nextNpn: string | null = null;
      let nextStreet: string | null = null;
      let nextApt: string | null = null;
      let nextCity: string | null = null;
      let nextState: string | null = null;
      let nextZip: string | null = null;
      let nextAgency: string | null = null;

      if (needsLicense) {
        const npnResult = validateNpn(npn);
        if (!npnResult.ok) {
          setError(
            npnResult.issue === "empty"
              ? t("validationNpn")
              : t("validationNpnLength"),
          );
          return;
        }
        nextNpn = npnResult.value;
        nextStreet = street.trim();
        nextApt = apt.trim() || null;
        nextCity = city.trim();
        nextState = validateUsState(state);
        nextZip = validateUsZip(zip);
        nextAgency = agency.trim();
        if (!nextAgency) {
          setError(t("validationAgency"));
          return;
        }
        if (!nextStreet || !nextCity || !nextState || !nextZip) {
          setError(t("validationAddress"));
          return;
        }

        const validated = await validateUsAddress({
          street: nextStreet,
          city: nextCity,
          state: nextState,
          zip: nextZip,
          apt: nextApt,
        });
        if (!validated.ok && validated.verdict === "fix") {
          setError(validated.message ?? t("validationAddressInvalid"));
          return;
        }
        if (validated.normalized && !validated.skipped) {
          nextStreet = validated.normalized.street;
          nextCity = validated.normalized.city;
          nextState = validated.normalized.state;
          nextZip = validateUsZip(validated.normalized.zip) ?? nextZip;
          setStreet(nextStreet);
          setCity(nextCity);
          setState(nextState);
          setZip(nextZip);
        }
        if (!validated.ok && validated.verdict === "confirm") {
          // Suggested correction applied above — ask user to review and save again.
          setError(t("validationAddressConfirm"));
          return;
        }
      }

      const nextRole: UserRole = lockedRole ?? role;
      await updateUserProfile(profile, {
        displayName,
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
      await refreshProfile();
      router.replace(afterAuth);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || profileLoading || !profile) {
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

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
              {t("profileSectionIdentity")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("givenName")}</Label>
                <Input
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  onBlur={() => setGivenName((v) => normalizePersonName(v))}
                  placeholder={t("givenNamePlaceholder")}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <Label>{t("familyName")}</Label>
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onBlur={() => setFamilyName((v) => normalizePersonName(v))}
                  placeholder={t("familyNamePlaceholder")}
                  autoComplete="family-name"
                  required
                />
              </div>
          </div>
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
            <div className="space-y-4 border-t border-glass-border pt-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                {t("profileSectionLicense")}
              </p>
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
                <AgencySelect
                  value={agency}
                  onChange={(next) => setAgency(next.agency)}
                  required
                />
              </div>
              <UsAddressFields
                value={{ street, apt, city, state, zip }}
                onChange={(next) => {
                  setStreet(next.street);
                  setApt(next.apt);
                  setCity(next.city);
                  setState(next.state);
                  setZip(next.zip);
                }}
                required
              />
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
