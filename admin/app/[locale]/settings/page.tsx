import { AdminShell } from "@/components/chrome/admin-shell";
import { SettingsHome } from "@/components/admin/settings-home";

export default function SettingsPage() {
  return (
    <AdminShell>
      <SettingsHome />
    </AdminShell>
  );
}
