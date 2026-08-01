import { Suspense } from "react";
import { SsoBridgePage } from "@/components/chrome/sso-bridge-page";

export default function AdminBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <SsoBridgePage loginPath="/login" />
    </Suspense>
  );
}
