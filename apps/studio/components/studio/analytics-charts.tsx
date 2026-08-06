"use client";

/**
 * Recharts surface for Studio analytics.
 * Prefer importing this module only from course-detail analytics UI so the
 * landing table does not pay for the chart library until a course is opened
 * (see analytics-home dynamic import of AnalyticsCourseDetail).
 */
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
