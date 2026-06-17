import type { ClassifiedReview } from "./types";

export type SourceFilter = "all" | string;
export type ConfidenceFilter = "all" | "high" | "low";

export function filterClassifiedReviews(
  reviews: ClassifiedReview[],
  source: SourceFilter,
  confidence: ConfidenceFilter,
): ClassifiedReview[] {
  return reviews.filter((review) => {
    if (source !== "all" && review.source !== source) return false;
    if (confidence === "high" && review.confidence < 0.5) return false;
    if (confidence === "low" && review.confidence >= 0.5) return false;
    return true;
  });
}

export function getUniqueSources(reviews: ClassifiedReview[]): string[] {
  return [...new Set(reviews.map((review) => review.source))].sort();
}
