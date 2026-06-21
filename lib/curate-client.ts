import type { CurationResult } from "./review-curation";
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Review curation failed.");
  }

  onProgress?.(data.stats?.borderline_reviewed ?? 0, data.stats?.borderline_reviewed ?? 0);

  return data as CurationResult;
}
