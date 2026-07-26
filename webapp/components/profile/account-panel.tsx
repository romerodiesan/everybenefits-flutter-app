"use client";

import { FormEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  headlineName,
  updateUserProfile,
  uploadAvatar,
} from "@/lib/firebase/users";
import { Avatar, Button, Input, Label } from "@/components/ui/primitives";
import {
  SettingsPanelShell,
  StatusBanner,
} from "@/components/profile/settings-nav";

export function AccountPanel() {
  const t = useTranslations();
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!profile) return null;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setStatus(null);
    try {
      await updateUserProfile(profile, {
        displayName: displayName.trim() || profile.displayName,
      });
      await refreshProfile();
      setStatus("saved");
    } catch {
      setStatus("error");
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
        <div className="max-w-sm">
          <Label>{t("displayName")}</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {t("profileSave")}
          </Button>
          {status === "saved" && (
            <StatusBanner kind="success">{t("profileSaved")}</StatusBanner>
          )}
          {status === "error" && (
            <StatusBanner kind="error">{t("errorGeneric")}</StatusBanner>
          )}
        </div>
      </form>
    </SettingsPanelShell>
  );
}
