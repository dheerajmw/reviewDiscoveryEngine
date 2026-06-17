import type { AggregationResult, ClassifiedReview } from "./types";

type FrequencyField = "theme" | "segment" | "barrier";

export function countByField(
  reviews: ClassifiedReview[],
  field: FrequencyField,
): Record<string, { count: number; pct: number }> {
  if (reviews.length === 0) return {};

  const counts = new Map<string, number>();

  for (const review of reviews) {
    const value = review[field]?.trim() || "Unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const total = reviews.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const result: Record<string, { count: number; pct: number }> = {};
  let assignedPct = 0;

  sorted.forEach(([key, count], index) => {
    const pct =
      index === sorted.length - 1
        ? 100 - assignedPct
        : Math.round((count / total) * 100);
    assignedPct += pct;
    result[key] = { count, pct };
  });

  return result;
}

export function emptyAggregation(): AggregationResult {
  return {
    themeFrequency: {},
    segmentBreakdown: {},
    barrierAnalysis: {},
    totalReviews: 0,
  };
}

export function aggregateReviews(
  reviews: ClassifiedReview[],
): AggregationResult {
  if (reviews.length === 0) {
    return emptyAggregation();
  }

  return {
    themeFrequency: countByField(reviews, "theme"),
    segmentBreakdown: countByField(reviews, "segment"),
    barrierAnalysis: countByField(reviews, "barrier"),
    totalReviews: reviews.length,
  };
}
