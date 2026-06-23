import type {
  AggregationResult,
  AnalysisContext,
  ExecutiveResearchReport,
  ResearchFindings,
} from "./types";

export function buildAnalysisContext(
  evidence: AggregationResult,
  findings: ResearchFindings,
  options?: { filterNote?: string; executive?: ExecutiveResearchReport },
): AnalysisContext {
  return {
    totalReviews: evidence.totalReviews,
    discoveryRelevantCount: evidence.discoveryRelevantCount,
    evidence,
    findings,
    executive: options?.executive,
    filterNote: options?.filterNote,
  };
}
