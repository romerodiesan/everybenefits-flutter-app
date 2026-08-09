import { Suspense } from "react";
import { LogoutPage } from "@/components/chrome/logout-page";

export default function PulseLogoutRoute() {
  return (
    <Suspense
      fallback={
        <div className="mesh-bg flex min-h-[100svh] items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <LogoutPage />
    </Suspense>
  );
}
