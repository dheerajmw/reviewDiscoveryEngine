"use client";

import type {
  ClassifiedReview,
  ClusterEvidence,
  EvidenceBackedFinding,
  OpportunityWithEvidence,
  QuoteEvidence,
  SegmentChallengeFinding,
} from "@/lib/types";
import {
  averageQuoteConfidence,
  resolveFindingConfidence,
} from "@/lib/finding-evidence";
import Icon from "@/components/ui/Icon";
import SourceBadge from "@/components/ui/SourceBadge";
import EvidenceMeta from "./EvidenceMeta";
import RawReviewPanel from "./RawReviewPanel";

export type DrawerSelection =
  | { type: "finding"; finding: EvidenceBackedFinding }
  | { type: "segment"; finding: SegmentChallengeFinding }
  | { type: "opportunity"; finding: OpportunityWithEvidence }
  | { type: "cluster"; cluster: ClusterEvidence; title: string }
  | { type: "corpus"; reviews: ClassifiedReview[] };

interface FindingDetailDrawerProps {
  open: boolean;
  selection: DrawerSelection | null;
  classified: ClassifiedReview[];
  onClose: () => void;
}

export default function FindingDetailDrawer({
  open,
  selection,
  classified,
  onClose,
}: FindingDetailDrawerProps) {
  if (!open || !selection) return null;

  const reviewMap = new Map(
    classified.map((r) => [r.review_id ?? "", r]),
  );

  let title = "";
  let summary = "";
  let evidenceCount = 0;
  let confidence = 0;
  let pct: number | undefined;
  let sourceDistribution: Record<string, number> = {};
  let topSegments: { segment: string; count: number; pct: number }[] = [];
  let quotes: QuoteEvidence[] = [];
  let relatedIds: string[] = [];
  let extra: React.ReactNode = null;

  let relatedReviews: ClassifiedReview[] = [];
  let isCorpus = false;

  if (selection.type === "corpus") {
    isCorpus = true;
    const reviews = selection.reviews;
    title = "Matched evidence reviews";
    summary = `${reviews.length.toLocaleString()} discovery-related reviews with LLM classifications. Filter and export from the dashboard header.`;
    evidenceCount = reviews.length;
    confidence =
      reviews.reduce((sum, review) => sum + review.confidence, 0) /
      (reviews.length || 1);
    sourceDistribution = reviews.reduce<Record<string, number>>((acc, review) => {
      acc[review.source] = (acc[review.source] ?? 0) + 1;
      return acc;
    }, {});
    quotes = reviews.map((review) => ({
      review_id: review.review_id ?? "",
      source: review.source,
      text: review.text,
      segment: review.segment,
      theme: review.theme,
      confidence: review.confidence,
      barrier: review.barrier,
      root_cause: review.root_cause,
      unmet_need: review.unmet_need,
    }));
    relatedIds = reviews.map((review) => review.review_id ?? "");
    relatedReviews = reviews;
  } else if (selection.type === "finding") {
    const f = selection.finding;
    title = f.title;
    summary = f.summary;
    evidenceCount = f.evidence_count;
    confidence = f.confidence;
    pct = f.pct;
    sourceDistribution = f.source_distribution;
    topSegments = f.top_segments;
    quotes = f.quotes;
    relatedIds = f.related_review_ids;
    if (f.mechanism && f.product_implication) {
      extra = (
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Mechanism
            </h4>
            <p className="text-sm text-on-surface">{f.mechanism}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Product implication
            </h4>
            <p className="text-sm text-on-surface">{f.product_implication}</p>
          </div>
        </div>
      );
    }
  } else if (selection.type === "segment") {
    const f = selection.finding;
    title = `${f.segment} — ${f.challenge}`;
    summary = `${f.segment} users face ${f.challenge} in ${f.pct}% of segment reviews.`;
    evidenceCount = f.evidence_count;
    confidence = f.confidence;
    pct = f.pct;
    sourceDistribution = f.source_distribution;
    quotes = f.quotes;
    relatedIds = f.related_review_ids;
  } else if (selection.type === "opportunity") {
    const f = selection.finding;
    title = f.title;
    summary = f.description;
    evidenceCount = f.evidence_count;
    confidence = f.confidence;
    sourceDistribution = f.source_distribution;
    quotes = f.quotes;
    relatedIds = f.related_review_ids;
    extra = (
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Driven by unmet needs
          </h4>
          <ul className="flex flex-wrap gap-2">
            {f.supporting_unmet_needs.map((need) => (
              <li
                key={need}
                className="rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
              >
                {need}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Affected segment
          </h4>
          <p className="text-sm text-on-surface">
            {f.affected_segments.join(", ")}
          </p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Retention signal
          </h4>
          <p className="text-sm text-on-surface">{f.retention_signal}</p>
        </div>
      </div>
    );
  } else {
    const c = selection.cluster;
    title = selection.title;
    summary = `${c.label} — ${c.count} reviews (${c.pct}%).`;
    evidenceCount = c.count;
    confidence =
      c.quotes.reduce((sum, q) => sum + q.confidence, 0) /
        (c.quotes.length || 1);
    pct = c.pct;
    quotes = c.quotes;
    relatedIds = c.quotes.map((q) => q.review_id);
    sourceDistribution = c.quotes.reduce<Record<string, number>>((acc, q) => {
      acc[q.source] = (acc[q.source] ?? 0) + 1;
      return acc;
    }, {});
    relatedReviews = relatedIds
      .map((id) => reviewMap.get(id))
      .filter(Boolean) as ClassifiedReview[];
  }

  if (!isCorpus) {
    relatedReviews = relatedIds
      .map((id) => reviewMap.get(id))
      .filter(Boolean) as ClassifiedReview[];
  }

  if (
    selection.type === "finding" ||
    selection.type === "segment" ||
    selection.type === "opportunity"
  ) {
    confidence = resolveFindingConfidence(relatedReviews, quotes);
    if (confidence <= 0) {
      confidence = selection.finding.confidence;
    }
  } else if (selection.type === "cluster") {
    confidence = averageQuoteConfidence(quotes);
  }

  const drawerLabel = isCorpus ? "Matched evidence" : "Finding evidence";
  const quotesHeading = isCorpus ? "Review list" : "Supporting quotes";
  const showRelatedReviews = !isCorpus && relatedReviews.length > 0;

  return (
    <>
      <button
        type="button"
        aria-label="Close finding detail"
        className="fixed inset-0 z-50 bg-scrim/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-outline-variant bg-surface-container-lowest shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
              {drawerLabel}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {summary}
          </p>

          <EvidenceMeta
            evidenceCount={evidenceCount}
            confidence={confidence}
            sourceDistribution={sourceDistribution}
            pct={pct}
          />

          {extra}

          {topSegments.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                Top segments
              </h4>
              <ul className="space-y-1">
                {topSegments.map((seg) => (
                  <li key={seg.segment} className="text-sm text-on-surface">
                    {seg.segment}{" "}
                    <span className="text-on-surface-variant">
                      · {seg.count} ({seg.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              {quotesHeading}
            </h4>
            <ul className="space-y-3">
              {quotes.map((quote, index) => (
                <li
                  key={`${quote.review_id || "quote"}-${index}-${quote.source}`}
                  className="rounded-xl border border-outline-variant bg-surface-container-low p-3"
                >
                  <p className="text-sm leading-relaxed text-on-surface">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SourceBadge source={quote.source} />
                    <span className="text-xs text-on-surface-variant">
                      {quote.segment}
                    </span>
                    <span className="text-xs text-outline">
                      {Math.round(quote.confidence * 100)}% confidence
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {showRelatedReviews && (
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                Related reviews ({relatedReviews.length})
              </h4>
              <div className="space-y-4">
                {relatedReviews.map((review, index) => (
                  <RawReviewPanel
                    key={`${review.review_id ?? "review"}-${index}`}
                    review={review}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
