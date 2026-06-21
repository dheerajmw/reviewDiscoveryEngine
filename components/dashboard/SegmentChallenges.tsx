import type { CrossTabResult } from "@/lib/types";
import Card from "@/components/ui/Card";

interface SegmentChallengesProps {
  crossTab: CrossTabResult;
  title?: string;
}

export default function SegmentChallenges({
  crossTab,
  title = "Segment-specific discovery challenges",
}: SegmentChallengesProps) {
  if (crossTab.segments.length === 0) {
    return (
      <Card title={title} subtitle="Segment × theme cross-tab from full corpus.">
        <p className="text-sm text-on-surface-variant">No segment data available.</p>
      </Card>
    );
  }

  return (
    <Card
      title={title}
      subtitle="Top themes per user segment (% within segment)."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {crossTab.segments.map((segment) => {
          const ranked = crossTab.columns
            .map((col) => ({
              col,
              cell: crossTab.matrix[segment]?.[col] ?? { count: 0, pct: 0 },
            }))
            .filter((item) => item.cell.count > 0)
            .sort((a, b) => b.cell.pct - a.cell.pct)
            .slice(0, 4);

          return (
            <div
              key={segment}
              className="rounded-lg border border-outline-variant bg-surface-container-low p-4"
            >
              <h4 className="mb-3 text-sm font-semibold text-on-surface">
                {segment}
              </h4>
              <ul className="space-y-2">
                {ranked.map((item) => (
                  <li
                    key={item.col}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-on-surface-variant">{item.col}</span>
                    <span className="font-mono font-medium text-primary">
                      {item.cell.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
