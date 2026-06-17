import type { AggregationResult, ClassifiedReview } from "./types";

export async function fetchAggregation(
  classified: ClassifiedReview[],
): Promise<AggregationResult> {
  const response = await fetch("/api/aggregate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classified }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Aggregation request failed.");
  }

  return data as AggregationResult;
}
