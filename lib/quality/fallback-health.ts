import { BARRIER_FALLBACK, FALLBACK_LABELS } from "../taxonomy";
import type { ClassifiedReview } from "../types";

export const FALLBACK_THRESHOLDS = {
  otherDiscoveryFrustrationPct: 25,
  generalDiscoveryImprovementPct: 15,
  unclearDiscoveryStrugglePct: 25,
  unclearRepetitionCausePct: 20,
} as const;

export interface FallbackSampleReview {
  field: "theme" | "barrier" | "root_cause" | "unmet_need";
  label: string;
  text: string;
  source: string;
}

export interface FallbackHealthReport {
  flagged: boolean;
  warning: "TAXONOMY QUALITY WARNING" | null;
  sampleSize: number;
  metrics: {
    otherDiscoveryFrustrationPct: number;
    generalDiscoveryImprovementPct: number;
    unclearDiscoveryStrugglePct: number;
    unclearRepetitionCausePct: number;
  };
  exceeded: {
    metric: string;
    actualPct: number;
    thresholdPct: number;
  }[];
  sampleReviews: FallbackSampleReview[];
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function pickSamples(
  reviews: ClassifiedReview[],
  field: FallbackSampleReview["field"],
  label: string,
  limit = 3,
): FallbackSampleReview[] {
  return reviews
    .filter((r) => r[field] === label)
    .slice(0, limit)
    .map((r) => ({
      field,
      label,
      text: r.text.slice(0, 220),
      source: r.source,
    }));
}

export function buildFallbackHealthReport(
  classified: ClassifiedReview[],
  sampleSize = 100,
): FallbackHealthReport {
  const research = classified.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
  const sample = research.slice(0, sampleSize);
  const n = sample.length;

  const metrics = {
    otherDiscoveryFrustrationPct: pct(
      sample.filter((r) => r.theme === FALLBACK_LABELS.theme).length,
      n,
    ),
    generalDiscoveryImprovementPct: pct(
      sample.filter((r) => r.unmet_need === FALLBACK_LABELS.unmet_need).length,
      n,
    ),
    unclearDiscoveryStrugglePct: pct(
      sample.filter((r) => r.barrier === FALLBACK_LABELS.barrier).length,
      n,
    ),
    unclearRepetitionCausePct: pct(
      sample.filter((r) => r.root_cause === FALLBACK_LABELS.root_cause).length,
      n,
    ),
  };

  const exceeded: FallbackHealthReport["exceeded"] = [];

  if (metrics.otherDiscoveryFrustrationPct > FALLBACK_THRESHOLDS.otherDiscoveryFrustrationPct) {
    exceeded.push({
      metric: "Other Discovery Frustration",
      actualPct: metrics.otherDiscoveryFrustrationPct,
      thresholdPct: FALLBACK_THRESHOLDS.otherDiscoveryFrustrationPct,
    });
  }
  if (
    metrics.generalDiscoveryImprovementPct >
    FALLBACK_THRESHOLDS.generalDiscoveryImprovementPct
  ) {
    exceeded.push({
      metric: "General Discovery Improvement",
      actualPct: metrics.generalDiscoveryImprovementPct,
      thresholdPct: FALLBACK_THRESHOLDS.generalDiscoveryImprovementPct,
    });
  }
  if (metrics.unclearDiscoveryStrugglePct > FALLBACK_THRESHOLDS.unclearDiscoveryStrugglePct) {
    exceeded.push({
      metric: BARRIER_FALLBACK,
      actualPct: metrics.unclearDiscoveryStrugglePct,
      thresholdPct: FALLBACK_THRESHOLDS.unclearDiscoveryStrugglePct,
    });
  }
  if (metrics.unclearRepetitionCausePct > FALLBACK_THRESHOLDS.unclearRepetitionCausePct) {
    exceeded.push({
      metric: "Unclear Repetition Cause",
      actualPct: metrics.unclearRepetitionCausePct,
      thresholdPct: FALLBACK_THRESHOLDS.unclearRepetitionCausePct,
    });
  }

  const sampleReviews: FallbackSampleReview[] = [];
  if (exceeded.some((e) => e.metric === "Other Discovery Frustration")) {
    sampleReviews.push(
      ...pickSamples(sample, "theme", FALLBACK_LABELS.theme),
    );
  }
  if (exceeded.some((e) => e.metric === "General Discovery Improvement")) {
    sampleReviews.push(
      ...pickSamples(sample, "unmet_need", FALLBACK_LABELS.unmet_need),
    );
  }
  if (exceeded.some((e) => e.metric === BARRIER_FALLBACK)) {
    sampleReviews.push(
      ...pickSamples(sample, "barrier", FALLBACK_LABELS.barrier),
    );
  }
  if (exceeded.some((e) => e.metric === "Unclear Repetition Cause")) {
    sampleReviews.push(
      ...pickSamples(sample, "root_cause", FALLBACK_LABELS.root_cause),
    );
  }

  const flagged = exceeded.length > 0;

  return {
    flagged,
    warning: flagged ? "TAXONOMY QUALITY WARNING" : null,
    sampleSize: n,
    metrics,
    exceeded,
    sampleReviews,
  };
}

export function reviewUsesFallbackLabel(review: ClassifiedReview): boolean {
  return [review.theme, review.barrier, review.root_cause, review.unmet_need, review.segment].some(
    (label) => OTHER_UNKNOWN_LABELS.has(label),
  );
}
