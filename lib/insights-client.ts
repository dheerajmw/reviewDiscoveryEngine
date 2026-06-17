import type {
  AggregationResult,
  ClassifiedReview,
  InsightResult,
} from "./types";

export async function fetchInsights(
  aggregation: AggregationResult,
  classified: ClassifiedReview[],
): Promise<{ insights: InsightResult; mock: boolean }> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aggregation, classified }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Insight generation failed.");
  }

  return { insights: data.insights as InsightResult, mock: Boolean(data.mock) };
}
