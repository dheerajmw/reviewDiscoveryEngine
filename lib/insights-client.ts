import type {
  AggregationResult,
  ClassifiedReview,
  ExecutiveResearchReport,
} from "./types";
import { buildExecutiveResearchReport } from "./executive";

export function computeExecutiveInsights(input: {
  classified: ClassifiedReview[];
  aggregation: AggregationResult;
}): ExecutiveResearchReport {
  return buildExecutiveResearchReport(input);
}

export async function fetchExecutiveInsights(input: {
  aggregation: AggregationResult;
  classified: ClassifiedReview[];
}): Promise<ExecutiveResearchReport> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aggregation: input.aggregation,
      classified: input.classified,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Executive insights request failed.",
    );
  }

  const data = (await response.json()) as { executive: ExecutiveResearchReport };
  return data.executive;
}
