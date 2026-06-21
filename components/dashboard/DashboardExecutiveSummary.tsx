"use client";

import type {
  AggregationResult,
  ResearchFindingsReport,
} from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface DashboardExecutiveSummaryProps {
  report: ResearchFindingsReport;
  aggregation: AggregationResult;
  discoveryRelevantCount: number;
  onViewFindings?: () => void;
}

export default function DashboardExecutiveSummary({
  report,
  aggregation,
  discoveryRelevantCount,
}: DashboardExecutiveSummaryProps) {
  const topTheme = aggregation.themeEvidence[0];
  const topFrustration = report.top_frustrations[0];
  const themePct = topTheme?.pct ?? topFrustration?.pct ?? 0;
  const themeLabel =
    topTheme?.label ?? topFrustration?.title ?? "discovery friction";
  const confidencePct = Math.round(report.why_discovery_fails.confidence * 100);
  const activeThemes = Object.keys(aggregation.themeFrequency).filter(
    (k) => (aggregation.themeFrequency[k]?.count ?? 0) > 0,
  ).length;
  const activeBarriers = Object.keys(aggregation.barrierAnalysis).filter(
    (k) => (aggregation.barrierAnalysis[k]?.count ?? 0) > 0,
  ).length;

  return (
    <section className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
      <div className="stitch-dash-card group relative flex flex-col justify-between overflow-hidden p-6 lg:col-span-2">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl transition-colors group-hover:bg-primary/10"
        />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <Icon name="auto_awesome" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Spotify discovery insight
            </span>
          </div>
          <h3 className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-on-surface md:text-[28px]">
            {themePct > 0 ? (
              <>
                <span className="font-bold text-primary">{themePct}% of reviews</span>{" "}
                point to{" "}
                <span className="underline decoration-primary/30 decoration-4 underline-offset-4">
                  {themeLabel}
                </span>{" "}
                as a top frustration.
              </>
            ) : (
              <>
                <span className="font-bold text-primary">
                  {discoveryRelevantCount} Spotify reviews
                </span>{" "}
                analyzed for music discovery patterns.
              </>
            )}
          </h3>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant">
            {report.why_discovery_fails.summary}
          </p>
        </div>
        <div className="relative mt-8 flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-primary">
              {(confidencePct / 10).toFixed(1)}/10
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
              Confidence score
            </span>
          </div>
          <div className="hidden h-10 w-px bg-outline-variant sm:block" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-on-surface">
              {discoveryRelevantCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
              Discovery reviews
            </span>
          </div>
          <div className="hidden h-10 w-px bg-outline-variant sm:block" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-on-surface">
              {report.why_discovery_fails.evidence_count.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
              Matched evidence
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-1">
        <div className="stitch-dash-card flex items-center justify-between p-4">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-outline">
              Active themes
            </p>
            <p className="text-[28px] font-bold text-primary">{activeThemes}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="category" filled />
          </div>
        </div>
        <div className="stitch-dash-card flex items-center justify-between p-4">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-outline">
              Discovery barriers
            </p>
            <p className="text-[28px] font-bold text-on-surface">
              {activeBarriers}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name="block" />
          </div>
        </div>
      </div>
    </section>
  );
}
