import { AuthenticatedTree } from "@/components/chrome/authenticated-tree";

/** Login / register / SSO — needs Auth, no AppShell. */
export default function AuthFormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedTree>{children}</AuthenticatedTree>;
}
