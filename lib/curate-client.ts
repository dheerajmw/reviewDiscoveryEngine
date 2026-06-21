import type { CurationResult } from "./review-curation";
import { parseApiJson } from "./parse-api-response";
import type { RawReview } from "./types";

export async function curateAllReviews(
  reviews: RawReview[],
  onProgress?: (completed: number, total: number) => void,
): Promise<CurationResult> {
  const response = await fetch("/api/curate-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews }),
  });

  const data = await parseApiJson<CurationResult & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(data.error ?? "Review curation failed.");
  }

  onProgress?.(data.stats?.borderline_reviewed ?? 0, data.stats?.borderline_reviewed ?? 0);

  return data as CurationResult;
}
