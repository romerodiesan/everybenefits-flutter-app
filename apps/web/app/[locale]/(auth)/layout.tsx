import { Suspense } from "react";
import { AuthenticatedTree } from "@/components/chrome/authenticated-tree";

/** Login / register / SSO — needs Auth, no AppShell. */
export default function AuthFormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedTree>
      <Suspense fallback={null}>{children}</Suspense>
    </AuthenticatedTree>
  );
}
