import { aggregateReviews } from "./aggregation";
import {
  RESEARCH_QUESTION_IDS,
  RESEARCH_QUESTION_LABELS,
  type ResearchQuestionId,
} from "./classify-research";
import { buildExecutiveResearchReport } from "./executive";
import { buildResearchFindingsReport } from "./findings";
import {
  averageQuoteAlignment,
  buildFallbackHealthReport,
  buildUnifiedPmReadinessReport,
  evidenceStrengthDistribution,
  opportunityQualityPassRate,
  validatePositiveDiscoveryClassification,
  type FallbackHealthReport,
  type PositiveDiscoveryValidationResult,
  type UnifiedPmReadinessReport,
} from "./quality";
import { computeEvidenceStrength } from "./quality/evidence-strength";
import { executiveCompletenessRate } from "./quality/executive-component-validation";
import { preprocessReview } from "./review-preprocessing/preprocess-review";
import {
  FALLBACK_LABELS,
  OTHER_UNKNOWN_LABELS,
} from "./taxonomy";
import type {
  ClassifiedReview,
  EvidenceBackedFinding,
  RawReview,
} from "./types";

export const PM_QUALITY_BENCHMARK = {
  otherDiscoveryFrustrationPct: 45.6,
  generalDiscoveryImprovementPct: 36.8,
  unclearDiscoveryStrugglePct: 47.4,
  unclearRepetitionCausePct: 63.2,
  fallbackReviewPct: 78.9,
} as const;

export type EvaluationCohort =
  | "discovery_sample"
  | "non_discovery_sample"
  | "edge_case";

export interface EvaluatedReview extends RawReview {
  eval_id: string;
  cohort: EvaluationCohort;
  expected_discovery_relevant: boolean;
  edge_category?: string;
  expected_theme?: string;
  /** Pre-classification curation gate */
  curation_discovery_relevant: boolean;
  curation_reason: string;
}

export interface FilterPrecisionMetrics {
  total: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  correctlyIncludedPct: number;
  correctlyExcludedPct: number;
  falsePositiveRatePct: number;
  falseNegativeRatePct: number;
  precisionPct: number;
  recallPct: number;
}

export interface FallbackMetrics {
  otherDiscoveryFrustrationPct: number;
  generalDiscoveryImprovementPct: number;
  unclearDiscoveryStrugglePct: number;
  unclearRepetitionCausePct: number;
  anyFallbackLabelPct: number;
  researchReviewCount: number;
}

export interface PositiveDiscoveryCoverage {
  positiveThemeCount: number;
  positiveThemePct: number;
  discoverWeeklyPraiseCount: number;
  djPraiseCount: number;
  successfulArtistDiscoveryCount: number;
  recommendationSatisfactionCount: number;
}

export interface BeforeAfterMetric {
  metric: string;
  before: number;
  after: number;
  delta: number;
  improved: boolean;
  target?: string;
}

export interface PmResearchQualityReport {
  generatedAt: string;
  model: string;
  classifierMode: "gemini" | "mock";
  seed: number;
  corpusStats: {
    totalLoaded: number;
    curationIncluded: number;
    curationExcluded: number;
  };
  sampleCounts: {
    discovery: number;
    nonDiscovery: number;
    edgeCases: number;
    total: number;
  };
  discoveryFilter: {
    curation: FilterPrecisionMetrics;
    llm: FilterPrecisionMetrics;
    edgeCaseBreakdown: Record<
      string,
      { total: number; curationCorrect: number; llmCorrect: number }
    >;
  };
  taxonomy: {
    theme: DistributionRow[];
    barrier: DistributionRow[];
    root_cause: DistributionRow[];
    unmet_need: DistributionRow[];
  };
  fallback: FallbackMetrics;
  positiveDiscovery: PositiveDiscoveryCoverage;
  researchQuestions: ResearchQuestionCoverage[];
  evidenceQuality: EvidenceQualityFinding[];
  beforeAfter: BeforeAfterMetric[];
  pmReadinessScore: {
    score: number;
    maxScore: 10;
    rationale: string;
    remainingWeaknesses: string[];
    interpretation: string;
    components: UnifiedPmReadinessReport["components"];
  };
  positiveDiscoveryValidation: PositiveDiscoveryValidationResult;
  fallbackHealth: FallbackHealthReport;
  executiveValidation: {
    qualifiedInsightCount: number;
    completenessPct: number;
    quoteAlignment: ReturnType<typeof averageQuoteAlignment>;
    opportunityPassRate: number;
    evidenceStrength: ReturnType<typeof evidenceStrengthDistribution>;
  };
  directorReadinessScore: {
    score: number;
    maxScore: 10;
    rationale: string;
    executiveFindings: number;
    mechanismFindings: number;
    strategicOpportunities: number;
  };
  warnings: string[];
}

export interface DistributionRow {
  label: string;
  count: number;
  percent: string;
}

export interface ResearchQuestionCoverage {
  id: ResearchQuestionId;
  question: string;
  topFindings: {
    title: string;
    summary: string;
    supportingReviewCount: number;
    confidence: number;
    quotes: { text: string; source: string; segment?: string }[];
  }[];
  reviewsSupportingQuestion: number;
}

export interface EvidenceQualityFinding {
  findingId: string;
  title: string;
  supportingReviewCount: number;
  confidence: number;
  representativeQuotes: string[];
  segments: string[];
  sources: string[];
  hasClassificationReasons: boolean;
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function distribution(labels: string[]): DistributionRow[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = labels.length;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      percent: `${pct(count, total)}%`,
    }));
}

export function computeFilterPrecision(
  items: {
    expected: boolean;
    actual: boolean;
  }[],
): FilterPrecisionMetrics {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const { expected, actual } of items) {
    if (expected && actual) tp++;
    else if (!expected && !actual) tn++;
    else if (!expected && actual) fp++;
    else fn++;
  }

  const total = items.length;
  return {
    total,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    correctlyIncludedPct: pct(tp, tp + fn),
    correctlyExcludedPct: pct(tn, tn + fp),
    falsePositiveRatePct: pct(fp, fp + tn),
    falseNegativeRatePct: pct(fn, fn + tp),
    precisionPct: pct(tp, tp + fp),
    recallPct: pct(tp, tp + fn),
  };
}

export function enrichWithCuration(
  reviews: Omit<EvaluatedReview, "curation_discovery_relevant" | "curation_reason">[],
): EvaluatedReview[] {
  return reviews.map((review, index) => {
    const preprocessed = preprocessReview(
      review.source,
      review.text,
      review.eval_id ?? `eval-${index + 1}`,
    );
    return {
      ...review,
      curation_discovery_relevant: preprocessed.discovery_relevant,
      curation_reason: preprocessed.discovery_reason,
      cleaned_text: preprocessed.cleaned_text,
      primary_category: preprocessed.primary_category,
      discovery_outcome: preprocessed.discovery_outcome,
      user_goal: preprocessed.user_goal,
    };
  });
}

function researchReviews(classified: ClassifiedReview[]): ClassifiedReview[] {
  return classified.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
}

export function computeFallbackMetrics(
  classified: ClassifiedReview[],
): FallbackMetrics {
  const research = researchReviews(classified);
  const n = research.length;
  const themes = research.map((r) => r.theme);
  const barriers = research.map((r) => r.barrier);
  const roots = research.map((r) => r.root_cause);
  const needs = research.map((r) => r.unmet_need);

  const anyFallback = research.filter((r) =>
    [r.theme, r.barrier, r.root_cause, r.unmet_need, r.segment].some((f) =>
      OTHER_UNKNOWN_LABELS.has(f),
    ),
  ).length;

  return {
    researchReviewCount: n,
    otherDiscoveryFrustrationPct: pct(
      themes.filter((t) => t === FALLBACK_LABELS.theme).length,
      n,
    ),
    generalDiscoveryImprovementPct: pct(
      needs.filter((u) => u === FALLBACK_LABELS.unmet_need).length,
      n,
    ),
    unclearDiscoveryStrugglePct: pct(
      barriers.filter((b) => b === FALLBACK_LABELS.barrier).length,
      n,
    ),
    unclearRepetitionCausePct: pct(
      roots.filter((r) => r === FALLBACK_LABELS.root_cause).length,
      n,
    ),
    anyFallbackLabelPct: pct(anyFallback, n),
  };
}

const POSITIVE_PATTERNS = {
  discoverWeekly: /\b(discover weekly|release radar).{0,40}(love|great|amazing|best|introduced|found)/i,
  dj: /\b(dj|spotify dj).{0,40}(love|amazing|great|best)/i,
  artistDiscovery: /\b(introduced me to|found (new |so many )?artists?|discover(ed)? new artists?)/i,
  recSatisfaction: /\b(recommendations? (are |is )?(spot on|great|excellent|work well|amazing))/i,
};

export function computePositiveDiscoveryCoverage(
  classified: ClassifiedReview[],
): PositiveDiscoveryCoverage {
  const research = researchReviews(classified);
  const n = research.length;
  const positiveTheme = research.filter(
    (r) => r.theme === "Positive Discovery Experience",
  );

  return {
    positiveThemeCount: positiveTheme.length,
    positiveThemePct: pct(positiveTheme.length, n),
    discoverWeeklyPraiseCount: research.filter((r) =>
      POSITIVE_PATTERNS.discoverWeekly.test(r.text),
    ).length,
    djPraiseCount: research.filter((r) => POSITIVE_PATTERNS.dj.test(r.text)).length,
    successfulArtistDiscoveryCount: research.filter((r) =>
      POSITIVE_PATTERNS.artistDiscovery.test(r.text),
    ).length,
    recommendationSatisfactionCount: research.filter((r) =>
      POSITIVE_PATTERNS.recSatisfaction.test(r.text),
    ).length,
  };
}

function findingToCoverage(
  id: ResearchQuestionId,
  finding: EvidenceBackedFinding | EvidenceBackedFinding[],
  classified: ClassifiedReview[],
): ResearchQuestionCoverage {
  const findings = Array.isArray(finding) ? finding : [finding];
  const reviewsForQuestion = classified.filter(
    (r) => r.supports_questions?.includes(id),
  );

  return {
    id,
    question: RESEARCH_QUESTION_LABELS[id],
    topFindings: findings.slice(0, 3).map((f) => ({
      title: f.title,
      summary: f.summary,
      supportingReviewCount: f.evidence_count,
      confidence: Math.round(f.confidence * 100) / 100,
      quotes: f.quotes.slice(0, 3).map((q) => ({
        text: q.text.slice(0, 200),
        source: q.source,
        segment: q.segment,
      })),
    })),
    reviewsSupportingQuestion: reviewsForQuestion.length,
  };
}

export function buildEvidenceQuality(
  report: ReturnType<typeof buildResearchFindingsReport>,
  classified: ClassifiedReview[],
): EvidenceQualityFinding[] {
  const allFindings: EvidenceBackedFinding[] = [
    report.why_discovery_fails,
    ...report.top_frustrations,
    ...report.listening_behaviors,
    ...report.repetition_causes,
    ...report.unmet_needs,
  ];

  return allFindings.map((f) => {
    const related = classified.filter((r) =>
      f.related_review_ids?.includes(r.review_id ?? ""),
    );
    const hasReasons = related.some(
      (r) =>
        r.classification_reasons &&
        Object.keys(r.classification_reasons).length > 0,
    );

    return {
      findingId: f.id,
      title: f.title,
      supportingReviewCount: f.evidence_count,
      confidence: Math.round(f.confidence * 100) / 100,
      representativeQuotes: f.quotes.slice(0, 3).map((q) => q.text.slice(0, 180)),
      segments: [...new Set(f.quotes.map((q) => q.segment).filter(Boolean))] as string[],
      sources: [...new Set(f.quotes.map((q) => q.source).filter(Boolean))] as string[],
      hasClassificationReasons: hasReasons,
    };
  });
}

export function buildBeforeAfter(
  fallback: FallbackMetrics,
): BeforeAfterMetric[] {
  const rows: { key: keyof FallbackMetrics; label: string; target: string }[] = [
    {
      key: "otherDiscoveryFrustrationPct",
      label: "Other Discovery Frustration",
      target: "<25%",
    },
    {
      key: "generalDiscoveryImprovementPct",
      label: "General Discovery Improvement",
      target: "<15%",
    },
    {
      key: "unclearDiscoveryStrugglePct",
      label: "Unclear Discovery Struggle",
      target: "<25%",
    },
    {
      key: "unclearRepetitionCausePct",
      label: "Unclear Repetition Cause",
      target: "<20%",
    },
    {
      key: "anyFallbackLabelPct",
      label: "Reviews with any fallback label",
      target: "<40%",
    },
  ];

  const benchmarkMap: Record<string, number> = {
    otherDiscoveryFrustrationPct: PM_QUALITY_BENCHMARK.otherDiscoveryFrustrationPct,
    generalDiscoveryImprovementPct:
      PM_QUALITY_BENCHMARK.generalDiscoveryImprovementPct,
    unclearDiscoveryStrugglePct: PM_QUALITY_BENCHMARK.unclearDiscoveryStrugglePct,
    unclearRepetitionCausePct: PM_QUALITY_BENCHMARK.unclearRepetitionCausePct,
    anyFallbackLabelPct: PM_QUALITY_BENCHMARK.fallbackReviewPct,
  };

  return rows.map(({ key, label, target }) => {
    const before = benchmarkMap[key] ?? 0;
    const after = fallback[key] as number;
    const delta = Math.round((before - after) * 10) / 10;
    return {
      metric: label,
      before,
      after,
      delta,
      improved: after < before,
      target,
    };
  });
}

export function computePmReadinessScore(input: {
  curationFilter: FilterPrecisionMetrics;
  llmFilter: FilterPrecisionMetrics;
  fallback: FallbackMetrics;
  positive: PositiveDiscoveryCoverage;
  beforeAfter: BeforeAfterMetric[];
  evidenceQuality: EvidenceQualityFinding[];
  edgeCaseLlmAccuracy: number;
}): PmResearchQualityReport["pmReadinessScore"] {
  const weaknesses: string[] = [];
  let score = 10;

  if (input.curationFilter.falsePositiveRatePct > 15) {
    score -= 1.5;
    weaknesses.push(
      `Curation false-positive rate ${input.curationFilter.falsePositiveRatePct}% — non-discovery reviews still entering pipeline.`,
    );
  }
  if (input.llmFilter.falsePositiveRatePct > 10) {
    score -= 1.5;
    weaknesses.push(
      `LLM false-positive rate ${input.llmFilter.falsePositiveRatePct}% — classifier keeps non-research reviews.`,
    );
  }
  if (input.llmFilter.falseNegativeRatePct > 15) {
    score -= 1;
    weaknesses.push(
      `LLM false-negative rate ${input.llmFilter.falseNegativeRatePct}% — discovery reviews rejected.`,
    );
  }
  if (input.fallback.unclearRepetitionCausePct > 25) {
    score -= 1.5;
    weaknesses.push(
      `Unclear Repetition Cause still ${input.fallback.unclearRepetitionCausePct}% — root-cause insights weak.`,
    );
  }
  if (input.fallback.otherDiscoveryFrustrationPct > 30) {
    score -= 1;
    weaknesses.push(
      `Other Discovery Frustration ${input.fallback.otherDiscoveryFrustrationPct}% — theme bucket still overloaded.`,
    );
  }
  if (input.fallback.anyFallbackLabelPct > 50) {
    score -= 1;
    weaknesses.push(
      `${input.fallback.anyFallbackLabelPct}% of research reviews contain fallback labels.`,
    );
  }
  if (input.positive.positiveThemeCount === 0) {
    score -= 0.5;
    weaknesses.push("No Positive Discovery Experience themes detected in sample.");
  }
  const withReasons = input.evidenceQuality.filter((f) => f.hasClassificationReasons).length;
  if (withReasons < input.evidenceQuality.length * 0.3) {
    score -= 0.5;
    weaknesses.push("Few findings include per-field classification_reasons for PM audit.");
  }
  if (input.edgeCaseLlmAccuracy < 70) {
    score -= 1;
    weaknesses.push(
      `Edge-case LLM accuracy ${input.edgeCaseLlmAccuracy}% — struggles on curated boundary cases.`,
    );
  }

  const improvedCount = input.beforeAfter.filter((m) => m.improved).length;
  if (improvedCount < 3) {
    score -= 1;
    weaknesses.push("Limited improvement vs benchmark on key fallback metrics.");
  }

  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  const rationale =
    score >= 8
      ? "System produces actionable, evidence-backed answers to most PM questions with acceptable fallback rates."
      : score >= 6
        ? "Usable for exploratory PM research but not yet executive-ready — fallback buckets and filter precision need work."
        : score >= 4
          ? "Partial research value — taxonomy collapse and filter leaks limit trust in findings."
          : "Not ready for PM discovery research — high false-positive rate and fallback dominance.";

  if (weaknesses.length === 0) {
    weaknesses.push("No major blockers identified in this evaluation sample.");
  }

  return { score, maxScore: 10, rationale, remainingWeaknesses: weaknesses };
}

export function buildPmResearchQualityReport(input: {
  evaluated: EvaluatedReview[];
  classified: ClassifiedReview[];
  positiveDiscoveryClassified?: ClassifiedReview[];
  model: string;
  classifierMode: "gemini" | "mock";
  seed: number;
  corpusStats: PmResearchQualityReport["corpusStats"];
  warnings?: string[];
}): PmResearchQualityReport {
  const { evaluated, classified } = input;

  const classifiedById = new Map(
    classified.map((r, i) => [evaluated[i]?.eval_id ?? `idx-${i}`, r]),
  );

  const curationPairs = evaluated.map((e) => ({
    expected: e.expected_discovery_relevant,
    actual: e.curation_discovery_relevant,
  }));

  const llmPairs = evaluated.map((e) => {
    const c = classifiedById.get(e.eval_id);
    const actual = Boolean(
      c?.research_relevant !== false && c?.discovery_relevant,
    );
    return { expected: e.expected_discovery_relevant, actual };
  });

  const edgeCaseBreakdown: Record<
    string,
    { total: number; curationCorrect: number; llmCorrect: number }
  > = {};

  for (const e of evaluated.filter((x) => x.cohort === "edge_case")) {
    const cat = e.edge_category ?? "unknown";
    if (!edgeCaseBreakdown[cat]) {
      edgeCaseBreakdown[cat] = { total: 0, curationCorrect: 0, llmCorrect: 0 };
    }
    edgeCaseBreakdown[cat].total++;
    if (e.curation_discovery_relevant === e.expected_discovery_relevant) {
      edgeCaseBreakdown[cat].curationCorrect++;
    }
    const c = classifiedById.get(e.eval_id);
    const llmActual = Boolean(
      c?.research_relevant !== false && c?.discovery_relevant,
    );
    if (llmActual === e.expected_discovery_relevant) {
      edgeCaseBreakdown[cat].llmCorrect++;
    }
  }

  const edgeTotals = Object.values(edgeCaseBreakdown).reduce(
    (acc, v) => ({
      total: acc.total + v.total,
      correct: acc.correct + v.llmCorrect,
    }),
    { total: 0, correct: 0 },
  );
  const edgeCaseLlmAccuracy = pct(edgeTotals.correct, edgeTotals.total);

  const research = researchReviews(classified);
  const fallback = computeFallbackMetrics(classified);
  const positive = computePositiveDiscoveryCoverage(classified);
  const aggregation = aggregateReviews(classified);
  const findingsReport = buildResearchFindingsReport(aggregation, classified);
  const evidenceQuality = buildEvidenceQuality(findingsReport, classified);

  const researchQuestions: ResearchQuestionCoverage[] = RESEARCH_QUESTION_IDS.map(
    (id) => {
      const finding =
        id === "why_discovery_fails"
          ? findingsReport.why_discovery_fails
          : id === "top_frustrations"
            ? findingsReport.top_frustrations
            : id === "listening_behaviors"
              ? findingsReport.listening_behaviors
              : id === "repetition_causes"
                ? findingsReport.repetition_causes
                : id === "segment_challenges"
                  ? findingsReport.segment_challenges.map((s) => ({
                      id: s.id,
                      title: `${s.segment}: ${s.challenge}`,
                      summary: `${s.challenge} affects ${s.segment} listeners (${s.pct}%).`,
                      evidence_count: s.evidence_count,
                      confidence: s.confidence,
                      quotes: s.quotes,
                      source_distribution: s.source_distribution,
                      top_segments: [{ segment: s.segment, count: s.evidence_count, pct: s.pct }],
                      related_review_ids: s.related_review_ids,
                    }))
                  : findingsReport.unmet_needs;
      return findingToCoverage(id, finding as EvidenceBackedFinding | EvidenceBackedFinding[], classified);
    },
  );

  const beforeAfter = buildBeforeAfter(fallback);
  const curationFilter = computeFilterPrecision(curationPairs);
  const llmFilter = computeFilterPrecision(llmPairs);

  const positiveDiscoveryValidation = validatePositiveDiscoveryClassification(
    input.positiveDiscoveryClassified ?? classified,
  );
  const fallbackHealth = buildFallbackHealthReport(classified, 100);

  const executive = buildExecutiveResearchReport({
    classified,
    aggregation,
    findingsReport,
  });

  const quoteAlignment = averageQuoteAlignment(executive.insights);
  const opportunityPassRate = opportunityQualityPassRate(
    executive.strategic_opportunities,
    executive.insights,
  );
  const evidenceStrength = evidenceStrengthDistribution(
    executive.insights.map((insight) =>
      computeEvidenceStrength(
        insight.supporting_reviews,
        insight.supporting_sources,
      ),
    ),
  );

  const unifiedPmReadiness = buildUnifiedPmReadinessReport({
    curationFilter,
    llmFilter,
    fallback,
    fallbackHealth,
    positiveValidation: positiveDiscoveryValidation,
    insights: executive.insights,
    opportunities: executive.strategic_opportunities,
  });

  const pmReadinessScore = {
    score: unifiedPmReadiness.score,
    maxScore: 10 as const,
    rationale: unifiedPmReadiness.interpretation,
    remainingWeaknesses: unifiedPmReadiness.weaknesses,
    interpretation: unifiedPmReadiness.interpretation,
    components: unifiedPmReadiness.components,
  };

  const warnings = [...(input.warnings ?? [])];
  if (!positiveDiscoveryValidation.passesTarget) {
    warnings.push(
      `Positive Discovery Detection Rate ${positiveDiscoveryValidation.detectionRatePct}% is below target (${positiveDiscoveryValidation.targetPct}%).`,
    );
  }
  if (fallbackHealth.flagged && fallbackHealth.warning) {
    warnings.push(fallbackHealth.warning);
    for (const item of fallbackHealth.exceeded) {
      warnings.push(
        `${item.metric}: ${item.actualPct}% (threshold <${item.thresholdPct}%)`,
      );
    }
  }

  const mechanismFindings = executive.insights.filter(
    (i) => i.mechanism && i.root_causes.some((r) => !OTHER_UNKNOWN_LABELS.has(r)),
  ).length;

  const directorReadinessScore = {
    score: executive.director_readiness?.score ?? 0,
    maxScore: 10 as const,
    rationale:
      executive.director_readiness?.rationale ??
      "Executive synthesis unavailable.",
    executiveFindings: executive.insights.length,
    mechanismFindings,
    strategicOpportunities: executive.strategic_opportunities.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    model: input.model,
    classifierMode: input.classifierMode,
    seed: input.seed,
    corpusStats: input.corpusStats,
    sampleCounts: {
      discovery: evaluated.filter((e) => e.cohort === "discovery_sample").length,
      nonDiscovery: evaluated.filter((e) => e.cohort === "non_discovery_sample")
        .length,
      edgeCases: evaluated.filter((e) => e.cohort === "edge_case").length,
      total: evaluated.length,
    },
    discoveryFilter: {
      curation: curationFilter,
      llm: llmFilter,
      edgeCaseBreakdown,
    },
    taxonomy: {
      theme: distribution(research.map((r) => r.theme)),
      barrier: distribution(research.map((r) => r.barrier)),
      root_cause: distribution(research.map((r) => r.root_cause)),
      unmet_need: distribution(research.map((r) => r.unmet_need)),
    },
    fallback,
    positiveDiscovery: positive,
    researchQuestions,
    evidenceQuality,
    beforeAfter,
    pmReadinessScore,
    positiveDiscoveryValidation,
    fallbackHealth,
    executiveValidation: {
      qualifiedInsightCount: executive.insights.length,
      completenessPct: executiveCompletenessRate(executive.insights),
      quoteAlignment,
      opportunityPassRate,
      evidenceStrength,
    },
    directorReadinessScore,
    warnings,
  };
}

export function formatPmResearchQualityMarkdown(
  report: PmResearchQualityReport,
): string {
  const lines: string[] = [];
  lines.push("# PM Research Quality Report");
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Classifier:** ${report.classifierMode} (${report.model})`);
  lines.push(`**PM Readiness Score:** ${report.pmReadinessScore.score}/10 — ${report.pmReadinessScore.interpretation}`);
  lines.push("");
  lines.push(`> ${report.pmReadinessScore.rationale}`);
  lines.push("");
  lines.push("### PM Readiness Components");
  for (const component of report.pmReadinessScore.components) {
    lines.push(
      `- **${component.label}:** ${component.score}/10 — ${component.detail}`,
    );
  }
  lines.push("");
  lines.push(`**Director Readiness Score:** ${report.directorReadinessScore.score}/10`);
  lines.push("");
  lines.push(`> ${report.directorReadinessScore.rationale}`);
  lines.push("");
  lines.push(
    `- Executive findings: ${report.directorReadinessScore.executiveFindings}`,
  );
  lines.push(
    `- Mechanism-level findings: ${report.directorReadinessScore.mechanismFindings}`,
  );
  lines.push(
    `- Strategic opportunities: ${report.directorReadinessScore.strategicOpportunities}`,
  );
  lines.push("");

  if (report.warnings.length) {
    lines.push("## Warnings");
    for (const w of report.warnings) lines.push(`- ${w}`);
    lines.push("");
  }

  lines.push("## 1. Discovery Filter Precision");
  lines.push("");
  lines.push("### Curation gate (preprocess)");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Correctly included | ${report.discoveryFilter.curation.correctlyIncludedPct}% |`);
  lines.push(`| Correctly excluded | ${report.discoveryFilter.curation.correctlyExcludedPct}% |`);
  lines.push(`| False positive rate | ${report.discoveryFilter.curation.falsePositiveRatePct}% |`);
  lines.push(`| False negative rate | ${report.discoveryFilter.curation.falseNegativeRatePct}% |`);
  lines.push(`| Precision | ${report.discoveryFilter.curation.precisionPct}% |`);
  lines.push(`| Recall | ${report.discoveryFilter.curation.recallPct}% |`);
  lines.push("");
  lines.push("### LLM gate (research_relevant)");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Correctly included | ${report.discoveryFilter.llm.correctlyIncludedPct}% |`);
  lines.push(`| Correctly excluded | ${report.discoveryFilter.llm.correctlyExcludedPct}% |`);
  lines.push(`| False positive rate | ${report.discoveryFilter.llm.falsePositiveRatePct}% |`);
  lines.push(`| False negative rate | ${report.discoveryFilter.llm.falseNegativeRatePct}% |`);
  lines.push("");

  lines.push("### Edge case breakdown (LLM correct / total)");
  for (const [cat, stats] of Object.entries(report.discoveryFilter.edgeCaseBreakdown)) {
    lines.push(`- **${cat.replace(/_/g, " ")}:** ${stats.llmCorrect}/${stats.total}`);
  }
  lines.push("");

  lines.push("## 2. Taxonomy Distribution");
  lines.push("");
  for (const [dim, rows] of Object.entries(report.taxonomy)) {
    lines.push(`### ${dim}`);
    for (const r of rows.slice(0, 10)) {
      lines.push(`- ${r.label}: ${r.count} (${r.percent})`);
    }
    lines.push("");
  }

  lines.push("## 3. Fallback Analysis");
  if (report.fallbackHealth.flagged) {
    lines.push(`### ⚠ ${report.fallbackHealth.warning}`);
    for (const item of report.fallbackHealth.exceeded) {
      lines.push(
        `- **${item.metric}:** ${item.actualPct}% (threshold <${item.thresholdPct}%)`,
      );
    }
    lines.push("");
    lines.push("Representative fallback reviews:");
    for (const sample of report.fallbackHealth.sampleReviews.slice(0, 8)) {
      lines.push(`- [${sample.field}] ${sample.label} — ${sample.source}`);
      lines.push(`  > "${sample.text}"`);
    }
    lines.push("");
  }
  lines.push(`- Other Discovery Frustration: **${report.fallback.otherDiscoveryFrustrationPct}%**`);
  lines.push(`- General Discovery Improvement: **${report.fallback.generalDiscoveryImprovementPct}%**`);
  lines.push(`- Unclear Discovery Struggle: **${report.fallback.unclearDiscoveryStrugglePct}%**`);
  lines.push(`- Unclear Repetition Cause: **${report.fallback.unclearRepetitionCausePct}%**`);
  lines.push(`- Any fallback label: **${report.fallback.anyFallbackLabelPct}%**`);
  lines.push("");

  lines.push("## 4. Positive Discovery Validation");
  lines.push(
    `- Detection rate: **${report.positiveDiscoveryValidation.detectionRatePct}%** (target ≥${report.positiveDiscoveryValidation.targetPct}%)`,
  );
  lines.push(
    `- Misclassification rate: **${report.positiveDiscoveryValidation.misclassificationRatePct}%**`,
  );
  lines.push(
    `- Correct: ${report.positiveDiscoveryValidation.correct}/${report.positiveDiscoveryValidation.total}`,
  );
  if (!report.positiveDiscoveryValidation.passesTarget) {
    lines.push("- **WARNING:** Positive discovery target not met.");
    for (const failure of report.positiveDiscoveryValidation.failures.slice(0, 8)) {
      lines.push(`  - ${failure.id}: ${failure.reason}`);
      lines.push(`    > "${failure.text.slice(0, 120)}…"`);
    }
  }
  lines.push("");
  lines.push("### Corpus coverage signals");
  lines.push(`- Positive Discovery Experience theme: ${report.positiveDiscovery.positiveThemeCount} (${report.positiveDiscovery.positiveThemePct}%)`);
  lines.push(`- Discover Weekly praise: ${report.positiveDiscovery.discoverWeeklyPraiseCount}`);
  lines.push(`- DJ praise: ${report.positiveDiscovery.djPraiseCount}`);
  lines.push(`- Successful artist discovery: ${report.positiveDiscovery.successfulArtistDiscoveryCount}`);
  lines.push(`- Recommendation satisfaction: ${report.positiveDiscovery.recommendationSatisfactionCount}`);
  lines.push("");

  lines.push("## 5. Research Question Coverage");
  for (const rq of report.researchQuestions) {
    lines.push(`### ${rq.question}`);
    lines.push(`*${rq.reviewsSupportingQuestion} reviews support this question*`);
    for (const f of rq.topFindings) {
      lines.push(`- **${f.title}** (n=${f.supportingReviewCount}, conf=${f.confidence})`);
      lines.push(`  ${f.summary}`);
      for (const q of f.quotes.slice(0, 2)) {
        lines.push(`  > "${q.text}" — ${q.source}`);
      }
    }
    lines.push("");
  }

  lines.push("## 6. Evidence Quality");
  for (const f of report.evidenceQuality.slice(0, 8)) {
    lines.push(`### ${f.title}`);
    lines.push(`- Supporting reviews: ${f.supportingReviewCount}`);
    lines.push(`- Confidence: ${f.confidence}`);
    lines.push(`- Segments: ${f.segments.join(", ") || "—"}`);
    lines.push(`- Sources: ${f.sources.join(", ") || "—"}`);
    lines.push(`- Classification reasons present: ${f.hasClassificationReasons ? "yes" : "no"}`);
    for (const q of f.representativeQuotes.slice(0, 2)) {
      lines.push(`  > "${q}"`);
    }
    lines.push("");
  }

  lines.push("## 8. Executive Quality Validation");
  lines.push(
    `- Qualified insights: ${report.executiveValidation.qualifiedInsightCount}`,
  );
  lines.push(
    `- 4-component completeness: ${report.executiveValidation.completenessPct}%`,
  );
  lines.push(
    `- Quote alignment — Strong ${report.executiveValidation.quoteAlignment.strongPct}%, Medium ${report.executiveValidation.quoteAlignment.mediumPct}%, Weak ${report.executiveValidation.quoteAlignment.weakPct}% (weak excluded from reports)`,
  );
  lines.push(
    `- Opportunity quality pass rate: ${report.executiveValidation.opportunityPassRate}%`,
  );
  lines.push(
    `- Evidence strength — Strong ${report.executiveValidation.evidenceStrength.strong}, Medium ${report.executiveValidation.evidenceStrength.medium}, Weak ${report.executiveValidation.evidenceStrength.weak}`,
  );
  lines.push("");

  lines.push("## 9. Before vs After");
  lines.push("| Metric | Before | After | Δ | Target | Improved |");
  lines.push("|--------|--------|-------|---|--------|----------|");
  for (const row of report.beforeAfter) {
    lines.push(
      `| ${row.metric} | ${row.before}% | ${row.after}% | ${row.delta > 0 ? "+" : ""}${row.delta} | ${row.target ?? ""} | ${row.improved ? "✓" : "✗"} |`,
    );
  }
  lines.push("");

  lines.push("## Remaining Weaknesses");
  for (const w of report.pmReadinessScore.remainingWeaknesses) {
    lines.push(`- ${w}`);
  }

  return lines.join("\n");
}
