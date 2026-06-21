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
import { CHART_COLORS, frequencyToChartData } from "@/lib/chart-data";
import type { FrequencyEntry } from "@/lib/types";
import Card from "@/components/ui/Card";

interface FrequencyChartProps {
  title: string;
  subtitle?: string;
  frequency: Record<string, FrequencyEntry>;
}

export default function FrequencyChart({
  title,
  subtitle,
  frequency,
}: FrequencyChartProps) {
  const data = frequencyToChartData(frequency);

  if (data.length === 0) {
    return (
      <Card title={title} subtitle={subtitle}>
        <p className="text-sm text-on-surface-variant">No data available.</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="#c7c4d7"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: "#464554", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 12, fill: "#1b1b23" }}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const count = typeof value === "number" ? value : 0;
                const payload = item?.payload as { pct?: number; name?: string };
                return [
                  `${payload?.pct ?? 0}% (${count} reviews)`,
                  payload?.name ?? "Share",
                ];
              }}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
