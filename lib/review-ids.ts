import type { ClassifiedReview } from "./types";

/** Assign stable review_id values for traceability (preserves existing ids). */
export function assignReviewIds(reviews: ClassifiedReview[]): ClassifiedReview[] {
  return reviews.map((review, index) => ({
    ...review,
    review_id: review.review_id ?? `review-${index + 1}`,
  }));
}

export function reviewIdMap(
  reviews: ClassifiedReview[],
): Map<string, ClassifiedReview> {
  const withIds = assignReviewIds(reviews);
  return new Map(withIds.map((r) => [r.review_id!, r]));
}
