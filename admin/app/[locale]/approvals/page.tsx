import { AdminShell } from "@/components/chrome/admin-shell";
import { ApprovalsHome } from "@/components/admin/approvals-home";

export default function ApprovalsPage() {
  return (
    <AdminShell>
      <ApprovalsHome />
    </AdminShell>
  );
}
