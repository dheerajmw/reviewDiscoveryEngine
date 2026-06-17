"use client";

import { useMemo, useState } from "react";
import { aggregateReviews } from "@/lib/aggregation";
import {
  buildReportJson,
  buildReportMarkdown,
  downloadFile,
} from "@/lib/export-report";
import {
  filterClassifiedReviews,
  getUniqueSources,
  type ConfidenceFilter,
  type SourceFilter,
} from "@/lib/filter-reviews";
import type {
  AggregationResult,
  ClassifiedReview,
  InsightResult,
} from "@/lib/types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Icon from "@/components/ui/Icon";
import BarrierAnalysis from "./BarrierAnalysis";
import Opportunities from "./Opportunities";
import RootCauses from "./RootCauses";
import SegmentBreakdown from "./SegmentBreakdown";
import ThemeChart from "./ThemeChart";

interface DashboardProps {
  classified: ClassifiedReview[];
  aggregation: AggregationResult;
  insights: InsightResult;
  usedMockClassifier: boolean;
  usedMockInsights: boolean;
  onReupload: () => void;
}

export default function Dashboard({
  classified,
  aggregation,
  insights,
  usedMockClassifier,
  usedMockInsights,
  onReupload,
}: DashboardProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("all");

  const sources = useMemo(() => getUniqueSources(classified), [classified]);

  const filteredAggregation = useMemo(() => {
    const filtered = filterClassifiedReviews(
      classified,
      sourceFilter,
      confidenceFilter,
    );
    return aggregateReviews(filtered);
  }, [classified, sourceFilter, confidenceFilter]);

  const filteredCount = filteredAggregation.totalReviews;
  const isFiltered = sourceFilter !== "all" || confidenceFilter !== "all";

  const handleExportJson = () => {
    const report = buildReportJson(classified, aggregation, insights);
    downloadFile(
      JSON.stringify(report, null, 2),
      "review-discovery-report.json",
      "application/json",
    );
  };

  const handleExportMarkdown = () => {
    downloadFile(
      buildReportMarkdown(aggregation, insights),
      "review-discovery-report.md",
      "text/markdown",
    );
  };

  return (
    <DashboardLayout
      reviewCount={aggregation.totalReviews}
      onReupload={onReupload}
      onExportMarkdown={handleExportMarkdown}
      onExportJson={handleExportJson}
    >
      {(usedMockClassifier || usedMockInsights) && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-container bg-warning-container px-4 py-3 text-sm text-on-warning-container">
          <Icon name="info" className="mt-0.5 shrink-0" />
          <p>
            Demo mode — some results use rule-based generation. Set{" "}
            <code className="font-mono text-xs">USE_MOCK_CLASSIFIER=false</code>{" "}
            and add an OpenRouter API key for full AI analysis.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterGroup>
          <FilterTab
            active={sourceFilter === "all"}
            onClick={() => setSourceFilter("all")}
            label="All sources"
          />
          {sources.map((source) => (
            <FilterTab
              key={source}
              active={sourceFilter === source}
              onClick={() => setSourceFilter(source)}
              label={source}
            />
          ))}
        </FilterGroup>
        <FilterGroup>
          <FilterTab
            active={confidenceFilter === "all"}
            onClick={() => setConfidenceFilter("all")}
            label="All confidence"
          />
          <FilterTab
            active={confidenceFilter === "high"}
            onClick={() => setConfidenceFilter("high")}
            label="High ≥0.5"
          />
          <FilterTab
            active={confidenceFilter === "low"}
            onClick={() => setConfidenceFilter("low")}
            label="Low &lt;0.5"
          />
        </FilterGroup>
        {isFiltered && (
          <span className="flex items-center text-xs text-on-surface-variant">
            {filteredCount} shown with filters
          </span>
        )}
      </div>

      <section className="relative overflow-hidden rounded-xl border border-outline-variant bg-gradient-to-br from-primary/5 to-surface-container-lowest p-6">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <Icon name="insights" className="text-8xl text-primary" />
        </div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          Executive summary
        </h3>
        <p className="max-w-3xl text-base leading-relaxed text-on-surface">
          {insights.summary}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ThemeChart aggregation={filteredAggregation} />
        </div>
        <div className="lg:col-span-2">
          <SegmentBreakdown aggregation={filteredAggregation} />
        </div>
      </div>

      <BarrierAnalysis aggregation={filteredAggregation} />

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h3 className="mb-4 text-base font-semibold text-on-surface">
          Discovery problems
        </h3>
        <ul className="space-y-3">
          {insights.discoveryProblems.map((problem) => (
            <li
              key={problem}
              className="flex gap-3 text-sm leading-relaxed text-on-surface-variant"
            >
              <Icon name="error_outline" className="shrink-0 text-error" />
              <span>{problem}</span>
            </li>
          ))}
        </ul>
      </section>

      <RootCauses insights={insights} />
      <Opportunities insights={insights} />
    </DashboardLayout>
  );
}

function FilterGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1">
      {children}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "bg-surface-container-lowest text-primary shadow-sm"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {label}
    </button>
  );
}
