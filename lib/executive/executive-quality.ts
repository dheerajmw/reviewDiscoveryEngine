import { OTHER_UNKNOWN_LABELS } from "../taxonomy";
import type { ProductInsight, QuoteEvidence } from "../types";
import { checkExecutiveComponents } from "../quality/executive-component-validation";
import { filterAlignedQuotes } from "../quality/quote-alignment";

export const MIN_SUPPORTING_REVIEWS = 5;
export const MIN_CONFIDENCE = 0.45;
export const MIN_SOURCES = 2;

export interface QualityCheckResult {
  passes: boolean;
  reasons: string[];
}

export function isFallbackLabel(label: string): boolean {
  return OTHER_UNKNOWN_LABELS.has(label);
}

export function isFallbackDriven(insight: {
  themes: string[];
  barriers: string[];
  root_causes: string[];
  unmet_needs: string[];
}): boolean {
  const dims = [
    ...insight.themes,
    ...insight.barriers,
    ...insight.root_causes,
    ...insight.unmet_needs,
  ];
  if (dims.length === 0) return true;
  return dims.every((d) => isFallbackLabel(d));
}

/** Primary labels are fallback buckets — down-rank for opportunities. */
export function hasFallbackContamination(insight: {
  themes: string[];
  barriers: string[];
  root_causes: string[];
  unmet_needs: string[];
}): boolean {
  const primary = [
    insight.themes[0],
    insight.barriers[0],
    insight.root_causes[0],
    insight.unmet_needs[0],
  ].filter(Boolean);
  if (primary.length === 0) return true;
  return primary.some((label) => label && isFallbackLabel(label));
}

export function hasMechanismClarity(insight: {
  mechanism?: string;
  root_causes: string[];
}): boolean {
  if (insight.mechanism && insight.root_causes.some((r) => !isFallbackLabel(r))) {
    return true;
  }
  return insight.root_causes.some((r) => !isFallbackLabel(r));
}

export function countSources(sources: string[]): number {
  return new Set(sources.filter(Boolean)).size;
}

export function checkInsightQuality(insight: ProductInsight): QualityCheckResult {
  const reasons: string[] = [];

  if (insight.supporting_reviews < MIN_SUPPORTING_REVIEWS) {
    reasons.push(
      `Fewer than ${MIN_SUPPORTING_REVIEWS} supporting reviews (${insight.supporting_reviews})`,
    );
  }
  if (insight.confidence < MIN_CONFIDENCE) {
    reasons.push(
      `Confidence below threshold (${insight.confidence} < ${MIN_CONFIDENCE})`,
    );
  }
  if (countSources(insight.supporting_sources) < MIN_SOURCES) {
    reasons.push(
      `Supported by only one source (${insight.supporting_sources.join(", ") || "none"})`,
    );
  }
  if (hasFallbackContamination(insight)) {
    reasons.push("Primary taxonomy labels include fallback buckets");
  }
  if (!hasMechanismClarity(insight)) {
    reasons.push("No identifiable product mechanism");
  }
  if (insight.supporting_segments.length === 0) {
    reasons.push("No segment support");
  }

  const componentCheck = checkExecutiveComponents(insight);
  if (!componentCheck.passes) {
    reasons.push(...componentCheck.reasons);
  }

  const alignedQuotes = filterAlignedQuotes(insight.representative_quotes, insight);
  if (alignedQuotes.length === 0) {
    reasons.push("No quote with Strong or Medium alignment to the finding");
  }

  return { passes: reasons.length === 0, reasons };
}

export function filterQualifiedInsights(
  candidates: ProductInsight[],
): { accepted: ProductInsight[]; rejected: { insight: ProductInsight; reasons: string[] }[] } {
  const accepted: ProductInsight[] = [];
  const rejected: { insight: ProductInsight; reasons: string[] }[] = [];

  for (const insight of candidates) {
    const check = checkInsightQuality(insight);
    if (check.passes) {
      accepted.push({
        ...insight,
        representative_quotes: filterAlignedQuotes(insight.representative_quotes, insight),
      });
    } else {
      rejected.push({ insight, reasons: check.reasons });
    }
  }

  return { accepted, rejected };
}

/** @internal Display only — prefer evidence_strength in UI */
export function confidenceToLevel(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= 0.7) return "High";
  if (confidence >= 0.55) return "Medium";
  return "Low";
}

export function topQuotes(
  quotes: QuoteEvidence[],
  insight?: ProductInsight,
  limit = 3,
): QuoteEvidence[] {
  const pool = insight
    ? filterAlignedQuotes(quotes, insight, limit)
    : [...quotes].sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  return pool;
}
