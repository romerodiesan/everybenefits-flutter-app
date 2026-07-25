"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/providers/auth-provider";

export function LandingCtaFooter() {
  const t = useTranslations();
  const { user, profile, loading } = useAuth();
  const signedIn = Boolean(user && profile);
  const reduced = useSafeReducedMotion();

  return (
    <section className="cine-bg relative overflow-hidden border-t border-glass-border px-6 pb-6 pt-14 md:pt-16">
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          className="max-w-2xl"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
            {t("landingCtaTitle")}
          </h2>
          <p className="mt-2 text-muted md:text-lg">{t("landingCtaSub")}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {!loading && signedIn ? (
              <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
                  <Link href="/login">
                    <Button className="min-w-36">{t("ctaEnter")}</Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={reduced ? undefined : { scale: 1.03 }}>
                  <Link href="/register">
                    <Button variant="secondary" className="min-w-36">
                      {t("ctaRegister")}
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>

        <motion.p
          aria-hidden
          className="pointer-events-none mt-10 select-none whitespace-nowrap font-display text-[15vw] font-extrabold leading-[0.78] tracking-[-0.05em] text-ink/[0.06]"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {t("brand")}
        </motion.p>

        <footer className="mt-4 border-t border-glass-border pt-4 text-xs text-muted">
          © {new Date().getFullYear()} {t("footerRights")}
        </footer>
      </div>
    </section>
  );
}
