import type { FilterPrecisionMetrics, FallbackMetrics } from "../pm-research-quality";
import type { ProductInsight, StrategicOpportunity } from "../types";
import { executiveCompletenessRate } from "./executive-component-validation";
import {
  computeEvidenceStrength,
  evidenceStrengthDistribution,
} from "./evidence-strength";
import type { FallbackHealthReport } from "./fallback-health";
import { opportunityQualityPassRate } from "./opportunity-quality";
import type { PositiveDiscoveryValidationResult } from "./positive-discovery-validation";
import { averageQuoteAlignment } from "./quote-alignment";

export type PmReadinessBand =
  | "not_usable"
  | "exploratory"
  | "case_study_ready"
  | "executive_ready";

export interface PmReadinessComponent {
  id: string;
  label: string;
  score: number;
  maxScore: 10;
  detail: string;
}

export interface UnifiedPmReadinessReport {
  score: number;
  maxScore: 10;
  band: PmReadinessBand;
  interpretation: string;
  components: PmReadinessComponent[];
  weaknesses: string[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function bandFromScore(score: number): PmReadinessBand {
  if (score >= 9) return "executive_ready";
  if (score >= 7) return "case_study_ready";
  if (score >= 5) return "exploratory";
  return "not_usable";
}

function bandLabel(band: PmReadinessBand): string {
  switch (band) {
    case "executive_ready":
      return "Executive-ready";
    case "case_study_ready":
      return "PM case-study ready";
    case "exploratory":
      return "Exploratory only";
    default:
      return "Not usable";
  }
}

export function buildUnifiedPmReadinessReport(input: {
  curationFilter: FilterPrecisionMetrics;
  llmFilter: FilterPrecisionMetrics;
  fallback: FallbackMetrics;
  fallbackHealth: FallbackHealthReport;
  positiveValidation: PositiveDiscoveryValidationResult;
  insights: ProductInsight[];
  opportunities: StrategicOpportunity[];
}): UnifiedPmReadinessReport {
  const weaknesses: string[] = [];

  const filterScore = clampScore(
    (input.llmFilter.precisionPct / 10 + input.llmFilter.recallPct / 10) / 2,
  );

  const fallbackPenalty =
    (Math.max(0, input.fallback.otherDiscoveryFrustrationPct - 25) / 5 +
      Math.max(0, input.fallback.generalDiscoveryImprovementPct - 15) / 3 +
      Math.max(0, input.fallback.unclearDiscoveryStrugglePct - 25) / 5 +
      Math.max(0, input.fallback.unclearRepetitionCausePct - 20) / 4) /
    4;
  const fallbackScore = clampScore(10 - fallbackPenalty);
  if (input.fallbackHealth.flagged) {
    weaknesses.push(input.fallbackHealth.warning ?? "Fallback thresholds exceeded");
  }

  const positiveScore = clampScore(
    (input.positiveValidation.detectionRatePct / 100) * 10,
  );
  if (!input.positiveValidation.passesTarget) {
    weaknesses.push(
      `Positive discovery detection ${input.positiveValidation.detectionRatePct}% (target ≥${input.positiveValidation.targetPct}%)`,
    );
  }

  const quoteStats = averageQuoteAlignment(input.insights);
  const quoteScore = clampScore(quoteStats.score / 10);

  const oppPassRate = opportunityQualityPassRate(
    input.opportunities,
    input.insights,
  );
  const opportunityScore = clampScore((oppPassRate / 100) * 10);

  const strengthSummaries = input.insights.map((insight) =>
    computeEvidenceStrength(
      insight.supporting_reviews,
      insight.supporting_sources,
    ),
  );
  const strengthDist = evidenceStrengthDistribution(strengthSummaries);
  const evidenceScore = clampScore(
    (strengthDist.strongPct / 100) * 7 +
      (strengthDist.medium / Math.max(1, input.insights.length)) * 3,
  );

  const completenessPct = executiveCompletenessRate(input.insights);
  const completenessScore = clampScore((completenessPct / 100) * 10);
  if (completenessPct < 70) {
    weaknesses.push(
      `Only ${completenessPct}% of executive insights have all four required components`,
    );
  }

  const components: PmReadinessComponent[] = [
    {
      id: "discovery_filter",
      label: "Discovery filter quality",
      score: filterScore,
      maxScore: 10,
      detail: `LLM precision ${input.llmFilter.precisionPct}%, recall ${input.llmFilter.recallPct}%`,
    },
    {
      id: "fallback_rate",
      label: "Fallback rate",
      score: fallbackScore,
      maxScore: 10,
      detail: `Other Discovery Frustration ${input.fallback.otherDiscoveryFrustrationPct}%`,
    },
    {
      id: "positive_discovery",
      label: "Positive discovery coverage",
      score: positiveScore,
      maxScore: 10,
      detail: `Detection rate ${input.positiveValidation.detectionRatePct}%`,
    },
    {
      id: "quote_alignment",
      label: "Quote alignment",
      score: quoteScore,
      maxScore: 10,
      detail: `Strong ${quoteStats.strongPct}%, weak rejected from reports`,
    },
    {
      id: "opportunity_quality",
      label: "Opportunity quality",
      score: opportunityScore,
      maxScore: 10,
      detail: `${oppPassRate}% pass buildability gate`,
    },
    {
      id: "evidence_strength",
      label: "Evidence strength",
      score: evidenceScore,
      maxScore: 10,
      detail: `${strengthDist.strong} strong, ${strengthDist.medium} medium, ${strengthDist.weak} weak`,
    },
    {
      id: "executive_completeness",
      label: "Executive insight completeness",
      score: completenessScore,
      maxScore: 10,
      detail: `${completenessPct}% insights with problem, mechanism, implication, opportunity`,
    },
  ];

  const score = clampScore(
    components.reduce((sum, c) => sum + c.score, 0) / components.length,
  );
  const band = bandFromScore(score);

  return {
    score,
    maxScore: 10,
    band,
    interpretation: bandLabel(band),
    components,
    weaknesses:
      weaknesses.length > 0
        ? weaknesses
        : ["No major quality blockers detected in this evaluation."],
  };
}
