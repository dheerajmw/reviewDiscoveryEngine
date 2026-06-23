"use client";

import { frequencyToChartData } from "@/lib/chart-data";
import type { AggregationResult } from "@/lib/types";
import Card from "@/components/ui/Card";

export const DASHBOARD_THEMES_SECTION_ID = "dashboard-themes";

interface ThemeChartProps {
  aggregation: AggregationResult;
}

export default function ThemeChart({ aggregation }: ThemeChartProps) {
  const data = frequencyToChartData(aggregation.themeFrequency).slice(0, 6);

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
        {data.map((item, index) => (
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
    </Card>
  );
}
