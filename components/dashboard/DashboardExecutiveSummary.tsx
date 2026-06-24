"use client";

import type {
  AggregationResult,
  ExecutiveResearchReport,
  ResearchFindingsReport,
} from "@/lib/types";
import Icon from "@/components/ui/Icon";
import { isBarrierFallbackLabel } from "@/lib/taxonomy";
import { DASHBOARD_BARRIERS_SECTION_ID } from "./BarrierAnalysis";
import { DASHBOARD_THEMES_SECTION_ID } from "./ThemeChart";

interface DashboardExecutiveSummaryProps {
  report: ResearchFindingsReport;
  aggregation: AggregationResult;
  discoveryRelevantCount: number;
  executive?: ExecutiveResearchReport;
  onViewFindings?: () => void;
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function SummaryStatCard({
  label,
  value,
  actionLabel,
  valueClassName = "text-on-surface",
  icon,
  iconContainerClassName,
  onClick,
}: {
  label: string;
  value: number;
  actionLabel: string;
  valueClassName?: string;
  icon: string;
  iconContainerClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${actionLabel} (${value} ${label.toLowerCase()})`}
      className="group stitch-dash-card flex w-full flex-col p-4 text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="min-h-[2rem] pt-0.5 text-[10px] font-semibold uppercase leading-snug tracking-widest text-outline transition-colors group-hover:text-primary">
          {label}
        </p>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${iconContainerClassName} group-hover:bg-primary group-hover:text-on-primary`}
        >
          <Icon name={icon} filled={icon === "category"} className="text-[22px]" />
        </div>
      </div>

      <p
        className={`mt-1.5 text-[28px] font-bold leading-none tabular-nums ${valueClassName}`}
      >
        {value}
      </p>

      <span className="mt-auto inline-flex items-center gap-1 pt-2.5 text-xs font-semibold text-primary">
        {actionLabel}
        <Icon
          name="arrow_forward"
          className="text-sm transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

export default function DashboardExecutiveSummary({
  report,
  aggregation,
  discoveryRelevantCount,
  executive,
}: DashboardExecutiveSummaryProps) {
  const headline =
    executive?.dashboard_headline ??
    report.why_discovery_fails.summary;

  const positiveCount =
    executive?.positive_discovery_signals?.length ??
    aggregation.themeEvidence.filter((t) =>
      [
        "Positive Discovery Experience",
        "Strong Discovery Playlists",
        "Recommendation Success",
        "Successful Artist Discovery",
        "Discovery Delight",
      ].includes(t.label),
    ).length;

  const activeThemes = Object.keys(aggregation.themeFrequency).filter(
    (k) => (aggregation.themeFrequency[k]?.count ?? 0) > 0,
  ).length;
  const activeBarriers = Object.keys(aggregation.barrierAnalysis).filter(
    (k) =>
      (aggregation.barrierAnalysis[k]?.count ?? 0) > 0 &&
      !isBarrierFallbackLabel(k),
  ).length;
  const findingCount =
    (executive?.top_discovery_problems?.length ?? 0) +
    (executive?.positive_discovery_signals?.length ?? 0);

  return (
    <section className="grid grid-cols-1 gap-gutter lg:grid-cols-3 lg:items-start">
      <div className="stitch-dash-card group relative flex flex-col overflow-hidden p-6 lg:col-span-2">
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
            {headline}
          </h3>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-6">
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
            <span className="text-2xl font-bold text-primary">
              {findingCount > 0 ? findingCount : report.why_discovery_fails.evidence_count}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
              Executive findings
            </span>
          </div>
          {positiveCount > 0 ? (
            <>
              <div className="hidden h-10 w-px bg-outline-variant sm:block" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-on-surface">
                  {positiveCount}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-outline">
                  Positive signals
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SummaryStatCard
          label="Active themes"
          value={activeThemes}
          actionLabel="View theme breakdown"
          valueClassName="text-primary"
          icon="category"
          iconContainerClassName="bg-primary/10 text-primary"
          onClick={() => scrollToSection(DASHBOARD_THEMES_SECTION_ID)}
        />
        <SummaryStatCard
          label="Discovery barriers"
          value={activeBarriers}
          actionLabel="View barrier analysis"
          valueClassName="text-primary"
          icon="block"
          iconContainerClassName="bg-secondary-container text-on-secondary-container"
          onClick={() => scrollToSection(DASHBOARD_BARRIERS_SECTION_ID)}
        />
      </div>
    </section>
  );
}
