import { Suspense } from "react";
import { SsoBridgePage } from "@/components/chrome/sso-bridge-page";

export default function PulseBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="mesh-bg flex min-h-[100svh] items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <SsoBridgePage loginPath="/login" />
    </Suspense>
  );
}
