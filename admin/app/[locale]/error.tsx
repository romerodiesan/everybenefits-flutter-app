"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const es = locale === "es";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-[5rem] font-extrabold leading-none text-red-400/80">
          500
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {es ? "Algo falló" : "Something broke"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {es
            ? "Hubo un error inesperado. Inténtalo en un momento."
            : "We hit an unexpected error. Try again in a moment."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand"
          >
            {es ? "Reintentar" : "Try again"}
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-glass-border px-4 text-sm font-semibold"
          >
            {es ? "Volver al inicio" : "Back to home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
