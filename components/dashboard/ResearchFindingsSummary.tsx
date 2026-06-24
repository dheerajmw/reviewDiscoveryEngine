"use client";

import type {
  EvidenceBackedFinding,
  QuoteEvidence,
  ResearchFindingsReport,
  SegmentChallengeFinding,
} from "@/lib/types";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import type { DrawerSelection } from "./evidence/FindingDetailDrawer";
import EvidenceMeta from "./evidence/EvidenceMeta";
import FindingQuoteList from "./evidence/FindingQuoteList";

interface ResearchFindingsSummaryProps {
  report: ResearchFindingsReport;
  discoveryRelevantCount: number;
  excludedCount: number;
  positiveExcludedCount?: number;
  onOpenDetail: (selection: DrawerSelection) => void;
  onQuoteClick: (quote: QuoteEvidence) => void;
}

function FindingBlock({
  finding,
  onOpenDetail,
  onQuoteClick,
  quoteLimit = 3,
}: {
  finding: EvidenceBackedFinding;
  onOpenDetail: (selection: DrawerSelection) => void;
  onQuoteClick: (quote: QuoteEvidence) => void;
  quoteLimit?: number;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <button
        type="button"
        onClick={() => onOpenDetail({ type: "finding", finding })}
        className="mb-3 flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-on-surface">
            {finding.title}
            {finding.pct !== undefined && (
              <span className="ml-2 text-primary">({finding.pct}%)</span>
            )}
          </h4>
          <EvidenceMeta
            evidenceCount={finding.evidence_count}
            confidence={finding.confidence}
            sourceDistribution={finding.source_distribution}
          />
        </div>
        <Icon name="open_in_new" className="shrink-0 text-primary" />
      </button>
      <p className="mb-3 text-sm text-on-surface-variant">{finding.summary}</p>
      {finding.mechanism && (
        <p className="mb-2 text-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Mechanism: </span>
          {finding.mechanism}
        </p>
      )}
      {finding.product_implication && (
        <p className="mb-3 text-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Product implication: </span>
          {finding.product_implication}
        </p>
      )}
      <FindingQuoteList
        quotes={finding.quotes}
        limit={quoteLimit}
        onQuoteClick={onQuoteClick}
      />
      <p className="mt-2 text-xs text-on-surface-variant">
        Based on {finding.evidence_count} reviews
      </p>
    </div>
  );
}

export default function ResearchFindingsSummary({
  report,
  discoveryRelevantCount,
  excludedCount,
  positiveExcludedCount,
  onOpenDetail,
  onQuoteClick,
}: ResearchFindingsSummaryProps) {
  const positiveNote =
    positiveExcludedCount && positiveExcludedCount > 0
      ? `, ${positiveExcludedCount} positive discovery excluded`
      : "";

  return (
    <Card
      title="Research findings summary"
      subtitle={`Evidence-backed answers from ${discoveryRelevantCount} reviews in this mode (${excludedCount} excluded${positiveNote}). Every finding links to supporting reviews.`}
    >
      <div className="space-y-8">
        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="help_outline" className="mt-0.5 shrink-0 text-primary" />
            Why do users struggle to discover new music?
          </h4>
          <FindingBlock
            finding={report.why_discovery_fails}
            onOpenDetail={onOpenDetail}
            onQuoteClick={onQuoteClick}
            quoteLimit={5}
          />
        </section>

        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="sentiment_dissatisfied" className="mt-0.5 shrink-0 text-primary" />
            Most common frustrations
          </h4>
          <div className="space-y-4">
            {report.top_frustrations.map((finding) => (
              <FindingBlock
                key={finding.id}
                finding={finding}
                onOpenDetail={onOpenDetail}
                onQuoteClick={onQuoteClick}
              />
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="headphones" className="mt-0.5 shrink-0 text-primary" />
            Listening behaviors
          </h4>
          <div className="space-y-4">
            {report.listening_behaviors.map((finding) => (
              <FindingBlock
                key={finding.id}
                finding={finding}
                onOpenDetail={onOpenDetail}
                onQuoteClick={onQuoteClick}
              />
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="repeat" className="mt-0.5 shrink-0 text-primary" />
            Causes of repetitive listening
          </h4>
          <div className="space-y-4">
            {report.repetition_causes.map((finding) => (
              <FindingBlock
                key={finding.id}
                finding={finding}
                onOpenDetail={onOpenDetail}
                onQuoteClick={onQuoteClick}
              />
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="groups" className="mt-0.5 shrink-0 text-primary" />
            Segment-specific challenges
          </h4>
          <div className="space-y-4">
            {report.segment_challenges.map((item: SegmentChallengeFinding) => (
              <div
                key={item.id}
                className="rounded-lg border border-outline-variant bg-surface-container-low p-4"
              >
                <button
                  type="button"
                  onClick={() => onOpenDetail({ type: "segment", finding: item })}
                  className="mb-3 flex w-full items-start justify-between gap-2 text-left"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">
                      {item.segment}
                    </h4>
                    <p className="text-sm text-primary">
                      Challenge: {item.challenge} ({item.pct}%)
                    </p>
                    <EvidenceMeta
                      evidenceCount={item.evidence_count}
                      confidence={item.confidence}
                      sourceDistribution={item.source_distribution}
                    />
                  </div>
                  <Icon name="open_in_new" className="shrink-0 text-primary" />
                </button>
                <FindingQuoteList
                  quotes={item.quotes}
                  onQuoteClick={onQuoteClick}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-start gap-2 text-sm font-medium text-on-surface">
            <Icon name="lightbulb" className="mt-0.5 shrink-0 text-primary" />
            Unmet needs
          </h4>
          <div className="space-y-4">
            {report.unmet_needs.map((finding) => (
              <FindingBlock
                key={finding.id}
                finding={finding}
                onOpenDetail={onOpenDetail}
                onQuoteClick={onQuoteClick}
              />
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}
