import { AdminShell } from "@/components/chrome/admin-shell";
import { UsersHome } from "@/components/admin/users-home";

export default function UsersPage() {
  return (
    <AdminShell>
      <UsersHome />
    </AdminShell>
  );
}
