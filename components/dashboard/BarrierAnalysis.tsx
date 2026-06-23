import type { AggregationResult } from "@/lib/types";

export const DASHBOARD_BARRIERS_SECTION_ID = "dashboard-barriers";

interface BarrierAnalysisProps {
  aggregation: AggregationResult;
}

const SEVERITY_STYLES = [
  { label: "Critical", bar: "bg-error", text: "text-error" },
  { label: "High", bar: "bg-tertiary-container", text: "text-tertiary" },
  { label: "Medium", bar: "bg-secondary", text: "text-secondary" },
  { label: "Low", bar: "bg-outline", text: "text-outline" },
];

function severityForIndex(index: number) {
  return SEVERITY_STYLES[Math.min(index, SEVERITY_STYLES.length - 1)];
}

export default function BarrierAnalysis({ aggregation }: BarrierAnalysisProps) {
  const entries = Object.entries(aggregation.barrierAnalysis).sort(
    (a, b) => b[1].count - a[1].count,
  );

  return (
    <section
      id={DASHBOARD_BARRIERS_SECTION_ID}
      className="stitch-dash-section scroll-mt-20"
    >
      <div className="stitch-dash-section-header">
        <div>
          <h4 className="text-xl font-semibold text-on-surface">
            Discovery barriers
          </h4>
          <p className="text-sm text-on-surface-variant">
            Why do users struggle to discover new music? Ranked friction from
            Spotify reviews.
          </p>
        </div>
      </div>
      <div className="p-6">
        {entries.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No barrier data available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
            {entries.map(([label, { pct }], index) => {
              const severity = severityForIndex(index);
              return (
                <div key={label} className="flex items-center gap-4">
                  <span className="stitch-mono-data w-6 text-outline">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-on-surface">{label}</span>
                      <span className={severity.text}>{severity.label}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${severity.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
