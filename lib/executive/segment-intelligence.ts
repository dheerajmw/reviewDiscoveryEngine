import { isFallbackLabel } from "./executive-quality";
import {
  BEHAVIOR_NARRATIVES,
  BARRIER_INSIGHT_FRAGMENTS,
  UNMET_NEED_NARRATIVES,
  displaySegment,
} from "./insight-narratives";
import type {
  AggregationResult,
  ClassifiedReview,
  QuoteEvidence,
  SegmentIntelligenceProfile,
} from "../types";

function researchReviews(reviews: ClassifiedReview[]): ClassifiedReview[] {
  return reviews.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
}

function topLabel(
  reviews: ClassifiedReview[],
  field: keyof Pick<ClassifiedReview, "theme" | "barrier" | "unmet_need" | "behavior">,
): string | null {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    const label = String(r[field]).trim();
    if (!label || isFallbackLabel(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

function challengeNarrative(theme: string | null, barrier: string | null): string {
  if (barrier && BARRIER_INSIGHT_FRAGMENTS[barrier]) {
    return BARRIER_INSIGHT_FRAGMENTS[barrier].charAt(0).toUpperCase() +
      BARRIER_INSIGHT_FRAGMENTS[barrier].slice(1);
  }
  if (theme) {
    return `${theme} disproportionately affects this segment`;
  }
  return "Discovery friction without a dominant product surface";
}

function toQuote(review: ClassifiedReview, index: number): QuoteEvidence {
  return {
    review_id: review.review_id ?? `seg-${index}`,
    source: review.source,
    text: review.text,
    segment: review.segment,
    theme: review.theme,
    confidence: review.confidence ?? 0.7,
    barrier: review.barrier,
    root_cause: review.root_cause,
    unmet_need: review.unmet_need,
  };
}

export function buildSegmentIntelligence(
  classified: ClassifiedReview[],
  aggregation: AggregationResult,
): SegmentIntelligenceProfile[] {
  const research = researchReviews(classified);
  const profiles: SegmentIntelligenceProfile[] = [];

  for (const segment of aggregation.segmentThemeCrossTab.segments) {
    const segmentReviews = research.filter(
      (r) => (r.segment?.trim() || "Unknown") === segment,
    );
    if (segmentReviews.length === 0) continue;

    const theme = topLabel(segmentReviews, "theme");
    const barrier = topLabel(segmentReviews, "barrier");
    const unmet = topLabel(segmentReviews, "unmet_need");
    const behavior = topLabel(segmentReviews, "behavior");

    const bestQuote = [...segmentReviews].sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
    )[0];

    profiles.push({
      segment,
      display_name: displaySegment(segment),
      primary_challenge: challengeNarrative(theme, barrier),
      primary_unmet_need: unmet
        ? (UNMET_NEED_NARRATIVES[unmet]?.split(".")[0] ?? unmet) + "."
        : "Clearer discovery controls and fresher recommendations.",
      discovery_behavior: behavior
        ? (BEHAVIOR_NARRATIVES[behavior] ?? `This segment primarily ${behavior.toLowerCase()}.`)
        : "Engages with Spotify discovery surfaces but reports mixed results.",
      representative_quote: bestQuote ? toQuote(bestQuote, 0) : null,
      review_count: segmentReviews.length,
    });
  }

  return profiles.sort((a, b) => b.review_count - a.review_count);
}
