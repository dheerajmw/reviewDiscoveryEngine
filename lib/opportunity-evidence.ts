import { displaySegment } from "./executive/insight-narratives";
import {
  averageQuoteConfidence,
  buildSourceDistribution,
  reviewsMatchingLabel,
} from "./finding-evidence";
import type {
  AggregationResult,
  ClassifiedReview,
  ClusterEvidence,
  OpportunityWithEvidence,
  RetentionSignal,
} from "./types";

const FRUSTRATION_EMOTIONS = new Set([
  "Frustration",
  "Disappointment",
  "Distrust",
  "Boredom",
]);
const CURIOSITY_EMOTION = "Curiosity";
const SIGNIFICANT_SEGMENT_PCT = 20;
const HIGH_FRUSTRATION_RATE = 0.35;
const CURIOSITY_RATE = 0.25;

export type OpportunitySortMode = "frequency" | "business_impact";

interface SegmentStat {
  segment: string;
  count: number;
  pct: number;
}

function isSignificantSegment(pct: number): boolean {
  return pct > SIGNIFICANT_SEGMENT_PCT;
}

function segmentBreakdown(reviews: ClassifiedReview[]): SegmentStat[] {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const segment = review.segment?.trim() || "Casual Listener";
    counts.set(segment, (counts.get(segment) ?? 0) + 1);
  }
  const total = Math.max(reviews.length, 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([segment, count]) => ({
      segment,
      count,
      pct: (count / total) * 100,
    }));
}

function emotionRates(reviews: ClassifiedReview[]) {
  const total = Math.max(reviews.length, 1);
  let frustration = 0;
  let curiosity = 0;
  for (const review of reviews) {
    const emotion = review.emotion?.trim() || "";
    if (FRUSTRATION_EMOTIONS.has(emotion)) frustration += 1;
    if (emotion === CURIOSITY_EMOTION) curiosity += 1;
  }
  return {
    frustration: frustration / total,
    curiosity: curiosity / total,
  };
}

export function resolveAffectedSegments(
  reviews: ClassifiedReview[],
): string[] {
  const ranked = segmentBreakdown(reviews);
  if (ranked.length === 0) {
    return [displaySegment("Casual Listener")];
  }

  const significant = ranked.filter((entry) => isSignificantSegment(entry.pct));
  const selected = significant.length >= 2 ? significant : ranked.slice(0, 1);
  return selected.map((entry) => displaySegment(entry.segment));
}

export function resolveRetentionSignal(
  reviews: ClassifiedReview[],
  segmentStats: SegmentStat[],
): RetentionSignal {
  const significantSegmentCount = segmentStats.filter((entry) =>
    isSignificantSegment(entry.pct),
  ).length;

  if (significantSegmentCount >= 2) {
    return "Cross-segment retention impact";
  }

  const primarySegment = segmentStats[0]?.segment;
  const primaryReviews = primarySegment
    ? reviews.filter(
        (review) =>
          (review.segment?.trim() || "Casual Listener") === primarySegment,
      )
    : reviews;

  const { frustration, curiosity } = emotionRates(primaryReviews);
  if (frustration >= HIGH_FRUSTRATION_RATE) {
    return "High churn risk if unaddressed";
  }
  if (curiosity >= CURIOSITY_RATE) {
    return "Engagement growth opportunity";
  }
  if (frustration > curiosity) {
    return "High churn risk if unaddressed";
  }
  return "Engagement growth opportunity";
}

export function businessImpactScore(
  retentionSignal: RetentionSignal,
  evidenceCount: number,
): number {
  const retentionWeight =
    retentionSignal === "High churn risk if unaddressed"
      ? 3
      : retentionSignal === "Cross-segment retention impact"
        ? 2.5
        : 1.5;
  return (
    Math.round(retentionWeight * (1 + Math.log10(evidenceCount + 1)) * 100) /
    100
  );
}

function reviewsForCluster(
  classified: ClassifiedReview[],
  cluster: ClusterEvidence,
): ClassifiedReview[] {
  const byLabel = reviewsMatchingLabel(
    classified,
    "unmet_need",
    cluster.label,
  );
  if (byLabel.length > 0) return byLabel;

  const quoteIds = new Set(cluster.quotes.map((quote) => quote.review_id));
  return classified.filter((review) => quoteIds.has(review.review_id ?? ""));
}

export function buildOpportunitiesFromEvidence(
  evidence: AggregationResult,
  classified: ClassifiedReview[] = [],
): OpportunityWithEvidence[] {
  return evidence.unmetNeedEvidence.slice(0, 3).map((cluster) => {
    const quotes = cluster.quotes.slice(0, 5);
    const matchingReviews = reviewsForCluster(classified, cluster);
    const segmentStats = segmentBreakdown(matchingReviews);
    const affected_segments = resolveAffectedSegments(matchingReviews);
    const retention_signal = resolveRetentionSignal(
      matchingReviews,
      segmentStats,
    );
    const business_impact_score = businessImpactScore(
      retention_signal,
      cluster.count,
    );

    return {
      title: cluster.label,
      description: `Address "${cluster.label}" — cited in ${cluster.count} reviews (${cluster.pct}% of discovery corpus).`,
      supporting_unmet_needs: [cluster.label],
      evidence_count: cluster.count,
      confidence: averageQuoteConfidence(quotes),
      quotes,
      source_distribution: buildSourceDistribution(
        quotes.map((q) => ({ source: q.source }) as never),
      ),
      related_review_ids: quotes.map((q) => q.review_id),
      affected_segments,
      retention_signal,
      business_impact_score,
    };
  });
}

export function sortOpportunities(
  opportunities: OpportunityWithEvidence[],
  mode: OpportunitySortMode,
): OpportunityWithEvidence[] {
  const sorted = [...opportunities];
  if (mode === "business_impact") {
    sorted.sort((a, b) => {
      const scoreDiff = b.business_impact_score - a.business_impact_score;
      return scoreDiff !== 0 ? scoreDiff : b.evidence_count - a.evidence_count;
    });
  } else {
    sorted.sort((a, b) => b.evidence_count - a.evidence_count);
  }
  return sorted;
}
