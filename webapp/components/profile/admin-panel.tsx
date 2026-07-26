"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listStudentsForPromotion,
  setUserRole,
} from "@/lib/firebase/functions";
import { headlineName } from "@/lib/firebase/users";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { SettingsPanelShell } from "@/components/profile/settings-nav";

export function AdminPanel() {
  const t = useTranslations();
  const [students, setStudents] = useState<UserProfile[]>([]);

  useEffect(() => {
    listStudentsForPromotion()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  return (
    <SettingsPanelShell
      title={t("profileAdmin")}
      subtitle={t("profileAdminHint")}
    >
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
    </SettingsPanelShell>
  );
}
