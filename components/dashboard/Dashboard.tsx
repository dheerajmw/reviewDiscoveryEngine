"use client";

import { useMemo, useState } from "react";
import { EXPORT_REPORT_BASENAME, PLATFORM_ASSISTANT_NAME } from "@/lib/brand";
import { exportDashboardPdf } from "@/lib/export-dashboard-pdf";
import { filterDiscoveryReviews } from "@/lib/analysis-modes";
import { aggregateReviewSubset } from "@/lib/aggregation";
import { buildAnalysisContext } from "@/lib/chat-context";
import { computeExecutiveInsights } from "@/lib/insights-client";
import { computeFindings } from "@/lib/findings-client";
import { ensureFindingsReport } from "@/lib/findings";
import {
  buildPmReportJson,
  buildPmReportMarkdown,
  downloadPmReportJson,
  downloadPmReportMarkdown,
  exportPmReportPdf,
} from "@/lib/export-pm-report";
import { buildOpportunitiesFromEvidence } from "@/lib/opportunity-evidence";
import { assignReviewIds } from "@/lib/review-ids";
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
import { downloadClassifiedCsv } from "@/lib/export-csv";
import type {
  AnalysisBundle,
  AnalysisRunSummary,
  ClassifiedReview,
  QuoteEvidence,
} from "@/lib/types";
import ChatPanel from "@/components/chat/ChatPanel";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Icon from "@/components/ui/Icon";
import ClusterEvidencePanel from "./evidence/ClusterEvidencePanel";
import FindingDetailDrawer, {
  type DrawerSelection,
} from "./evidence/FindingDetailDrawer";
import DashboardExecutiveSummary from "./DashboardExecutiveSummary";
import ExecutiveResearchPanel from "./ExecutiveResearchPanel";
import BarrierAnalysis from "./BarrierAnalysis";
import FrequencyChart from "./FrequencyChart";
import Opportunities from "./Opportunities";
import ResearchFindingsSummary from "./ResearchFindingsSummary";
import RootCauses from "./RootCauses";
import SegmentBreakdown from "./SegmentBreakdown";
import SegmentChallenges from "./SegmentChallenges";
import { EvidenceSection, SectionHeader } from "./SectionHeader";
import ThemeChart from "./ThemeChart";

interface DashboardProps {
  classified: ClassifiedReview[];
  analysis: AnalysisBundle;
  usedMockClassifier: boolean;
  onReupload: () => void;
  runId?: string;
  runMeta?: AnalysisRunSummary;
}

export default function Dashboard({
  classified,
  analysis,
  usedMockClassifier,
  onReupload,
  runId,
  runMeta,
}: DashboardProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [usedMockChat, setUsedMockChat] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(
    null,
  );

  const classifiedWithIds = useMemo(
    () => assignReviewIds(classified),
    [classified],
  );

  const sources = useMemo(() => getUniqueSources(classified), [classified]);

  const filteredClassified = useMemo(() => {
    let subset = filterDiscoveryReviews(classifiedWithIds);
    if (sourceFilter !== "all" || confidenceFilter !== "all") {
      subset = filterClassifiedReviews(subset, sourceFilter, confidenceFilter);
    }
    return subset;
  }, [classifiedWithIds, sourceFilter, confidenceFilter]);

  const filteredEvidence = useMemo(() => {
    if (sourceFilter === "all" && confidenceFilter === "all") {
      return analysis.aggregation;
    }
    return aggregateReviewSubset(classifiedWithIds, filteredClassified);
  }, [
    analysis.aggregation,
    classifiedWithIds,
    filteredClassified,
    sourceFilter,
    confidenceFilter,
  ]);

  const filteredFindings = useMemo(() => {
    if (sourceFilter === "all" && confidenceFilter === "all") {
      return ensureFindingsReport(
        analysis.findings,
        analysis.aggregation,
        filteredClassified,
      );
    }
    return computeFindings(filteredEvidence, filteredClassified);
  }, [
    analysis.findings,
    analysis.aggregation,
    filteredEvidence,
    filteredClassified,
    sourceFilter,
    confidenceFilter,
  ]);

  const findingsReport = filteredFindings.report!;

  const filteredCount = filteredEvidence.discoveryRelevantCount;
  const isFiltered = sourceFilter !== "all" || confidenceFilter !== "all";

  const executiveReport = useMemo(() => {
    if (
      !isFiltered &&
      analysis.executive &&
      sourceFilter === "all" &&
      confidenceFilter === "all"
    ) {
      return analysis.executive;
    }
    return computeExecutiveInsights({
      classified: filteredClassified,
      aggregation: filteredEvidence,
    });
  }, [
    analysis.executive,
    filteredClassified,
    filteredEvidence,
    isFiltered,
    sourceFilter,
    confidenceFilter,
  ]);

  const opportunityEvidence = useMemo(
    () => buildOpportunitiesFromEvidence(filteredEvidence),
    [filteredEvidence],
  );

  const chatContext = useMemo(
    () =>
      buildAnalysisContext(
        filteredEvidence,
        filteredFindings,
        {
          executive: executiveReport,
          ...(isFiltered
            ? {
                filterNote: `Dashboard filters active: ${filteredCount} of ${analysis.aggregation.totalReviews} reviews shown`,
              }
            : {}),
        },
      ),
    [
      filteredEvidence,
      filteredFindings,
      executiveReport,
      isFiltered,
      filteredCount,
      analysis.aggregation.totalReviews,
    ],
  );

  const handleExportJson = () => {
    const report = buildReportJson(
      classified,
      filteredEvidence,
      filteredFindings,
    );
    downloadFile(
      JSON.stringify(report, null, 2),
      `${EXPORT_REPORT_BASENAME}.json`,
      "application/json",
    );
  };

  const handleExportMarkdown = () => {
    downloadFile(
      buildReportMarkdown(filteredEvidence, filteredFindings),
      `${EXPORT_REPORT_BASENAME}.md`,
      "text/markdown",
    );
  };

  const handleExportCsv = () => {
    downloadClassifiedCsv(
      classifiedWithIds,
      `${runMeta?.dataset_name ?? "classified-reviews"}.csv`,
    );
  };

  const handleExportDashboardPdf = async () => {
    await exportDashboardPdf({
      filename: `${runMeta?.dataset_name ?? EXPORT_REPORT_BASENAME}-dashboard.pdf`,
    });
  };

  const handleExportPmReportJson = () => {
    const json = buildPmReportJson({
      findings: filteredFindings,
      evidence: filteredEvidence,
      classified: filteredClassified,
      datasetName: runMeta?.dataset_name,
    });
    downloadPmReportJson(
      json,
      `${runMeta?.dataset_name ?? "pm-research-report"}.json`,
    );
  };

  const handleExportPmReport = (format: "md" | "json" | "pdf") => {
    if (format === "json") {
      handleExportPmReportJson();
      return;
    }
    const md = buildPmReportMarkdown({
      findings: filteredFindings,
      evidence: filteredEvidence,
      datasetName: runMeta?.dataset_name,
      classified: filteredClassified,
      executive: executiveReport,
    });
    if (format === "pdf") {
      exportPmReportPdf(md, `${runMeta?.dataset_name ?? "PM Research Report"}`);
      return;
    }
    downloadPmReportMarkdown(
      md,
      `${runMeta?.dataset_name ?? "pm-research-report"}.md`,
    );
  };

  const handleOpenDetail = (selection: DrawerSelection) => {
    setDrawerSelection(selection);
    setDrawerOpen(true);
  };

  const handleOpenEvidenceList = () => {
    handleOpenDetail({
      type: "corpus",
      reviews: filteredClassified,
    });
  };

  const handleQuoteClick = (quote: QuoteEvidence) => {
    const review = classifiedWithIds.find((r) => r.review_id === quote.review_id);
    handleOpenDetail({
      type: "finding",
      finding: {
        id: quote.review_id,
        title: "Review evidence",
        summary: review?.text ?? quote.text,
        evidence_count: 1,
        confidence: quote.confidence,
        quotes: [quote],
        source_distribution: { [quote.source]: 1 },
        top_segments: [{ segment: quote.segment, count: 1, pct: 100 }],
        related_review_ids: [quote.review_id],
      },
    });
  };

  return (
    <>
      <DashboardLayout
        reviewCount={analysis.aggregation.totalReviews}
        discoveryRelevantCount={filteredEvidence.discoveryRelevantCount}
        datasetName={runMeta?.dataset_name}
        runId={runId}
        runDemoMode={usedMockClassifier || usedMockChat}
        onReupload={onReupload}
        onExportMarkdown={handleExportMarkdown}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onExportDashboardPdf={handleExportDashboardPdf}
        onExportPmReport={handleExportPmReport}
        onOpenChat={() => setChatOpen(true)}
        onOpenEvidenceList={handleOpenEvidenceList}
      >
        <DashboardExecutiveSummary
          report={findingsReport}
          aggregation={filteredEvidence}
          discoveryRelevantCount={filteredEvidence.discoveryRelevantCount}
          executive={executiveReport}
        />

        <ExecutiveResearchPanel report={executiveReport} />

        {runId && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">
            <Icon name="cloud_done" className="text-base" />
            Saved to research repository · Run persisted in Turso
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
              {filteredCount} discovery-related reviews shown
            </span>
          )}
        </div>

        <SectionHeader
          type="evidence"
          title="Research findings"
          description="Why users struggle to discover, what frustrates them, and what they need — from Spotify discovery reviews."
        />
        <ResearchFindingsSummary
          report={findingsReport}
          discoveryRelevantCount={filteredEvidence.discoveryRelevantCount}
          excludedCount={filteredEvidence.excludedCount}
          onOpenDetail={handleOpenDetail}
          onQuoteClick={handleQuoteClick}
        />

        <SectionHeader
          type="evidence"
          title="Corpus evidence"
          description="Counts, percentages, and cross-tabs from Spotify discovery-related reviews."
        />
        <EvidenceSection>
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ThemeChart aggregation={filteredEvidence} />
            </div>
            <div className="lg:col-span-2">
              <SegmentBreakdown aggregation={filteredEvidence} />
            </div>
          </div>

          <BarrierAnalysis aggregation={filteredEvidence} />

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
            <FrequencyChart
              title="Listening behaviors"
              subtitle="What listening behaviors are users trying to achieve?"
              frequency={filteredEvidence.behaviorFrequency}
            />
            <FrequencyChart
              title="Recommendation frustrations"
              subtitle="Emotional tone when recommendations or discovery fall short."
              frequency={filteredEvidence.emotionFrequency}
            />
          </div>

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
            <FrequencyChart
              title="Repetition causes"
              subtitle="What causes users to repeatedly listen to the same content?"
              frequency={filteredEvidence.rootCauseFrequency}
            />
            <FrequencyChart
              title="Unmet needs"
              subtitle="What unmet needs emerge consistently across reviews?"
              frequency={filteredEvidence.unmetNeedFrequency}
            />
          </div>

          <SegmentChallenges crossTab={filteredEvidence.segmentThemeCrossTab} />

          <ClusterEvidencePanel
            title="Representative quotes by theme"
            subtitle="Evidence-backed excerpts from the corpus."
            clusters={filteredEvidence.themeEvidence}
            onClusterClick={(cluster) =>
              handleOpenDetail({
                type: "cluster",
                cluster,
                title: cluster.label,
              })
            }
            onQuoteClick={handleQuoteClick}
          />

          <ClusterEvidencePanel
            title="Root cause evidence"
            subtitle="Mechanisms behind discovery friction with supporting quotes."
            clusters={filteredEvidence.rootCauseEvidence}
            onClusterClick={(cluster) =>
              handleOpenDetail({
                type: "cluster",
                cluster,
                title: `Root cause: ${cluster.label}`,
              })
            }
            onQuoteClick={handleQuoteClick}
          />

          <ClusterEvidencePanel
            title="Unmet need evidence"
            subtitle="What users wish existed — with traceable review quotes."
            clusters={filteredEvidence.unmetNeedEvidence}
            onClusterClick={(cluster) =>
              handleOpenDetail({
                type: "cluster",
                cluster,
                title: `Unmet need: ${cluster.label}`,
              })
            }
            onQuoteClick={handleQuoteClick}
          />
        </EvidenceSection>

        <SectionHeader
          type="evidence"
          title="Product opportunities"
          description="Derived from top unmet needs in the corpus — each linked to review evidence."
        />
        <RootCauses findings={findingsReport.repetition_causes} />
        <Opportunities
          opportunities={opportunityEvidence}
          onOpenDetail={handleOpenDetail}
          onQuoteClick={handleQuoteClick}
        />
      </DashboardLayout>

      <FindingDetailDrawer
        open={drawerOpen}
        selection={drawerSelection}
        classified={classifiedWithIds}
        onClose={() => setDrawerOpen(false)}
      />

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        data-dashboard-no-print
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-on-primary shadow-lg transition-all hover:scale-105 hover:opacity-90 active:scale-95"
      >
        <Icon name="forum" filled />
        <span className="hidden sm:inline">{PLATFORM_ASSISTANT_NAME}</span>
      </button>

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={chatContext}
        onMockUsed={() => setUsedMockChat(true)}
      />
    </>
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
