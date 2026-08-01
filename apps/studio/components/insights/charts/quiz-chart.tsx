"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuizStatRow } from "@pulse/insights-metrics";

export function QuizPerformanceChart({
  quizzes,
}: {
  quizzes: QuizStatRow[];
}) {
  const data = quizzes.map((row) => ({
    name:
      row.title.length > 16 ? `${row.title.slice(0, 14)}…` : row.title,
    fullName: row.title,
    passRate: Math.round(row.passRate * 100),
    avgScore: row.avgScore == null ? 0 : Math.round(row.avgScore),
    attempts: row.attempts,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--glass-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            formatter={(value, name) => [
              `${value}%`,
              name === "passRate" ? "Pass rate" : "Avg score",
            ]}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as
                | { fullName?: string; attempts?: number }
                | undefined;
              if (!item) return "";
              return `${item.fullName ?? ""} · ${item.attempts ?? 0} attempts`;
            }}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--glass-border)",
              borderRadius: 8,
              color: "var(--ink)",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
          />
          <Bar
            dataKey="passRate"
            name="Pass rate"
            fill="var(--brand)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="avgScore"
            name="Avg score"
            fill="color-mix(in srgb, var(--ok) 85%, transparent)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
