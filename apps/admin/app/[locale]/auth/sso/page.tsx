import { Suspense } from "react";
import { SsoConsumePage } from "@/components/chrome/sso-consume-page";

export default function AdminSsoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <SsoConsumePage homePath="/" />
    </Suspense>
  );
}
