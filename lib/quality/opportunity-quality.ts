import type { ProductInsight, StrategicOpportunity } from "../types";

export interface OpportunityQualityCheck {
  passes: boolean;
  reasons: string[];
  isBuildable: boolean;
}

const GENERIC_OPPORTUNITY_PATTERNS = [
  /^improve recommendations?\.?$/i,
  /^better discovery\.?$/i,
  /^improve (the )?algorithm\.?$/i,
  /^improve discovery\.?$/i,
  /^better recommendations?\.?$/i,
  /^fix recommendations?\.?$/i,
  /^improve the recommendation system\.?$/i,
  /^make discovery better\.?$/i,
];

const BUILDABLE_SIGNALS =
  /\b(slider|toggle|cap|detector|onboarding|mode|dial|feedback|constraint|diversity|reset|boost|block|surface|playlist|dj|weekly|radar|control|preference|novelty|exploration)\b/i;

function isGenericOpportunityText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 30) return true;
  return GENERIC_OPPORTUNITY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function checkOpportunityQuality(
  opportunity: StrategicOpportunity,
  insight: ProductInsight,
): OpportunityQualityCheck {
  const reasons: string[] = [];

  const userProblem = opportunity.problem?.trim() ?? "";
  const intervention = opportunity.spotify_opportunity?.trim() ?? "";
  const behavior = opportunity.current_user_behavior?.trim() ?? "";

  if (!userProblem || userProblem.length < 30) {
    reasons.push("Missing substantive user problem");
  }
  if (!intervention || intervention.length < 30) {
    reasons.push("Missing product intervention");
  }
  if (!behavior || behavior.length < 20) {
    reasons.push("Missing expected user behavior / outcome context");
  }
  if (isGenericOpportunityText(intervention)) {
    reasons.push(`Opportunity too generic: "${intervention.slice(0, 60)}"`);
  }

  const isBuildable =
    BUILDABLE_SIGNALS.test(intervention) ||
    intervention.split(/\s+/).length >= 8;

  if (!isBuildable) {
    reasons.push("Opportunity is not product-buildable (no concrete intervention)");
  }

  return {
    passes: reasons.length === 0,
    reasons,
    isBuildable,
  };
}

export function filterBuildableOpportunities(
  opportunities: StrategicOpportunity[],
  insights: ProductInsight[],
): {
  accepted: StrategicOpportunity[];
  rejected: { opportunity: StrategicOpportunity; reasons: string[] }[];
} {
  const insightMap = new Map(insights.map((i) => [i.id, i]));
  const accepted: StrategicOpportunity[] = [];
  const rejected: { opportunity: StrategicOpportunity; reasons: string[] }[] = [];

  for (const opportunity of opportunities) {
    const insightId = opportunity.related_finding_id.replace(/^finding-/, "");
    const insight = insightMap.get(insightId);
    if (!insight) {
      rejected.push({ opportunity, reasons: ["Related insight not found"] });
      continue;
    }
    const check = checkOpportunityQuality(opportunity, insight);
    if (check.passes) {
      accepted.push(opportunity);
    } else {
      rejected.push({ opportunity, reasons: check.reasons });
    }
  }

  return { accepted, rejected };
}

export function opportunityQualityPassRate(
  opportunities: StrategicOpportunity[],
  insights: ProductInsight[],
): number {
  if (opportunities.length === 0) return 0;
  const { accepted } = filterBuildableOpportunities(opportunities, insights);
  return Math.round((accepted.length / opportunities.length) * 1000) / 10;
}
