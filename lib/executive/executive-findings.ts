import {
  confidenceToLevel,
  filterQualifiedInsights,
  hasFallbackContamination,
  topQuotes,
} from "./executive-quality";
import { computeEvidenceStrength } from "../quality/evidence-strength";
import {
  composeFindingDescription,
  composeMechanismTitle,
  displaySegment,
} from "./insight-narratives";
import type {
  BusinessImpactArea,
  ExecutiveFinding,
  ProductInsight,
} from "../types";

function inferBusinessImpact(insight: ProductInsight): BusinessImpactArea[] {
  const impacts = new Set<BusinessImpactArea>();

  impacts.add("Discovery");

  const theme = insight.themes[0];
  if (
    theme === "Repetition Fatigue" ||
    theme === "Poor Recommendation Quality" ||
    theme === "Algorithm Distrust"
  ) {
    impacts.add("Engagement");
    impacts.add("Retention");
  }
  if (theme === "Lack of Discovery Control" || theme === "Genre Lock-In") {
    impacts.add("Engagement");
  }
  if (
    insight.barriers.some((b) => b.includes("Premium") || b.includes("Cold Start"))
  ) {
    impacts.add("Monetization");
  }
  if (
    insight.unmet_needs.includes("Adjustable Novelty") ||
    insight.unmet_needs.includes("Discovery Control")
  ) {
    impacts.add("Retention");
  }

  return [...impacts];
}

export function insightToExecutiveFinding(insight: ProductInsight): ExecutiveFinding {
  const theme = insight.themes[0];
  const barrier = insight.barriers[0];
  const root_cause = insight.root_causes[0];

  const title = composeMechanismTitle(insight);

  const description = insight.mechanism
    ? `${insight.symptom ?? insight.insight} ${insight.mechanism} ${insight.product_implication ?? ""}`.trim()
    : composeFindingDescription(
        insight.insight,
        insight.supporting_segments,
        insight.supporting_reviews,
      );

  const evidence = computeEvidenceStrength(
    insight.supporting_reviews,
    insight.supporting_sources,
  );

  return {
    id: `finding-${insight.id}`,
    title,
    description,
    evidence_count: insight.supporting_reviews,
    affected_segments: insight.supporting_segments.map(displaySegment),
    representative_quotes: topQuotes(insight.representative_quotes, insight, 3),
    confidence: confidenceToLevel(insight.confidence),
    evidence_strength: evidence.strength,
    source_count: evidence.sourceCount,
    business_impact: inferBusinessImpact(insight),
    related_insight_id: insight.id,
    symptom: insight.symptom,
    mechanism: insight.mechanism,
    product_implication: insight.product_implication,
    opportunity: insight.opportunity,
    research_domain: insight.research_domain,
    is_positive: insight.is_positive,
  };
}

export function buildExecutiveFindings(
  insights: ProductInsight[],
): ExecutiveFinding[] {
  return insights.map(insightToExecutiveFinding);
}

export function partitionFindings(insights: ProductInsight[]): {
  discoveryProblems: ExecutiveFinding[];
  recommendationFrustrations: ExecutiveFinding[];
} {
  const { accepted } = filterQualifiedInsights(insights);
  const findings = buildExecutiveFindings(accepted);

  const discoveryProblems = findings.filter((f) =>
    accepted.find(
      (i) =>
        i.id === f.related_insight_id &&
        (i.barriers.length > 0 || i.root_causes.length > 0),
    ),
  );

  const recommendationFrustrations = findings.filter((f) =>
    accepted.find(
      (i) =>
        i.id === f.related_insight_id &&
        i.themes.length > 0 &&
        i.themes[0] !== "Positive Discovery Experience",
    ),
  );

  return {
    discoveryProblems: discoveryProblems.slice(0, 5),
    recommendationFrustrations: recommendationFrustrations.slice(0, 5),
  };
}

export function topDiscoveryProblems(
  insights: ProductInsight[],
  limit = 3,
): ExecutiveFinding[] {
  const { accepted } = filterQualifiedInsights(insights);
  return buildExecutiveFindings(accepted)
    .filter((f) =>
      accepted.some(
        (i) =>
          i.id === f.related_insight_id &&
          (i.barriers.length > 0 || i.root_causes.length > 0),
      ),
    )
    .sort((a, b) => b.evidence_count - a.evidence_count)
    .slice(0, limit);
}

export function topRecommendationFrustrations(
  insights: ProductInsight[],
  limit = 3,
): ExecutiveFinding[] {
  const { accepted } = filterQualifiedInsights(insights);
  return buildExecutiveFindings(accepted)
    .filter((f) =>
      accepted.some(
        (i) =>
          i.id === f.related_insight_id &&
          i.themes.length > 0 &&
          !i.themes.includes("Positive Discovery Experience"),
      ),
    )
    .sort((a, b) => b.evidence_count - a.evidence_count)
    .slice(0, limit);
}
