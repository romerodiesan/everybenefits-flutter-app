"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LessonFunnelRow } from "@pulse/insights-metrics";

export function LessonFunnelChart({
  funnel,
}: {
  funnel: LessonFunnelRow[];
}) {
  const data = funnel.map((row, index) => ({
    name:
      row.title.length > 18 ? `${row.title.slice(0, 16)}…` : row.title,
    fullName: row.title,
    rate: Math.round(row.rate * 100),
    index: index + 1,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--glass-border)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Completion"]}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as
                | { fullName?: string }
                | undefined;
              return item?.fullName ?? "";
            }}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--glass-border)",
              borderRadius: 8,
              color: "var(--ink)",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="rate"
            fill="color-mix(in srgb, var(--brand) 80%, transparent)"
            radius={[0, 6, 6, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
