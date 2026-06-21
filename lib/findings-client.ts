import { buildResearchFindings } from "./findings";
import type { AggregationResult, ClassifiedReview, ResearchFindings } from "./types";

export async function fetchFindings(
  evidence: AggregationResult,
): Promise<ResearchFindings> {
  const response = await fetch("/api/findings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evidence }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Findings request failed.");
  }

  return data.findings as ResearchFindings;
}

export function computeFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[] = [],
): ResearchFindings {
  return buildResearchFindings(evidence, reviews);
}
