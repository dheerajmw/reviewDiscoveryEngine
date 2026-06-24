import type { AggregationResult } from "@/lib/types";
import {
  BARRIER_FALLBACK,
  getTaxonomyDisplayLabel,
  isBarrierFallbackLabel,
} from "@/lib/taxonomy";

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

const FALLBACK_STYLE = {
  label: "Unclassified",
  bar: "bg-outline-variant",
  text: "text-on-surface-variant",
};

function severityForIndex(index: number, isFallback: boolean) {
  if (isFallback) return FALLBACK_STYLE;
  return SEVERITY_STYLES[Math.min(index, SEVERITY_STYLES.length - 1)];
}

export default function BarrierAnalysis({ aggregation }: BarrierAnalysisProps) {
  const entries = Object.entries(aggregation.barrierAnalysis)
    .filter(([, { count }]) => count > 0)
    .sort((a, b) => {
      const aFallback = isBarrierFallbackLabel(a[0]);
      const bFallback = isBarrierFallbackLabel(b[0]);
      if (aFallback !== bFallback) return aFallback ? 1 : -1;
      return b[1].count - a[1].count;
    });

  const fallbackEntry = entries.find(([label]) => isBarrierFallbackLabel(label));
  const fallbackPct = fallbackEntry?.[1].pct ?? 0;
  const classifiedEntries = entries.filter(
    ([label]) => !isBarrierFallbackLabel(label),
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
            Why users struggle to discover new music — ranked by how often each
            barrier appears in classified reviews.
          </p>
        </div>
      </div>
      <div className="p-6">
        {classifiedEntries.length === 0 && !fallbackEntry ? (
          <p className="text-sm text-on-surface-variant">
            No barrier data available.
          </p>
        ) : (
          <>
            {fallbackPct >= 15 ? (
              <p
                role="status"
                className="mb-6 rounded-lg border border-warning-container bg-warning-container px-4 py-3 text-sm text-on-warning-container"
              >
                {fallbackPct}% of reviews are tagged{" "}
                <span className="font-medium">{BARRIER_FALLBACK}</span> — the
                classifier could not map them to a specific barrier. Focus on the
                ranked barriers below for product signal; re-classify or inspect
                quotes to improve specificity.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              {classifiedEntries.map(([label, { pct }], index) => {
                const severity = severityForIndex(index, false);
                const displayLabel = getTaxonomyDisplayLabel("barrier", label);
                return (
                  <div key={label} className="flex items-center gap-4">
                    <span className="stitch-mono-data w-6 text-outline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between gap-2 text-xs font-medium">
                        <span className="text-on-surface">{displayLabel}</span>
                        <span className={`shrink-0 ${severity.text}`}>
                          {severity.label}
                        </span>
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
            {fallbackEntry ? (
              <div className="mt-8 border-t border-outline-variant/60 pt-6">
                <div className="flex items-center gap-4">
                  <span className="stitch-mono-data w-6 text-outline">—</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between gap-2 text-xs font-medium">
                      <span className="text-on-surface-variant">
                        {getTaxonomyDisplayLabel("barrier", fallbackEntry[0])}
                      </span>
                      <span className={FALLBACK_STYLE.text}>
                        {FALLBACK_STYLE.label} · {fallbackEntry[1].pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className={`h-full rounded-full ${FALLBACK_STYLE.bar}`}
                        style={{ width: `${fallbackEntry[1].pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-on-surface-variant">
                      Reviews with discovery frustration but no confident match
                      to a named barrier — not a user-stated category.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
