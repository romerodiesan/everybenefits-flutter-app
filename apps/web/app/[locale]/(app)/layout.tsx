import { AuthenticatedTree } from "@/components/chrome/authenticated-tree";
import { EnrollmentsProvider } from "@/lib/providers/enrollments-provider";
import { InboxProvider } from "@/lib/providers/inbox-provider";
import { AppShell } from "@/components/chrome/app-shell";
import { MfaAdminGate } from "@/components/chrome/mfa-admin-gate";
import { ConsentBanner } from "@/components/chrome/consent-banner";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedTree>
      <InboxProvider>
        <EnrollmentsProvider>
          <MfaAdminGate>
            <AppShell>{children}</AppShell>
            <ConsentBanner />
          </MfaAdminGate>
        </EnrollmentsProvider>
      </InboxProvider>
    </AuthenticatedTree>
  );
}
