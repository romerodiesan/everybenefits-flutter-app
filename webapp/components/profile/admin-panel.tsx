"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listPendingApprovals,
  listStudentsForPromotion,
  setUserApproval,
  setUserRole,
} from "@/lib/firebase/functions";
import {
  setPulseAiEnabled,
  watchPulseAiEnabled,
} from "@/lib/firebase/platform-config";
import { headlineName } from "@/lib/firebase/users";
import { useAuth } from "@/lib/providers/auth-provider";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import {
  SettingsPanelShell,
  SettingsRow,
  Toggle,
} from "@/components/profile/settings-nav";

export function AdminPanel() {
  const t = useTranslations();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    listPendingApprovals()
      .then(setPending)
      .catch(() => setPending([]));
    if (profile?.role === "admin") {
      listStudentsForPromotion()
        .then(setStudents)
        .catch(() => setStudents([]));
    }
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    return watchPulseAiEnabled(setAiEnabled);
  }, [profile?.role]);

  const toggleAi = async () => {
    if (!profile || aiBusy || !isAdmin) return;
    const next = !aiEnabled;
    setAiEnabled(next);
    setAiBusy(true);
    try {
      await setPulseAiEnabled(next, profile.uid);
    } catch {
      setAiEnabled(!next);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <SettingsPanelShell
      title={t("profileAdmin")}
      subtitle={t("profileAdminHint")}
    >
      {isAdmin && (
        <div className="mb-6 border-b border-glass-border pb-4">
          <SettingsRow
            label={t("adminPulseAi")}
            hint={t("adminPulseAiHint")}
          >
            <Toggle
              checked={aiEnabled}
              disabled={aiBusy}
              onChange={() => void toggleAi()}
              label={t("adminPulseAi")}
            />
          </SettingsRow>
        </div>
      )}

      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {t("approvalSectionTitle")}
      </p>
      {pending.length > 0 ? (
        <div className="mb-8 -mx-4 overflow-x-auto md:-mx-5">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-glass-border text-xs uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-2.5 font-bold md:px-5">
                  {t("displayName")}
                </th>
                <th className="px-4 py-2.5 font-bold md:px-5">{t("email")}</th>
                <th className="px-4 py-2.5 text-right font-bold md:px-5"> </th>
              </tr>
            </thead>
            <tbody>
              {pending.map((person) => (
                <tr
                  key={person.uid}
                  className="border-b border-glass-border last:border-0"
                >
                  <td className="px-4 py-3 font-semibold md:px-5">
                    {headlineName(person)}
                  </td>
                  <td className="px-4 py-3 text-muted md:px-5">
                    {person.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right md:px-5">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        onClick={async () => {
                          await setUserApproval(person.uid, "approved");
                          setPending((prev) =>
                            prev.filter((s) => s.uid !== person.uid),
                          );
                        }}
                      >
                        {t("approvalApprove")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 px-3 text-xs"
                        onClick={async () => {
                          await setUserApproval(person.uid, "rejected");
                          setPending((prev) =>
                            prev.filter((s) => s.uid !== person.uid),
                          );
                        }}
                      >
                        {t("approvalReject")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-8 text-sm text-muted">{t("approvalSectionEmpty")}</p>
      )}

      {isAdmin && (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {t("profilePromote")}
          </p>
          {students.length > 0 ? (
            <div className="-mx-4 overflow-x-auto md:-mx-5">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="px-4 py-2.5 font-bold md:px-5">
                      {t("displayName")}
                    </th>
                    <th className="px-4 py-2.5 font-bold md:px-5">{t("email")}</th>
                    <th className="px-4 py-2.5 text-right font-bold md:px-5"> </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.uid}
                      className="border-b border-glass-border last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold md:px-5">
                        {headlineName(student)}
                      </td>
                      <td className="px-4 py-3 text-muted md:px-5">
                        {student.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right md:px-5">
                        <Button
                          variant="secondary"
                          className="h-8 px-3 text-xs"
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
            </div>
          ) : (
            <p className="text-sm text-muted">{t("profileNoStudents")}</p>
          )}
        </>
      )}
    </SettingsPanelShell>
  );
}
