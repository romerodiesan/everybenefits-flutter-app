"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressBucketId } from "@pulse/insights-metrics";

const BUCKET_LABEL: Record<ProgressBucketId, string> = {
  "0": "0%",
  "1-25": "1–25%",
  "26-50": "26–50%",
  "51-75": "51–75%",
  "76-99": "76–99%",
  "100": "100%",
};

export function ProgressDistributionChart({
  buckets,
}: {
  buckets: Array<{ id: ProgressBucketId; count: number }>;
}) {
  const data = buckets.map((b) => ({
    name: BUCKET_LABEL[b.id],
    count: b.count,
    full: b.id === "100",
  }));

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
            allowDecimals={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--brand) 8%, transparent)" }}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--glass-border)",
              borderRadius: 8,
              color: "var(--ink)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.full
                    ? "var(--ok)"
                    : "color-mix(in srgb, var(--brand) 75%, transparent)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
