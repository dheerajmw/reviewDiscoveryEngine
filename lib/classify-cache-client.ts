import { parseApiJson } from "./parse-api-response";
import type { ClassifiedReview, RawReview } from "./types";

export interface ClassificationCacheStatus {
  total: number;
  cachedCount: number;
  classified: ClassifiedReview[];
  model: string;
}

export async function fetchClassificationCacheStatus(
  reviews: RawReview[],
): Promise<ClassificationCacheStatus> {
  const response = await fetch("/api/classify/cache", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews }),
  });

  const data = await parseApiJson<ClassificationCacheStatus & { error?: string }>(
    response,
  );

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to check classification cache.");
  }

  return data;
}

/** Minimum cached reviews required to build a partial dashboard. */
export const MIN_PARTIAL_ANALYSIS_REVIEWS = 10;
