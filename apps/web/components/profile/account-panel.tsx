"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  headlineName,
} from "@/lib/display-name";
import {
  composeDisplayName,
  normalizePersonName,
  splitDisplayName,
  validateFamilyName,
  validateGivenName,
} from "@/lib/roles";
import {
  updateUserProfile,
  uploadAvatar,
} from "@/lib/firebase/users";
import {
  clearProfilePhoneRecaptcha,
  confirmProfilePhone,
  startProfilePhoneVerification,
  toE164,
} from "@/lib/firebase/profile-phone";
import { Avatar, Button, Input, Label } from "@/components/ui/primitives";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import {
  SettingsPanelShell,
  StatusBanner,
} from "@/components/profile/settings-nav";

export function AccountPanel() {
  const t = useTranslations();
  const { profile, refreshProfile } = useAuth();
  const initialParts = splitDisplayName(profile?.displayName ?? "");
  const [givenName, setGivenName] = useState(initialParts.givenName);
  const [familyName, setFamilyName] = useState(initialParts.familyName);
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    profile?.phoneCountryCode ?? "+1",
  );
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? "");
  const [smsCode, setSmsCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | "phone" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => clearProfilePhoneRecaptcha();
  }, []);

  useEffect(() => {
    if (!profile?.displayName) return;
    const parts = splitDisplayName(profile.displayName);
    setGivenName(parts.givenName);
    setFamilyName(parts.familyName);
  }, [profile?.displayName]);

  if (!profile) return null;

  const phoneChanged =
    `${phoneCountryCode.trim()}${phoneNumber.trim()}` !==
    `${profile.phoneCountryCode?.trim() ?? ""}${profile.phoneNumber?.trim() ?? ""}`;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const given = validateGivenName(givenName);
      if (!given.ok) {
        setError(
          given.issue === "email_as_name"
            ? t("validationNameEmail")
            : given.issue === "too_short"
              ? t("validationNameShort")
              : t("validationName"),
        );
        setBusy(false);
        return;
      }
      const family = validateFamilyName(familyName);
      if (!family.ok) {
        setError(
          family.issue === "need_last_name"
            ? t("validationNameLast")
            : family.issue === "too_short"
              ? t("validationNameShort")
              : t("validationName"),
        );
        setBusy(false);
        return;
      }
      const nextDisplayName = composeDisplayName(given.value, family.value);

      if (phoneChanged) {
        const digits = phoneNumber.trim();
        if (!digits) {
          await updateUserProfile(profile, {
            displayName: nextDisplayName,
            phoneCountryCode: phoneCountryCode.trim() || null,
            phoneNumber: null,
            phoneVerified: false,
          });
        } else if (!verificationId) {
          const e164 = toE164(phoneCountryCode, phoneNumber);
          const id = await startProfilePhoneVerification(e164);
          setVerificationId(id);
          setStatus("phone");
          setBusy(false);
          return;
        } else {
          await confirmProfilePhone(verificationId, smsCode);
          await updateUserProfile(profile, {
            displayName: nextDisplayName,
            phoneCountryCode: phoneCountryCode.trim() || null,
            phoneNumber: phoneNumber.trim() || null,
            phoneVerified: true,
          });
          setVerificationId(null);
          setSmsCode("");
        }
      } else {
        await updateUserProfile(profile, {
          displayName: nextDisplayName,
        });
      }

      await refreshProfile();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code.includes("invalid-phone-number")) {
        setError(t("phoneVerifyInvalid"));
      } else if (code.includes("too-many-requests")) {
        setError(t("phoneVerifyTooMany"));
      } else if (
        phoneChanged &&
        (code.includes("captcha") ||
          code.includes("argument") ||
          code.includes("internal") ||
          code.includes("auth/"))
      ) {
        setError(t("phoneVerifyError"));
      } else {
        setError(t("errorGeneric"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file || !profile) return;
    setAvatarBusy(true);
    setStatus(null);
    try {
      const url = await uploadAvatar(profile.uid, file);
      await updateUserProfile(profile, { photoUrl: url });
      await refreshProfile();
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <SettingsPanelShell
      title={t("profileAccount")}
      subtitle={t("profileAccountHint")}
    >
      <div id="profile-phone-recaptcha" />
      <div className="flex items-center gap-4">
        <Avatar
          name={headlineName(profile)}
          photoUrl={profile.photoUrl}
          size={64}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {headlineName(profile)}
          </p>
          {profile.email && (
            <p className="mt-0.5 truncate text-xs text-muted">
              {profile.email}
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-2 h-8 px-3 text-xs"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
          >
            {avatarBusy ? t("profileUploading") : t("profileUploadAvatar")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <form onSubmit={onSave} className="mt-5 space-y-4">
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("givenName")}</Label>
            <Input
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              onBlur={() => setGivenName((v) => normalizePersonName(v))}
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
              autoComplete="family-name"
              required
            />
          </div>
        </div>
        <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-[9.5rem_1fr]">
          <div>
            <Label>{t("phoneCountryCode")}</Label>
            <CountryCodeSelect
              value={phoneCountryCode}
              onChange={(code) => {
                setPhoneCountryCode(code);
                setVerificationId(null);
                setSmsCode("");
              }}
            />
          </div>
          <div>
            <Label>{t("fieldPhoneNumber")}</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setVerificationId(null);
                setSmsCode("");
              }}
              inputMode="tel"
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          {profile.phoneVerified && !phoneChanged
            ? t("phoneProfileVerifiedBadge")
            : t("phoneProfileVerifyHint")}
        </p>
        {verificationId && (
          <div className="max-w-sm space-y-2">
            <StatusBanner kind="info">{t("phoneSmsSent")}</StatusBanner>
            <Label>{t("fieldVerificationCode")}</Label>
            <Input
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy || (Boolean(verificationId) && smsCode.trim().length < 6)}
          >
            {verificationId ? t("phoneProfileVerifyConfirm") : t("profileSave")}
          </Button>
          {status === "saved" && (
            <StatusBanner kind="success">{t("profileSaved")}</StatusBanner>
          )}
          {status === "phone" && (
            <StatusBanner kind="info">{t("phoneSmsSent")}</StatusBanner>
          )}
          {(status === "error" || error) && (
            <StatusBanner kind="error">{error ?? t("errorGeneric")}</StatusBanner>
          )}
        </div>
      </form>
    </SettingsPanelShell>
  );
}
