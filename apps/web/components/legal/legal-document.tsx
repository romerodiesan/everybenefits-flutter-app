import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LegalDoc } from "@/lib/legal/content";

export async function LegalDocument({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations();

  return (
    <div className="mesh-bg min-h-[100svh]">
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <Link
          href="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← {t("legalBackHome")}
        </Link>

        <header className="mt-8 border-b border-glass-border pb-6">
          <p className="font-display text-sm font-bold tracking-tight text-brand">
            {t("brand")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("legalUpdated")}</p>
        </header>

        <article className="legal-prose pb-16 pt-2">
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={`${section.title}-p-${i}`}>{paragraph}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul>
                  {section.bullets.map((item, i) => (
                    <li key={`${section.title}-b-${i}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <p className="mt-10">
            <a href={`mailto:${t("legalContact")}`}>{t("legalContact")}</a>
          </p>
        </article>
      </div>
    </div>
  );
}
