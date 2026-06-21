import type {
  ClassifiedReview,
  ClassificationAuditRecord,
  ClassificationEvidence,
  TaxonomyDimension,
} from "./types";

const TAXONOMY_DIMENSIONS: TaxonomyDimension[] = [
  "theme",
  "behavior",
  "emotion",
  "segment",
  "barrier",
  "root_cause",
  "unmet_need",
];

export function buildClassificationAuditRecord(
  review: ClassifiedReview,
): ClassificationAuditRecord {
  const evidence: ClassificationEvidence = {
    ...(review.evidence ?? {}),
  };

  if (review.discovery_reason && !evidence.discovery) {
    evidence.discovery = review.discovery_reason;
  }

  for (const field of TAXONOMY_DIMENSIONS) {
    if (!evidence[field]) {
      evidence[field] = "";
    }
  }

  return {
    review_text: review.text,
    discovery_relevant: review.discovery_relevant,
    discovery_reason: review.discovery_reason,
    discovery_confidence: review.discovery_confidence,
    theme: review.theme,
    barrier: review.barrier,
    behavior: review.behavior,
    emotion: review.emotion,
    segment: review.segment,
    root_cause: review.root_cause,
    unmet_need: review.unmet_need,
    evidence,
    confidence: review.confidence,
  };
}

export function buildClassificationAuditRecords(
  reviews: ClassifiedReview[],
): ClassificationAuditRecord[] {
  return reviews.map(buildClassificationAuditRecord);
}

export interface ConfidenceHistogram {
  high: number;
  medium: number;
  low: number;
  total: number;
  buckets: { range: string; count: number; pct: number }[];
}

export function buildConfidenceHistogram(
  reviews: ClassifiedReview[],
): ConfidenceHistogram {
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const review of reviews) {
    const c = review.confidence;
    if (c >= 0.85) high++;
    else if (c >= 0.6) medium++;
    else low++;
  }

  const total = reviews.length || 1;
  return {
    high,
    medium,
    low,
    total: reviews.length,
    buckets: [
      { range: "0.85-0.95 (high)", count: high, pct: Math.round((high / total) * 1000) / 10 },
      { range: "0.60-0.84 (medium)", count: medium, pct: Math.round((medium / total) * 1000) / 10 },
      { range: "<0.60 (low)", count: low, pct: Math.round((low / total) * 1000) / 10 },
    ],
  };
}

export function buildFieldConfidenceHistogram(
  reviews: ClassifiedReview[],
): Record<TaxonomyDimension, ConfidenceHistogram> {
  const result = {} as Record<TaxonomyDimension, ConfidenceHistogram>;

  for (const field of TAXONOMY_DIMENSIONS) {
    const values = reviews.map((r) => r.confidence).filter((v) => typeof v === "number");

    let high = 0;
    let medium = 0;
    let low = 0;
    for (const c of values) {
      if (c >= 0.85) high++;
      else if (c >= 0.6) medium++;
      else low++;
    }

    const total = values.length || 1;
    result[field] = {
      high,
      medium,
      low,
      total: values.length,
      buckets: [
        { range: "0.85-0.95 (high)", count: high, pct: Math.round((high / total) * 1000) / 10 },
        { range: "0.60-0.84 (medium)", count: medium, pct: Math.round((medium / total) * 1000) / 10 },
        { range: "<0.60 (low)", count: low, pct: Math.round((low / total) * 1000) / 10 },
      ],
    };
  }

  return result;
}
