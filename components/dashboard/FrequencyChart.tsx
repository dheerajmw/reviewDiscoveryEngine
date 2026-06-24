"use client";

import { useMemo, useState } from "react";
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
import Icon from "@/components/ui/Icon";

const PREVIEW_LIMIT = 5;
const ROW_HEIGHT_PX = 46;
const CHART_PADDING_PX = 36;

interface FrequencyChartProps {
  title: string;
  subtitle?: string;
  frequency: Record<string, FrequencyEntry>;
}

function axisLabelWidth(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(240, Math.max(148, Math.ceil(longest * 6.2)));
}

function formatAxisLabel(label: string, maxLength = 28): string {
  if (label.length <= maxLength) return label;
  const breakAt = label.lastIndexOf(" ", maxLength);
  const cut = breakAt > 12 ? breakAt : maxLength;
  return `${label.slice(0, cut)}…`;
}

export default function FrequencyChart({
  title,
  subtitle,
  frequency,
}: FrequencyChartProps) {
  const [expanded, setExpanded] = useState(false);
  const data = useMemo(
    () => frequencyToChartData(frequency).filter((item) => item.count > 0),
    [frequency],
  );
  const hasMore = data.length > PREVIEW_LIMIT;
  const visible = expanded ? data : data.slice(0, PREVIEW_LIMIT);
  const chartHeight = Math.max(200, visible.length * ROW_HEIGHT_PX + CHART_PADDING_PX);
  const yAxisWidth = axisLabelWidth(visible.map((item) => item.name));

  if (data.length === 0) {
    return (
      <Card title={title} subtitle={subtitle}>
        <p className="text-sm text-on-surface-variant">No data available.</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visible}
            layout="vertical"
            margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="#c7c4d7"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: "#464554", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              interval={0}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={3}
                  textAnchor="end"
                  fill="#1b1b23"
                  fontSize={11}
                  fontWeight={500}
                >
                  {formatAxisLabel(String(payload?.value ?? ""))}
                </text>
              )}
            />
            <Tooltip
              formatter={(_value, _name, item) => {
                const payload = item?.payload as {
                  pct?: number;
                  name?: string;
                  count?: number;
                };
                return [
                  `${payload?.pct ?? 0}% (${payload?.count ?? 0} reviews)`,
                  payload?.name ?? "Share",
                ];
              }}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {visible.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface-container"
        >
          <span>
            {expanded
              ? `Showing all ${data.length} categories`
              : `Show ${data.length - PREVIEW_LIMIT} more categories`}
          </span>
          <Icon
            name={expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            className="text-lg"
          />
        </button>
      ) : null}
    </Card>
  );
}
