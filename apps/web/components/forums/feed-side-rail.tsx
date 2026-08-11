"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { canAccessTools } from "@/lib/roles";
import type { ForumThread } from "@/lib/types";
import { useSavedThreadIds } from "@/lib/saved-threads";

type TopicStat = [string, number];

export function FeedSideRail({
  topics = [],
  activeTag = "",
  onSelectTag,
  threads = [],
  related = [],
  onOpenSaved,
}: {
  topics?: TopicStat[];
  activeTag?: string;
  onSelectTag?: (tag: string) => void;
  threads?: ForumThread[];
  related?: ForumThread[];
  onOpenSaved?: () => void;
}) {
  const t = useTranslations();
  const { profile } = useAuth();
  const access = useAccess();
  const savedIds = useSavedThreadIds();
  const showTools = profile && canAccessTools(access);

  const topicList: TopicStat[] = topics
    .filter(([, count]) => count > 0)
    .slice(0, 8);

  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const savedItems = [...savedIds]
    .slice(0, 5)
    .map((id) => ({ id, thread: byId.get(id) }));

  return (
    <aside className="hidden w-[280px] shrink-0 xl:block">
      <div className="sticky top-4 space-y-4">
        {topicList.length > 0 && (
          <section className="feed-rail-card">
            <h2 className="feed-rail-title">{t("forumsRailTrending")}</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSelectTag?.("")}
                className={`feed-topic ${!activeTag ? "feed-topic-active" : ""}`}
              >
                {t("forumsAllTags")}
              </button>
              {topicList.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    onSelectTag?.(tag === activeTag ? "" : tag)
                  }
                  className={`feed-topic ${activeTag === tag ? "feed-topic-active" : ""}`}
                >
                  #{tag}
                  <span className="ml-1 tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="feed-rail-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="feed-rail-title">{t("forumsRailSaved")}</h2>
            {savedItems.length > 0 && onOpenSaved && (
              <button
                type="button"
                onClick={onOpenSaved}
                className="text-[11px] font-bold text-brand"
              >
                {t("forumsModeSaved")}
              </button>
            )}
          </div>
          {savedItems.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t("forumsSavedEmpty")}
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1.5">
              {savedItems.map(({ id, thread }) => (
                <li key={id}>
                  <Link
                    href={`/home/${id}`}
                    className="block rounded-xl px-2 py-1.5 text-sm font-semibold leading-snug transition hover:bg-brand/8 hover:text-brand"
                  >
                    {thread?.title ?? t("forumsOpenThread")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {related.length > 0 && (
          <section className="feed-rail-card">
            <h2 className="feed-rail-title">{t("forumsRailRelated")}</h2>
            <ul className="mt-2.5 space-y-1.5">
              {related.slice(0, 4).map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/home/${thread.id}`}
                    className="block rounded-xl px-2 py-1.5 text-sm font-semibold leading-snug transition hover:bg-brand/8 hover:text-brand"
                  >
                    {thread.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="feed-rail-card">
          <h2 className="feed-rail-title">{t("forumsRailShortcuts")}</h2>
          <div className="mt-2.5 space-y-1">
            <Link
              href="/academy"
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold transition hover:bg-brand/8 hover:text-brand"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/12 text-brand">
                ▣
              </span>
              {t("forumsRailAcademy")}
            </Link>
            {showTools && (
              <Link
                href="/tools/afc"
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold transition hover:bg-brand/8 hover:text-brand"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/12 text-brand">
                  $
                </span>
                {t("afcQuoteCardTitle")}
              </Link>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
