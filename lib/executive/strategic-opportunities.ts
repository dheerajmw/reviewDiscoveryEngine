import { reviewsMatchingLabel } from "../finding-evidence";
import {
  BEHAVIOR_NARRATIVES,
  OPPORTUNITY_ACTIONS,
  ROOT_CAUSE_INSIGHT_FRAGMENTS,
  UNMET_NEED_NARRATIVES,
  displaySegment,
} from "./insight-narratives";
import {
  confidenceToLevel,
  hasFallbackContamination,
  hasMechanismClarity,
  topQuotes,
} from "./executive-quality";
import { filterBuildableOpportunities } from "../quality/opportunity-quality";
import { insightFallbackPenalty } from "./mechanism-extraction";
import type { ExecutiveFinding, ProductInsight, StrategicOpportunity } from "../types";
import type { OpportunitySize } from "../types";

function behaviorFromInsight(insight: ProductInsight): string {
  if (insight.themes.includes("Repetition Fatigue")) {
    return "Users skip recommendations and return to saved playlists when discovery surfaces feel repetitive.";
  }
  if (insight.barriers.includes("Lack of Exploration Controls")) {
    return "Users attempt to steer discovery manually but lack product controls to signal exploration intent.";
  }
  if (insight.themes.includes("Genre Lock-In")) {
    return "Users actively explore outside their dominant genre but receive recommendations that mirror recent history.";
  }
  return "Users engage with algorithmic playlists expecting novelty, but disengage when familiar artists dominate.";
}

function problemFromInsight(insight: ProductInsight): string {
  if (insight.symptom && insight.mechanism) {
    return `${insight.symptom} ${insight.mechanism}`;
  }
  const root = insight.root_causes[0];
  if (root && ROOT_CAUSE_INSIGHT_FRAGMENTS[root]) {
    return `Users repeatedly encounter familiar content because ${ROOT_CAUSE_INSIGHT_FRAGMENTS[root]}.`;
  }
  return insight.insight;
}

function opportunityFromInsight(insight: ProductInsight): string {
  if (insight.opportunity) return insight.opportunity;
  const need = insight.unmet_needs[0];
  if (need && OPPORTUNITY_ACTIONS[need]) {
    return OPPORTUNITY_ACTIONS[need];
  }
  if (insight.root_causes.includes("Listening History Loop")) {
    return "Introduce exploration-weighted recommendation modes that decouple discovery from recent listening history.";
  }
  if (insight.root_causes.includes("Similarity-Based Reinforcement")) {
    return "Add artist-level diversity constraints to ranking with configurable novelty targets.";
  }
  if (insight.barriers.includes("Lack of Exploration Controls")) {
    return "Ship discovery steering controls — novelty dial, genre boost/block, and exploration reset.";
  }
  if (insight.themes.includes("Repetition Fatigue")) {
    return "Redesign Discover Weekly and Release Radar with freshness guarantees and artist repeat caps.";
  }
  return "Establish discovery quality metrics separate from engagement and optimize flagship surfaces against them.";
}

function impactScore(insight: ProductInsight): number {
  let score = Math.min(5, Math.max(1, insight.severity));
  if (hasMechanismClarity(insight)) score += 0.5;
  if (hasFallbackContamination(insight)) score -= 1.5;
  score -= insightFallbackPenalty(insight) * 3;
  return Math.max(1, Math.min(5, score));
}

function frequencyScore(
  reviewCount: number,
  maxCount: number,
): number {
  if (maxCount === 0) return 1;
  const normalized = reviewCount / maxCount;
  return Math.max(1, Math.round(normalized * 5 * 10) / 10);
}

function confidenceScore(confidence: number): number {
  return Math.max(1, Math.round(confidence * 5 * 10) / 10);
}

function sizeFromScore(score: number): OpportunitySize {
  if (score >= 60) return "Large";
  if (score >= 25) return "Medium";
  return "Small";
}

export function buildStrategicOpportunity(
  finding: ExecutiveFinding,
  insight: ProductInsight,
  maxReviewCount: number,
): StrategicOpportunity {
  const impact = impactScore(insight);
  const frequency = frequencyScore(insight.supporting_reviews, maxReviewCount);
  const confidence = confidenceScore(insight.confidence);
  const opportunity_score =
    Math.round(impact * frequency * confidence * 10) / 10;

  return {
    id: `opp-${insight.id}`,
    problem: problemFromInsight(insight),
    current_user_behavior: behaviorFromInsight(insight),
    root_cause:
      insight.root_causes[0] ??
      "Multiple reinforcement mechanisms bias recommendations toward familiarity.",
    spotify_opportunity: opportunityFromInsight(insight),
    size: sizeFromScore(opportunity_score),
    opportunity_score,
    impact_score: impact,
    frequency_score: frequency,
    confidence_score: confidence,
    supporting_reviews: insight.supporting_reviews,
    affected_segments: finding.affected_segments,
    representative_quotes: topQuotes(insight.representative_quotes, insight, 3),
    related_finding_id: finding.id,
  };
}

export function buildStrategicOpportunities(
  findings: ExecutiveFinding[],
  insights: ProductInsight[],
): StrategicOpportunity[] {
  const insightMap = new Map(insights.map((i) => [i.id, i]));
  const maxCount = Math.max(
    ...insights.map((i) => i.supporting_reviews),
    1,
  );

  return findings
    .map((finding) => {
      const insight = insightMap.get(finding.related_insight_id);
      if (!insight) return null;
      if (insight.is_positive) return null;
      if (hasFallbackContamination(insight) && !hasMechanismClarity(insight)) {
        return null;
      }
      return buildStrategicOpportunity(finding, insight, maxCount);
    })
    .filter((o): o is StrategicOpportunity => o !== null)
    .sort((a, b) => b.opportunity_score - a.opportunity_score);
}

export function rankTopOpportunities(
  opportunities: StrategicOpportunity[],
  insights: ProductInsight[],
  limit = 5,
): StrategicOpportunity[] {
  const { accepted } = filterBuildableOpportunities(opportunities, insights);
  return accepted.slice(0, limit);
}

export { BEHAVIOR_NARRATIVES, UNMET_NEED_NARRATIVES };
