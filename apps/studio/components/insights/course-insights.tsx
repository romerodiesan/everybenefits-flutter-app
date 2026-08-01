"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatusChip } from "@/components/academy/shared";
import dynamic from "next/dynamic";
import { LearnersTable } from "@/components/insights/learners-table";
import {
  fetchCourseInsights,
  type CourseInsightsResult,
  type InsightsRangeDays,
} from "@/lib/firebase/insights";
import type { CourseStatus } from "@/lib/types";
import { FunctionsUnavailableError } from "@pulse/firebase-client";
import { Skeleton } from "@/components/ui/skeleton";

const ProgressDistributionChart = dynamic(
  () =>
    import("@/components/insights/charts/progress-chart").then(
      (m) => m.ProgressDistributionChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-2xl" />,
  },
);
const LessonFunnelChart = dynamic(
  () =>
    import("@/components/insights/charts/funnel-chart").then(
      (m) => m.LessonFunnelChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-2xl" />,
  },
);
const QuizPerformanceChart = dynamic(
  () =>
    import("@/components/insights/charts/quiz-chart").then(
      (m) => m.QuizPerformanceChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-2xl" />,
  },
);

const RANGES: Array<{ value: InsightsRangeDays; key: string }> = [
  { value: null, key: "insightsRangeAll" },
  { value: 7, key: "insightsRange7d" },
  { value: 30, key: "insightsRange30d" },
  { value: 90, key: "insightsRange90d" },
];

export function CourseInsights({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [rangeDays, setRangeDays] = useState<InsightsRangeDays>(null);
  const [data, setData] = useState<CourseInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCourseInsights(courseId, rangeDays, { learnerLimit: 0 })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof FunctionsUnavailableError) {
          setError(t("insightsFunctionsUnavailable"));
        } else {
          setError(t("insightsLoadError"));
        }
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, rangeDays, t]);

  if (loading && !data) {
    return <CourseInsightsSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/insights" className="text-xs font-semibold text-brand">
          ← {t("insightsBack")}
        </Link>
        <p className="mt-6 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const status = (["draft", "pending", "published"].includes(data.status)
    ? data.status
    : "draft") as CourseStatus;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/insights" className="text-xs font-semibold text-brand">
            ← {t("insightsBack")}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl">{data.title}</h1>
            <StatusChip status={status} />
          </div>
          <Link
            href={`/courses/${courseId}`}
            className="mt-1 inline-block text-xs font-semibold text-brand"
          >
            {t("insightsOpenWorkspace")} →
          </Link>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-glass-border p-1">
          {RANGES.map((range) => {
            const active = rangeDays === range.value;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setRangeDays(range.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-brand text-on-brand"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t(range.key)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("insightsEnrolled")} value={data.kpis.enrolled} />
        <Kpi
          label={t("insightsInProgress")}
          value={data.kpis.inProgress ?? data.kpis.active}
        />
        <Kpi label={t("insightsCompleted")} value={data.kpis.completed} />
        <Kpi
          label={t("insightsCompletion")}
          value={`${Math.round(data.kpis.completionRate * 100)}%`}
        />
        <Kpi
          label={t("insightsAvgProgress")}
          value={`${Math.round((data.kpis.avgProgress ?? 0) * 100)}%`}
        />
        <Kpi label={t("insightsAtRisk")} value={data.kpis.stalled} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("insightsProgressDist")}>
          {data.kpis.enrolled === 0 ? (
            <EmptyHint text={t("insightsNoLearners")} />
          ) : (
            <ProgressDistributionChart buckets={data.progressBuckets} />
          )}
        </ChartCard>
        <ChartCard title={t("insightsQuizPass")}>
          {data.quizStats.length === 0 ? (
            <EmptyHint text={t("studioQuizEmpty")} />
          ) : (
            <QuizPerformanceChart quizzes={data.quizStats} />
          )}
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title={t("insightsFunnel")}>
          {data.lessonFunnel.length === 0 ? (
            <EmptyHint text={t("workspaceNoLesson")} />
          ) : (
            <LessonFunnelChart funnel={data.lessonFunnel} />
          )}
        </ChartCard>
      </div>

      {(data.dropOffs.length > 0 || data.stuckOnQuiz.length > 0) && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {data.dropOffs.length > 0 ? (
            <section className="studio-panel p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("insightsDropoffCallouts")}
              </h3>
              <ul className="mt-3 space-y-2">
                {data.dropOffs.map((row) => (
                  <li
                    key={row.lessonId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">{row.title}</span>
                    <span className="shrink-0 text-xs text-warn">
                      −{Math.round((row.dropFromPrev ?? 0) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {data.stuckOnQuiz.length > 0 ? (
            <section className="studio-panel p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("insightsStuckQuiz")}
              </h3>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {data.stuckOnQuiz.slice(0, 12).map((row) => (
                  <li
                    key={`${row.uid}-${row.lessonId}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {row.displayName || row.uid.slice(0, 8)}
                      <span className="text-muted"> · {row.lessonTitle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {row.score}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <div className="mt-8">
        <LearnersTable
          courseId={courseId}
          courseTitle={data.title}
          locale={locale}
          rangeDays={rangeDays}
        />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="studio-panel px-4 py-3"
    >
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </motion.div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="studio-panel p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted">{text}</p>;
}

function CourseInsightsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-6 py-8">
      <div className="h-4 w-24 rounded bg-muted/20" />
      <div className="mt-3 h-9 w-72 rounded bg-muted/20" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="studio-panel h-20" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="studio-panel h-64" />
        <div className="studio-panel h-64" />
      </div>
    </div>
  );
}
