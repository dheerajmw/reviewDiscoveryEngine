"use client";

import { useState } from "react";
import { frequencyToChartData } from "@/lib/chart-data";
import type { AggregationResult } from "@/lib/types";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";

export const DASHBOARD_THEMES_SECTION_ID = "dashboard-themes";

const THEME_PREVIEW_LIMIT = 5;

interface ThemeChartProps {
  aggregation: AggregationResult;
}

export default function ThemeChart({ aggregation }: ThemeChartProps) {
  const [expanded, setExpanded] = useState(false);
  const data = frequencyToChartData(aggregation.themeFrequency).filter(
    (item) => item.count > 0,
  );
  const hasMore = data.length > THEME_PREVIEW_LIMIT;
  const visible = expanded ? data : data.slice(0, THEME_PREVIEW_LIMIT);

  if (data.length === 0) {
    return (
      <Card id={DASHBOARD_THEMES_SECTION_ID} title="Discovery themes" className="scroll-mt-20">
        <p className="text-sm text-on-surface-variant">No theme data available.</p>
      </Card>
    );
  }

  return (
    <Card
      id={DASHBOARD_THEMES_SECTION_ID}
      title="Discovery themes"
      subtitle="Frustrations and positive discovery experiences (Q2)"
      className="scroll-mt-20"
    >
      <div className="space-y-6">
        {visible.map((item, index) => (
          <div key={item.name} className="space-y-2">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wide">
              <span className="text-on-surface">{item.name}</span>
              <span className="font-bold text-primary">{item.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={`h-full rounded-full bg-primary transition-all duration-700 ${
                  index > 2 ? "opacity-60" : ""
                }`}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-6 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface-container"
        >
          <span>
            {expanded
              ? `Showing all ${data.length} themes`
              : `Show ${data.length - THEME_PREVIEW_LIMIT} more themes`}
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
