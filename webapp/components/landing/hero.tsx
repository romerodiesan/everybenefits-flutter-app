"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "next-intl";

export function LandingHero() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const signedIn = Boolean(user && profile);

  return (
    <section className="relative min-h-[100svh] overflow-hidden mesh-bg">
      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 pb-16 pt-8">
        <header className="flex items-center justify-between">
          <p className="font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            {t("brand")}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`hidden text-sm sm:inline ${locale === "es" ? "text-ink" : "text-muted hover:text-ink"}`}
              onClick={() => router.replace(pathname, { locale: "es" })}
            >
              ES
            </button>
            <button
              type="button"
              className={`hidden text-sm sm:inline ${locale === "en" ? "text-ink" : "text-muted hover:text-ink"}`}
              onClick={() => router.replace(pathname, { locale: "en" })}
            >
              EN
            </button>
            {!loading && !signedIn && (
              <Link href="/login">
                <Button variant="secondary">{t("navLogin")}</Button>
              </Link>
            )}
            {!loading && signedIn && (
              <Link href="/home">
                <Button>{t("ctaOpenApp")}</Button>
              </Link>
            )}
          </div>
        </header>

        <div className="mt-16 grid flex-1 items-center gap-12 lg:mt-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-xl">
            <p className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-7xl">
              {t("brand")}
            </p>
            <h1 className="mt-6 font-display text-2xl font-semibold text-ink/90 md:text-3xl">
              {t("heroHeadline")}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted md:text-lg">
              {t("heroSub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button className="min-w-36">{t("ctaEnter")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="secondary" className="min-w-36">
                      {t("ctaRegister")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[20px] border border-glass-border bg-sheet shadow-[0_20px_48px_-28px_rgba(0,0,0,0.35)] lg:min-h-[480px]">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-transparent to-brand/[0.06]" />
            <div className="absolute inset-6 flex flex-col justify-between">
              <div className="pulse-sheet p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("navHome")}
                </p>
                <p className="mt-2 font-display text-xl font-bold">
                  {t("landingFeatureForums")}
                </p>
              </div>
              <div className="pulse-sheet ml-auto w-[78%] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("navChats")}
                </p>
                <p className="mt-2 font-display text-lg font-bold">
                  {t("landingFeatureChats")}
                </p>
              </div>
              <div className="pulse-sheet w-[70%] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("navAcademy")}
                </p>
                <p className="mt-2 font-display text-lg font-bold">
                  {t("landingFeatureAcademy")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 text-sm text-muted">
          © {new Date().getFullYear()} {t("footerRights")}
        </footer>
      </div>
    </section>
  );
}
