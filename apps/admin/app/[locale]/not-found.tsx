"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const locale = useLocale();
  const es = locale === "es";
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-[5rem] font-extrabold leading-none text-brand/80">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {es ? "Página no encontrada" : "Page not found"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {es
            ? "Ese enlace no lleva a ningún sitio en Studio."
            : "That link doesn't lead anywhere in Studio."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand"
        >
          {es ? "Volver al inicio" : "Back to home"}
        </Link>
      </div>
    </div>
  );
}
