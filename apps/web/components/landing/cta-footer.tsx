"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { Button } from "@pulse/ui";
import { useAuth } from "@/lib/providers/auth-provider";

export function LandingCtaFooter() {
  const t = useTranslations();
  const { user, profile, loading } = useAuth();
  const signedIn = Boolean(user && profile);
  const reduced = useSafeReducedMotion();

  return (
    <section className="cine-bg relative overflow-hidden border-t border-glass-border px-6 pb-8 pt-16 md:pt-20">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
        animate={reduced ? undefined : { opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-[clamp(2.75rem,8vw,6.5rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-ink">
            {t("landingCtaTitle")}
          </h2>
          <p className="mt-5 text-muted md:text-lg">{t("landingCtaSub")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {!loading && signedIn ? (
              <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
                  <Link href="/register">
                    <Button className="min-w-36">{t("ctaJoin")}</Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
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
          className="text-outline pointer-events-none mt-16 select-none whitespace-nowrap text-center font-display text-[15vw] font-extrabold uppercase leading-[0.78] tracking-[-0.05em] opacity-40"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 0.4, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("brand")}
        </motion.p>

        <footer className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-glass-border pt-5 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("footerRights")}
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink hover:underline">
              {t("footerPrivacy")}
            </Link>
            <Link href="/terms" className="hover:text-ink hover:underline">
              {t("footerTerms")}
            </Link>
          </nav>
        </footer>
      </div>
    </section>
  );
}
