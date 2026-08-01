import { Suspense } from "react";
import { LogoutPage } from "@/components/chrome/logout-page";

export default function AdminLogoutRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <LogoutPage />
    </Suspense>
  );
}
