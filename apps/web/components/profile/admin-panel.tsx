"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listPendingApprovals,
  listStudentsForPromotion,
  setUserApproval,
  setUserRole,
} from "@/lib/firebase/functions";
import { headlineName } from "@/lib/display-name";
import { useAccess } from "@/lib/providers/auth-provider";
import { can } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { SettingsPanelShell } from "@/components/profile/settings-nav";

export function AdminPanel() {
  const t = useTranslations();
  const access = useAccess();
  const canPromote = can(access, "admin.users.update");
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [pending, setPending] = useState<UserProfile[]>([]);

  useEffect(() => {
    listPendingApprovals()
      .then(setPending)
      .catch(() => setPending([]));
    if (canPromote) {
      listStudentsForPromotion()
        .then(setStudents)
        .catch(() => setStudents([]));
    }
  }, [canPromote]);

  return (
    <SettingsPanelShell
      title={t("profileAdmin")}
      subtitle={t("profileAdminHint")}
    >
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
                        size="sm"
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
                        size="sm"
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

      {canPromote && (
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
                          size="sm"
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
