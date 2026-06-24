import { enrichRootCauseFinding } from "./root-cause-narratives";
import type {
  ClassifiedReview,
  ClusterEvidence,
  CrossTabResult,
  EvidenceBackedFinding,
  QuoteEvidence,
  SegmentChallengeFinding,
} from "./types";

type FrequencyField =
  | "theme"
  | "behavior"
  | "emotion"
  | "segment"
  | "barrier"
  | "root_cause"
  | "unmet_need";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function reviewsMatchingLabel(
  reviews: ClassifiedReview[],
  field: FrequencyField,
  label: string,
): ClassifiedReview[] {
  return reviews.filter(
    (r) => (String(r[field]).trim() || "Unknown") === label,
  );
}

export function buildSourceDistribution(
  reviews: ClassifiedReview[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const review of reviews) {
    counts[review.source] = (counts[review.source] ?? 0) + 1;
  }
  return counts;
}

export function buildTopSegments(
  reviews: ClassifiedReview[],
  limit = 3,
): { segment: string; count: number; pct: number }[] {
  if (reviews.length === 0) return [];
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const segment = review.segment?.trim() || "Unknown";
    counts.set(segment, (counts.get(segment) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([segment, count]) => ({
      segment,
      count,
      pct: Math.round((count / reviews.length) * 100),
    }));
}

function normalizeConfidenceScore(value: number | undefined | null): number {
  if (value == null || Number.isNaN(value)) return 0.7;
  if (value > 1 && value <= 100) return value / 100;
  return value;
}

export function averageConfidence(reviews: ClassifiedReview[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce(
    (acc, r) => acc + normalizeConfidenceScore(r.confidence),
    0,
  );
  return Math.round((sum / reviews.length) * 100) / 100;
}

export function averageQuoteConfidence(quotes: QuoteEvidence[]): number {
  if (quotes.length === 0) return 0;
  const sum = quotes.reduce(
    (acc, q) => acc + normalizeConfidenceScore(q.confidence),
    0,
  );
  return Math.round((sum / quotes.length) * 100) / 100;
}

/** Average classification confidence for all reviews tagged to a finding. */
export function resolveFindingConfidence(
  taggedReviews: ClassifiedReview[],
  quotes: QuoteEvidence[],
): number {
  const fromReviews = averageConfidence(taggedReviews);
  if (fromReviews > 0) return fromReviews;
  return averageQuoteConfidence(quotes);
}

export function clusterToFinding(
  cluster: ClusterEvidence,
  reviews: ClassifiedReview[],
  field: FrequencyField,
  summary?: string,
): EvidenceBackedFinding {
  const matching = reviewsMatchingLabel(reviews, field, cluster.label);
  const finding: EvidenceBackedFinding = {
    id: slugify(cluster.label),
    title: cluster.label,
    summary: summary ?? `${cluster.label} appears in ${cluster.pct}% of discovery-related reviews (${cluster.count} reviews).`,
    pct: cluster.pct,
    evidence_count: cluster.count,
    confidence: resolveFindingConfidence(matching, cluster.quotes),
    quotes: cluster.quotes,
    source_distribution: buildSourceDistribution(matching),
    top_segments: buildTopSegments(matching),
    related_review_ids: cluster.quotes.map((q) => q.review_id),
  };

  return field === "root_cause" ? enrichRootCauseFinding(finding) : finding;
}

export function buildSegmentChallengeFindings(
  reviews: ClassifiedReview[],
  crossTab: CrossTabResult,
  maxPerSegment = 1,
): SegmentChallengeFinding[] {
  const findings: SegmentChallengeFinding[] = [];

  for (const segment of crossTab.segments) {
    const row = crossTab.matrix[segment] ?? {};
    const ranked = crossTab.columns
      .map((col) => ({ col, cell: row[col] ?? { count: 0, pct: 0 } }))
      .filter((item) => item.cell.count > 0)
      .sort((a, b) => b.cell.pct - a.cell.pct)
      .slice(0, maxPerSegment);

    for (const { col, cell } of ranked) {
      const matching = reviews.filter(
        (r) =>
          (r.segment?.trim() || "Unknown") === segment &&
          (r.theme?.trim() || "Unknown") === col,
      );
      const quotes: QuoteEvidence[] = matching
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((r, i) => ({
          review_id: r.review_id ?? `review-${i + 1}`,
          source: r.source,
          text: r.text,
          segment: r.segment,
          theme: r.theme,
          confidence: r.confidence,
          barrier: r.barrier,
          root_cause: r.root_cause,
          unmet_need: r.unmet_need,
        }));

      findings.push({
        id: slugify(`${segment}-${col}`),
        segment,
        challenge: col,
        pct: cell.pct,
        evidence_count: cell.count,
        confidence: resolveFindingConfidence(matching, quotes),
        quotes,
        source_distribution: buildSourceDistribution(matching),
        related_review_ids: quotes.map((q) => q.review_id),
      });
    }
  }

  return findings.sort((a, b) => b.evidence_count - a.evidence_count);
}

export function mergeQuotes(...groups: QuoteEvidence[][]): QuoteEvidence[] {
  const seen = new Set<string>();
  const merged: QuoteEvidence[] = [];
  for (const group of groups) {
    for (const quote of group) {
      if (seen.has(quote.review_id)) continue;
      seen.add(quote.review_id);
      merged.push(quote);
    }
  }
  return merged;
}

export function mergeSourceDistributions(
  ...dists: Record<string, number>[]
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const dist of dists) {
    for (const [source, count] of Object.entries(dist)) {
      merged[source] = (merged[source] ?? 0) + count;
    }
  }
  return merged;
}
