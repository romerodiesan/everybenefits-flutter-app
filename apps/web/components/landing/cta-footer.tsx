"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { Button } from "@/components/ui/primitives";
import { useCachedSignedInHint } from "@/lib/use-cached-signed-in-hint";
import { PulseField } from "@/components/landing/pulse-field";
import { legalUrls } from "@/lib/legal-links";

const RISE = [0.22, 1, 0.36, 1] as const;

export function LandingCtaFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const legal = legalUrls(locale);
  const signedIn = useCachedSignedInHint();
  const reduced = useSafeReducedMotion();

  return (
    <section className="grain relative overflow-hidden border-t border-glass-border px-6 pb-8 pt-20 md:pt-28">
      <PulseField intensity="soft" className="opacity-70" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: RISE }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
            {t("landingFieldKicker")}
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.75rem,8vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-ink">
            {t("landingCtaTitle")}
          </h2>
          <p className="mt-5 text-muted md:text-lg">{t("landingCtaSub")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {signedIn ? (
              <motion.div
                whileHover={reduced ? undefined : { y: -3, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div
                  whileHover={reduced ? undefined : { y: -3, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href="/register">
                    <Button className="min-w-36">{t("ctaJoin")}</Button>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={reduced ? undefined : { y: -3, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href="/login">
                    <Button variant="secondary" className="min-w-36">
                      {t("ctaEnter")}
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>

        <motion.p
          aria-hidden
          className="text-outline pointer-events-none mt-16 select-none whitespace-nowrap text-center font-display text-[16vw] font-extrabold uppercase leading-[0.78] tracking-[-0.05em] opacity-35 md:mt-20"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 0.35, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.75, ease: RISE }}
        >
          {t("brand")}
        </motion.p>

        <footer className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-glass-border pt-5 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("footerRights")}
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <a href={legal.privacy} className="hover:text-ink hover:underline">
              {t("footerPrivacy")}
            </a>
            <a href={legal.data} className="hover:text-ink hover:underline">
              {t("footerData")}
            </a>
            <a href={legal.cookies} className="hover:text-ink hover:underline">
              {t("footerCookies")}
            </a>
            <a href={legal.terms} className="hover:text-ink hover:underline">
              {t("footerTerms")}
            </a>
          </nav>
        </footer>
      </div>
    </section>
  );
}
