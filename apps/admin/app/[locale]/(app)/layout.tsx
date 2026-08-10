import { AdminShell } from "@/components/chrome/admin-shell";

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
