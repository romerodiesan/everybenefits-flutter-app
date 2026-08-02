import { AdminShell } from "@/components/chrome/admin-shell";
import { OrganizationsHome } from "@/components/admin/organizations-home";

export default function OrganizationsPage() {
  return (
    <AdminShell>
      <OrganizationsHome />
    </AdminShell>
  );
}
