import { estimateGroqClassification } from "./groq-limits";

/**
 * Minimum total reviews to fetch or upload so cleanup usually leaves enough
 * discovery-related rows (store-heavy mixes often keep ~15–35%).
 */
export const RECOMMENDED_MIN_REVIEWS_FETCHED = 150;

/**
 * Maximum total reviews to fetch or upload before cleanup — larger sets often
 * yield 150–200+ kept rows and can exceed Groq free-tier token limits.
 */
export const RECOMMENDED_MAX_REVIEWS_FETCHED = 500;

/** Useful minimum after cleanup for a meaningful analysis run. */
export const RECOMMENDED_MIN_AFTER_CLEANUP = 25;

/** Comfortable maximum after cleanup on Groq free tier (~100k tokens/day). */
export const RECOMMENDED_MAX_AFTER_CLEANUP = 200;

/** Typical share of fetched reviews that survive discovery cleanup. */
export const TYPICAL_CLEANUP_KEEP_RATE = 0.35;

export function estimateReviewsAfterCleanup(
  fetchedCount: number,
  keepRate = TYPICAL_CLEANUP_KEEP_RATE,
): number {
  return Math.max(0, Math.round(fetchedCount * keepRate));
}

export function estimateClassificationTokens(keptCount: number): number {
  return estimateGroqClassification(keptCount).estimatedTokens;
}

export type ReviewVolumeStatus = "low" | "ok" | "high";

export function getReviewVolumeStatus(
  totalReviews: number,
): ReviewVolumeStatus {
  if (totalReviews < RECOMMENDED_MIN_REVIEWS_FETCHED) return "low";
  if (totalReviews > RECOMMENDED_MAX_REVIEWS_FETCHED) return "high";
  return "ok";
}

export function formatReviewVolumeRange(): string {
  return `${RECOMMENDED_MIN_REVIEWS_FETCHED.toLocaleString()}–${RECOMMENDED_MAX_REVIEWS_FETCHED.toLocaleString()}`;
}

export function formatAfterCleanupRange(): string {
  return `${RECOMMENDED_MIN_AFTER_CLEANUP.toLocaleString()}–${RECOMMENDED_MAX_AFTER_CLEANUP.toLocaleString()}`;
}
