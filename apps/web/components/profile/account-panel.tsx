"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import { headlineName } from "@/lib/display-name";
import {
  composeDisplayName,
  normalizePersonName,
  requiresLicenseProfile,
  splitDisplayName,
  validateFamilyName,
  validateGivenName,
  validateUsState,
  validateUsZip,
} from "@/lib/roles";
import { updateUserProfile, uploadAvatar } from "@/lib/firebase/users";
import { updateAccountEmail, updateUsername } from "@/lib/firebase/functions";
import { parseUsername } from "@pulse/shared";
import { validateUsAddress } from "@/lib/firebase/address";
import { usingFirebaseEmulators } from "@/lib/firebase/auth";
import {
  clearProfilePhoneRecaptcha,
  confirmProfilePhone,
  phoneAuthErrorKey,
  startProfilePhoneVerification,
  toE164,
} from "@/lib/firebase/profile-phone";
import { Avatar, Button, Input, Label, TextArea } from "@/components/ui/primitives";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import { UsAddressFields } from "@/components/address/us-address-fields";
import { PhoneRecaptchaHost } from "@/components/auth/phone-recaptcha-host";
import {
  SettingsFieldGroup,
  SettingsPanelShell,
  StatusBanner,
} from "@/components/profile/settings-nav";

export function AccountPanel() {
  const t = useTranslations();
  const { profile, refreshProfile } = useAuth();
  const initialParts = splitDisplayName(profile?.displayName ?? "");
  const [givenName, setGivenName] = useState(initialParts.givenName);
  const [familyName, setFamilyName] = useState(initialParts.familyName);
  const [email, setEmail] = useState(profile?.email ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState(
    profile?.phoneCountryIso2 ?? "",
  );
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    profile?.phoneCountryCode ?? "+1",
  );
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? "");
  const [street, setStreet] = useState(profile?.addressStreet ?? "");
  const [apt, setApt] = useState(profile?.addressApt ?? "");
  const [city, setCity] = useState(profile?.addressCity ?? "");
  const [state, setState] = useState(profile?.addressState ?? "");
  const [zip, setZip] = useState(profile?.addressZip ?? "");
  const [smsCode, setSmsCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | "phone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const onEmulator = usingFirebaseEmulators();

  useEffect(() => {
    return () => clearProfilePhoneRecaptcha();
  }, []);

  useEffect(() => {
    if (!profile?.displayName) return;
    const parts = splitDisplayName(profile.displayName);
    setGivenName(parts.givenName);
    setFamilyName(parts.familyName);
  }, [profile?.displayName]);

  useEffect(() => {
    setBio(profile?.bio ?? "");
  }, [profile?.bio]);

  useEffect(() => {
    setEmail(profile?.email ?? "");
  }, [profile?.email]);

  useEffect(() => {
    setUsername(profile?.username ?? "");
  }, [profile?.username]);

  useEffect(() => {
    if (verificationId) return;
    setPhoneCountryCode(profile?.phoneCountryCode ?? "+1");
    setPhoneCountryIso2(profile?.phoneCountryIso2 ?? "");
    setPhoneNumber(profile?.phoneNumber ?? "");
  }, [
    profile?.phoneCountryCode,
    profile?.phoneCountryIso2,
    profile?.phoneNumber,
    verificationId,
  ]);

  useEffect(() => {
    setStreet(profile?.addressStreet ?? "");
    setApt(profile?.addressApt ?? "");
    setCity(profile?.addressCity ?? "");
    setState(profile?.addressState ?? "");
    setZip(profile?.addressZip ?? "");
  }, [
    profile?.addressStreet,
    profile?.addressApt,
    profile?.addressCity,
    profile?.addressState,
    profile?.addressZip,
  ]);

  if (!profile) return null;

  const licenseAddress = requiresLicenseProfile(profile.role);
  const showAddress =
    licenseAddress ||
    Boolean(
      profile.addressStreet ||
        profile.addressCity ||
        profile.addressState ||
        profile.addressZip,
    );

  const phoneChanged =
    `${phoneCountryCode.trim()}${phoneNumber.trim()}` !==
    `${profile.phoneCountryCode?.trim() ?? ""}${profile.phoneNumber?.trim() ?? ""}`;

  function mapError(err: unknown): string {
    const phoneKey = phoneAuthErrorKey(err);
    if (phoneKey) return t(phoneKey);
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code.includes("already-exists")) {
      return err &&
        typeof err === "object" &&
        "message" in err &&
        String((err as { message: string }).message).includes("taken")
        ? t("usernameTaken")
        : t("errEmailInUse");
    }
    if (code.includes("invalid-argument")) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "";
      return msg.includes("invalid") ? t("usernameInvalid") : t("validationEmail");
    }
    return t("errorGeneric");
  }

  async function persistAddressIfNeeded() {
    if (!profile || !showAddress) return;
    const nextStreet = street.trim();
    const nextApt = apt.trim() || null;
    const nextCity = city.trim();
    const nextState = validateUsState(state);
    const nextZip = validateUsZip(zip);
    const anyFilled = Boolean(nextStreet || nextCity || nextState || nextZip || nextApt);

    if (!anyFilled) {
      if (licenseAddress) {
        throw Object.assign(new Error("address"), { code: "address-incomplete" });
      }
      await updateUserProfile(profile, {
        addressStreet: null,
        addressApt: null,
        addressCity: null,
        addressState: null,
        addressZip: null,
      });
      return;
    }

    if (!nextStreet || !nextCity || !nextState || !nextZip) {
      throw Object.assign(new Error("address"), { code: "address-incomplete" });
    }

    let streetValue = nextStreet;
    let cityValue = nextCity;
    let stateValue = nextState;
    let zipValue = nextZip;

    const validated = await validateUsAddress({
      street: streetValue,
      city: cityValue,
      state: stateValue,
      zip: zipValue,
      apt: nextApt,
    });
    if (!validated.ok && validated.verdict === "fix") {
      throw Object.assign(new Error(validated.message ?? t("validationAddressInvalid")), {
        code: "address-invalid",
      });
    }
    if (validated.normalized && !validated.skipped) {
      streetValue = validated.normalized.street;
      cityValue = validated.normalized.city;
      stateValue = validated.normalized.state;
      zipValue = validateUsZip(validated.normalized.zip) ?? zipValue;
      setStreet(streetValue);
      setCity(cityValue);
      setState(stateValue);
      setZip(zipValue);
    }
    if (!validated.ok && validated.verdict === "confirm") {
      throw Object.assign(new Error("address-confirm"), {
        code: "address-confirm",
      });
    }

    await updateUserProfile(profile, {
      addressStreet: streetValue,
      addressApt: nextApt,
      addressCity: cityValue,
      addressState: stateValue,
      addressZip: zipValue,
    });
  }

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
      const nextEmail = email.trim().toLowerCase();
      if (!nextEmail.includes("@") || !nextEmail.includes(".")) {
        setError(t("validationEmail"));
        setBusy(false);
        return;
      }
      if (nextEmail !== (profile.email ?? "").trim().toLowerCase()) {
        await updateAccountEmail(nextEmail);
      }

      const nextUsername = username.trim().toLowerCase();
      if (
        nextUsername &&
        nextUsername !== (profile.username ?? "").trim().toLowerCase()
      ) {
        const parsed = parseUsername(nextUsername);
        if (!parsed.ok) {
          setError(t("usernameInvalid"));
          setBusy(false);
          return;
        }
        await updateUsername(parsed.value);
      }

      const nextBio = bio.trim().slice(0, 280) || null;
      await updateUserProfile(profile, {
        displayName: nextDisplayName,
        bio: nextBio,
      });

      if (phoneChanged && !phoneNumber.trim()) {
        await updateUserProfile(profile, {
          phoneCountryCode: phoneCountryCode.trim() || null,
          phoneCountryIso2: phoneCountryIso2.trim() || null,
          phoneNumber: null,
          phoneVerified: false,
        });
        setVerificationId(null);
        setSmsCode("");
      }

      await persistAddressIfNeeded();
      await refreshProfile();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "address-incomplete") {
        setError(t("validationAddress"));
      } else if (code === "address-confirm") {
        setError(t("validationAddressConfirm"));
      } else if (code === "address-invalid") {
        setError(err instanceof Error ? err.message : t("validationAddressInvalid"));
      } else {
        setError(mapError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSendPhoneCode() {
    if (!phoneNumber.trim()) return;
    setPhoneBusy(true);
    setStatus(null);
    setError(null);
    try {
      const e164 = toE164(phoneCountryCode, phoneNumber);
      const id = await startProfilePhoneVerification(e164);
      setVerificationId(id);
      setSmsCode("");
      setStatus("phone");
    } catch (err) {
      setStatus("error");
      setError(mapError(err));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function onConfirmPhone() {
    if (!profile || !verificationId) return;
    setPhoneBusy(true);
    setStatus(null);
    setError(null);
    try {
      await confirmProfilePhone(verificationId, smsCode);
      await updateUserProfile(profile, {
        phoneCountryCode: phoneCountryCode.trim() || null,
        phoneCountryIso2: phoneCountryIso2.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        phoneVerified: true,
      });
      setVerificationId(null);
      setSmsCode("");
      await refreshProfile();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(mapError(err));
    } finally {
      setPhoneBusy(false);
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
      <PhoneRecaptchaHost containerId="profile-phone-recaptcha" />

      <form onSubmit={onSave} className="divide-y divide-glass-border">
        <div className="flex items-center gap-4 pb-6">
          <Avatar
            name={headlineName(profile)}
            photoUrl={profile.photoUrl}
            size={72}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight">
              {headlineName(profile)}
            </p>
            {profile.email ? (
              <p className="mt-0.5 truncate text-sm text-muted">{profile.email}</p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="mt-3 h-8 px-3 text-xs"
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

        <div className="py-6">
          <SettingsFieldGroup title={t("profileSectionIdentity")}>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
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
            <div className="max-w-xl">
              <Label>{t("email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <p className="mt-1 text-xs text-muted">{t("profileEmailHint")}</p>
            </div>
            <div className="max-w-xl">
              <Label>{t("usernameLabel")}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoComplete="username"
                spellCheck={false}
                placeholder={t("usernamePlaceholder")}
              />
              <p className="mt-1 text-xs text-muted">{t("usernameHint")}</p>
            </div>
            <div className="max-w-xl">
              <Label>{t("fieldBio")}</Label>
              <TextArea
                value={bio}
                maxLength={280}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("fieldBioHint")}
              />
              <p className="mt-1 text-xs text-muted">{bio.trim().length}/280</p>
            </div>
          </SettingsFieldGroup>
        </div>

        <div className="py-6">
          <SettingsFieldGroup
            title={t("profileSectionPhone")}
            hint={
              profile.phoneVerified && !phoneChanged
                ? t("phoneProfileVerifiedBadge")
                : t("phoneProfileVerifyHint")
            }
          >
            <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-[9.5rem_1fr]">
              <div>
                <Label>{t("phoneCountryCode")}</Label>
                <CountryCodeSelect
                  value={phoneCountryCode}
                  iso2={phoneCountryIso2}
                  onChange={(code, nextIso2) => {
                    setPhoneCountryCode(code);
                    setPhoneCountryIso2(nextIso2);
                    setVerificationId(null);
                    setSmsCode("");
                  }}
                  disabled={Boolean(verificationId) || phoneBusy}
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
                  autoComplete="tel-national"
                  disabled={Boolean(verificationId) || phoneBusy}
                />
              </div>
            </div>
            {verificationId ? (
              <div className="max-w-xl space-y-3">
                <StatusBanner kind="info">{t("phoneSmsSent")}</StatusBanner>
                {onEmulator ? (
                  <p className="text-xs text-muted">{t("securitySmsEmulatorHint")}</p>
                ) : null}
                <div>
                  <Label>{t("fieldVerificationCode")}</Label>
                  <Input
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={phoneBusy || smsCode.trim().length < 6}
                    onClick={() => void onConfirmPhone()}
                  >
                    {t("phoneProfileVerifyConfirm")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={phoneBusy}
                    onClick={() => void onSendPhoneCode()}
                  >
                    {t("phoneResendCode")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={phoneBusy}
                    onClick={() => {
                      setVerificationId(null);
                      setSmsCode("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              phoneChanged && phoneNumber.trim() ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={phoneBusy}
                  onClick={() => void onSendPhoneCode()}
                >
                  {t("mfaSendSms")}
                </Button>
              ) : null
            )}
          </SettingsFieldGroup>
        </div>

        {showAddress ? (
          <div className="py-6">
            <SettingsFieldGroup title={t("profileSectionAddress")}>
              <div className="max-w-xl">
                <UsAddressFields
                  value={{ street, apt, city, state, zip }}
                  onChange={(next) => {
                    setStreet(next.street);
                    setApt(next.apt);
                    setCity(next.city);
                    setState(next.state);
                    setZip(next.zip);
                  }}
                  required={licenseAddress}
                />
              </div>
            </SettingsFieldGroup>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-6">
          <Button type="submit" disabled={busy || phoneBusy}>
            {t("profileSave")}
          </Button>
          {status === "saved" ? (
            <StatusBanner kind="success">{t("profileSaved")}</StatusBanner>
          ) : null}
          {status === "error" || error ? (
            <StatusBanner kind="error">{error ?? t("errorGeneric")}</StatusBanner>
          ) : null}
        </div>
      </form>
    </SettingsPanelShell>
  );
}
