import { Suspense } from "react";
import { SsoConsumePage } from "@/components/chrome/sso-consume-page";

export default function PulseSsoPage() {
  return (
    <Suspense
      fallback={
        <div className="mesh-bg flex min-h-[100svh] items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <SsoConsumePage homePath="/home" />
    </Suspense>
  );
}
