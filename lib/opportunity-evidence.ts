import {
  averageConfidence,
  buildSourceDistribution,
} from "./finding-evidence";
import type { AggregationResult, OpportunityWithEvidence } from "./types";

export function buildOpportunitiesFromEvidence(
  evidence: AggregationResult,
): OpportunityWithEvidence[] {
  return evidence.unmetNeedEvidence.slice(0, 3).map((cluster) => {
    const quotes = cluster.quotes.slice(0, 5);
    return {
      title: cluster.label,
      description: `Address "${cluster.label}" — cited in ${cluster.count} reviews (${cluster.pct}% of discovery corpus).`,
      supporting_unmet_needs: [cluster.label],
      evidence_count: cluster.count,
      confidence: averageConfidence(
        quotes.map((q) => ({ confidence: q.confidence }) as never),
      ),
      quotes,
      source_distribution: buildSourceDistribution(
        quotes.map((q) => ({ source: q.source }) as never),
      ),
      related_review_ids: quotes.map((q) => q.review_id),
    };
  });
}
