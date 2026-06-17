"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS, frequencyToChartData } from "@/lib/chart-data";
import type { AggregationResult } from "@/lib/types";
import Card from "@/components/ui/Card";

interface SegmentBreakdownProps {
  aggregation: AggregationResult;
}

export default function SegmentBreakdown({
  aggregation,
}: SegmentBreakdownProps) {
  const data = frequencyToChartData(aggregation.segmentBreakdown);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (data.length === 0) {
    return (
      <Card title="User segments">
        <p className="text-sm text-on-surface-variant">No segment data available.</p>
      </Card>
    );
  }

  return (
    <Card title="User segments" className="flex flex-col">
      <div className="relative h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const count = typeof value === "number" ? value : 0;
                const payload = item?.payload as { pct?: number; name?: string };
                return [
                  `${payload?.pct ?? 0}% (${count} reviews)`,
                  payload?.name ?? "",
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-on-surface">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
            Total
          </span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between text-xs text-on-surface-variant"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              {item.name}
            </span>
            <span className="font-mono text-on-surface">{item.pct}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
