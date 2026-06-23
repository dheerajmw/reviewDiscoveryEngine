import { buildResearchFindingsReport } from "../findings";
import type {
  AggregationResult,
  ClassifiedReview,
  ExecutiveResearchReport,
  ResearchFindingsReport,
} from "../types";
import {
  buildExecutiveFindings,
  topDiscoveryProblems,
  topRecommendationFrustrations,
} from "./executive-findings";
import { filterQualifiedInsights } from "./executive-quality";
import {
  buildConfidenceAssessment,
  buildDashboardHeadline,
  buildDiscoveryBehaviorNarratives,
  buildDirectorReadiness,
  buildExecutiveSummary,
  buildFallbackSummary,
  buildSlideFindings,
  buildUnmetNeedNarratives,
  collectKeyQuotes,
} from "./executive-report";
import { synthesizeInsights } from "./insight-synthesis";
import {
  countMechanismFindings,
  partitionByPolarity,
  selectDiverseInsights,
} from "./mechanism-extraction";
import { buildSegmentIntelligence } from "./segment-intelligence";
import {
  buildStrategicOpportunities,
  rankTopOpportunities,
} from "./strategic-opportunities";

export function buildExecutiveResearchReport(input: {
  classified: ClassifiedReview[];
  aggregation: AggregationResult;
  findingsReport?: ResearchFindingsReport;
}): ExecutiveResearchReport {
  const { classified, aggregation } = input;
  const findingsReport =
    input.findingsReport ??
    buildResearchFindingsReport(aggregation, classified);

  const researchCount = aggregation.discoveryRelevantCount;
  const candidates = synthesizeInsights(classified);
  const diversified = selectDiverseInsights(candidates, researchCount);
  const pool = diversified.length > 0 ? diversified : candidates;

  const { accepted, rejected } = filterQualifiedInsights(pool);
  const qualifiedPool = accepted;

  const qualifiedFindings = buildExecutiveFindings(qualifiedPool);
  const { positive, negative } = partitionByPolarity(qualifiedPool);

  const positiveSignals = buildExecutiveFindings(
    positive.slice(0, 3),
  );
  const discoveryProblems = topDiscoveryProblems(negative, 3);
  const recommendationFrustrations = topRecommendationFrustrations(
    negative,
    3,
  );

  const allFindingsForOpps = qualifiedFindings.filter((f) => !f.is_positive);

  const opportunities = rankTopOpportunities(
    buildStrategicOpportunities(allFindingsForOpps, pool),
    pool,
    5,
  );

  const executive_summary =
    qualifiedFindings.length > 0
      ? buildExecutiveSummary({
          discoveryProblems,
          recommendationFrustrations,
          opportunities,
          aggregation,
          positiveSignals,
        })
      : buildFallbackSummary(findingsReport, aggregation);

  const dashboard_headline = buildDashboardHeadline({
    positiveSignals,
    discoveryProblems,
    recommendationFrustrations,
    aggregation,
  });

  const keyFindings = qualifiedFindings;

  const mechanismCount = countMechanismFindings(qualifiedPool);
  const director_readiness = buildDirectorReadiness({
    findings: qualifiedFindings,
    opportunities,
    mechanismCount,
    researchCount,
    rejectedCount: rejected.length,
  });

  return {
    generated_at: new Date().toISOString(),
    executive_summary,
    dashboard_headline,
    insights: qualifiedPool,
    positive_discovery_signals: positiveSignals,
    top_discovery_problems: discoveryProblems,
    top_recommendation_frustrations: recommendationFrustrations,
    discovery_behaviors: buildDiscoveryBehaviorNarratives(classified),
    segment_differences: buildSegmentIntelligence(classified, aggregation),
    unmet_needs: buildUnmetNeedNarratives(classified),
    strategic_opportunities: opportunities,
    key_quotes: collectKeyQuotes(keyFindings),
    confidence_assessment: buildConfidenceAssessment(
      qualifiedPool,
      keyFindings,
    ),
    slides: buildSlideFindings(keyFindings, opportunities, pool),
    quality: {
      total_candidates: candidates.length,
      accepted: accepted.length,
      rejected: rejected.length,
      rejection_reasons: [
        ...new Set(rejected.flatMap((r) => r.reasons)),
      ].slice(0, 10),
    },
    director_readiness,
  };
}

export { formatExecutiveReportMarkdown } from "./executive-report";
