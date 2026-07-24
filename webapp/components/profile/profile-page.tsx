"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  ACCENTS,
  useThemeSettings,
  type AccentSeed,
  type ThemeMode,
} from "@/lib/providers/theme-provider";
import {
  headlineName,
  updateUserProfile,
  uploadAvatar,
} from "@/lib/firebase/users";
import {
  listStudentsForPromotion,
  setUserRole,
} from "@/lib/firebase/functions";
import { getOrCreateSupportChat } from "@/lib/firebase/chats";
import { signOutUser } from "@/lib/firebase/auth";
import type { UserProfile } from "@/lib/types";
import { Avatar, Badge, Button, Input, Label } from "@/components/ui/primitives";

function roleLabel(
  role: UserProfile["role"],
  t: ReturnType<typeof useTranslations>,
) {
  return {
    guest: t("roleGuest"),
    student: t("roleStudent"),
    agent: t("roleAgent"),
    instructor: t("roleInstructor"),
    manager: t("roleManager"),
    admin: t("roleAdmin"),
  }[role];
}

export function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { mode, accent, setMode, setAccent } = useThemeSettings();
  const [displayName, setDisplayName] = useState("");
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    listStudentsForPromotion()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [profile?.role]);

  if (!profile) return null;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      await updateUserProfile(profile, {
        displayName: displayName.trim() || profile.displayName,
      });
      await refreshProfile();
      setMessage(t("profileSaved"));
    } catch {
      setMessage(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file || !profile) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(profile.uid, file);
      await updateUserProfile(profile, { photoUrl: url });
      await refreshProfile();
    } catch {
      setMessage(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="mb-5 border-b border-glass-border pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {t("profileTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("profileSubtitle")}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="pulse-sheet p-4 text-center lg:text-left">
            <div className="flex flex-col items-center gap-3 lg:items-start">
              <Avatar
                name={headlineName(profile)}
                photoUrl={profile.photoUrl}
                size={72}
              />
              <div>
                <p className="font-display text-lg font-bold">
                  {headlineName(profile)}
                </p>
                <div className="mt-1.5">
                  <Badge>{roleLabel(profile.role, t)}</Badge>
                </div>
                {profile.email && (
                  <p className="mt-2 break-all text-xs text-muted">
                    {profile.email}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {!profile.isAnonymous && (
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (!profile) return;
                    const chat = await getOrCreateSupportChat(
                      profile,
                      "Support Assistant",
                      "Hi — how can we help?",
                    );
                    router.push(`/chats/${chat.id}`);
                  }}
                >
                  {t("profileSupport")}
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full lg:hidden"
                onClick={async () => {
                  await signOutUser();
                  router.replace("/");
                }}
              >
                {t("navLogout")}
              </Button>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className="pulse-sheet overflow-hidden">
            <div className="border-b border-glass-border px-4 py-3">
              <h2 className="font-display text-base font-bold">
                {t("profileAccount")}
              </h2>
            </div>
            <form onSubmit={onSave} className="space-y-4 px-4 py-4">
              <div>
                <Label>{t("displayName")}</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("profileUploadAvatar")}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {t("profileSave")}
              </Button>
            </form>
          </section>

          <section className="pulse-sheet overflow-hidden">
            <div className="border-b border-glass-border px-4 py-3">
              <h2 className="font-display text-base font-bold">
                {t("profileSettings")}
              </h2>
            </div>
            <div className="divide-y divide-glass-border">
              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium tracking-wide text-muted">
                  {t("profileTheme")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["system", t("profileThemeSystem")],
                      ["light", t("profileThemeLight")],
                      ["dark", t("profileThemeDark")],
                    ] as [ThemeMode, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                        mode === value
                          ? "bg-brand/14 text-brand"
                          : "text-muted hover:bg-white/[0.04] hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium tracking-wide text-muted">
                  {t("profileAccent")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(ACCENTS) as AccentSeed[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccent(key)}
                      className={`h-7 w-7 rounded-full border-2 ${
                        accent === key ? "border-ink" : "border-transparent"
                      }`}
                      style={{ backgroundColor: ACCENTS[key] }}
                      aria-label={key}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium tracking-wide text-muted">
                  {t("profileLanguage")}
                </p>
                <div className="flex gap-1">
                  {(["en", "es"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() =>
                        router.replace("/profile", { locale: code })
                      }
                      className={`h-8 min-w-11 rounded-lg px-3 text-xs font-semibold uppercase transition ${
                        locale === code
                          ? "bg-brand/14 text-brand"
                          : "text-muted hover:bg-white/[0.04] hover:text-ink"
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {profile.role === "admin" && (
            <section className="pulse-sheet overflow-hidden">
              <div className="border-b border-glass-border px-5 py-4 md:px-6">
                <h2 className="font-display text-lg font-bold">
                  {t("profileAdmin")}
                </h2>
              </div>
              <div className="overflow-x-auto">
                {students.length > 0 ? (
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-glass-border text-xs uppercase tracking-[0.12em] text-muted">
                        <th className="px-5 py-3 font-bold md:px-6">
                          {t("displayName")}
                        </th>
                        <th className="px-5 py-3 font-bold md:px-6">
                          {t("email")}
                        </th>
                        <th className="px-5 py-3 text-right font-bold md:px-6">
                          {" "}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student.uid}
                          className="border-b border-glass-border last:border-0"
                        >
                          <td className="px-5 py-3 font-semibold md:px-6">
                            {headlineName(student)}
                          </td>
                          <td className="px-5 py-3 text-muted md:px-6">
                            {student.email ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-right md:px-6">
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                await setUserRole(student.uid, "agent");
                                setStudents((prev) =>
                                  prev.filter((s) => s.uid !== student.uid),
                                );
                              }}
                            >
                              {t("profilePromote")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-5 text-sm text-muted md:px-6">
                    {t("profileNoStudents")}
                  </p>
                )}
              </div>
            </section>
          )}

          {message && <p className="text-sm text-muted">{message}</p>}
        </div>
      </div>
    </div>
  );
}
