import { AppShell } from "@/components/chrome/app-shell";
import { EnrollmentsProvider } from "@/lib/providers/enrollments-provider";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EnrollmentsProvider>
      <AppShell>{children}</AppShell>
    </EnrollmentsProvider>
  );
}
