import type { ClassifiedReview } from "./types";

/** Discovery-relevant reviews (excludes billing/login/crash-only rows flagged at classify). */
export function filterDiscoveryReviews(
  classified: ClassifiedReview[],
): ClassifiedReview[] {
  return classified.filter((r) => r.discovery_relevant !== false);
}
