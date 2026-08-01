import { Suspense } from "react";
import { LoginPage } from "@/components/chrome/login-page";

export default function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="admin-bg flex min-h-screen items-center justify-center text-sm text-muted">
          …
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
