import type {
  AggregationResult,
  AnalysisContext,
  ResearchFindings,
} from "./types";

export function buildAnalysisContext(
  evidence: AggregationResult,
  findings: ResearchFindings,
  options?: { filterNote?: string },
): AnalysisContext {
  return {
    totalReviews: evidence.totalReviews,
    discoveryRelevantCount: evidence.discoveryRelevantCount,
    evidence,
    findings,
    filterNote: options?.filterNote,
  };
}
