import { AdminShell } from "@/components/chrome/admin-shell";
import { OverviewHome } from "@/components/admin/overview-home";

export default function AdminHomePage() {
  return (
    <AdminShell>
      <OverviewHome />
    </AdminShell>
  );
}
