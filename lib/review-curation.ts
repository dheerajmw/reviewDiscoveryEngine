import {
  dedupeReviewsForPreprocessing,
  preprocessReview,
  toClassificationPayload,
} from "./review-preprocessing";
import type { PreprocessedReview } from "./review-preprocessing/types";
import type { CurationStats, RawReview } from "./types";

export type CurationExclusionReason =
  | "duplicate"
  | "too_short"
  | "technical_issue"
  | "billing_or_pricing"
  | "advertising"
  | "praise_only"
  | "off_topic"
  | "playlist_promotion"
  | "social_spam"
  | "not_discovery_related";

export interface CurationRecord extends PreprocessedReview {
  /** Backwards-compatible alias for discovery_reason. */
  reason: string;
  /** Whether this review is sent to LLM classification. */
  included: boolean;
  stage: "preprocess";
  exclusion_reason?: CurationExclusionReason;
  /** Alias for classify endpoints. */
  text: string;
}

export interface CurationResult {
  /** Discovery-relevant reviews prepared for classification. */
  included: Array<PreprocessedReview & { text: string }>;
  /** Non-discovery reviews retained for auditing. */
  excluded: CurationRecord[];
  /** All unique preprocessed reviews (discovery + non-discovery). */
  records: CurationRecord[];
  stats: CurationStats;
  preprocessing?: {
    by_primary_category: Record<string, number>;
    by_discovery_outcome: Record<string, number>;
    with_user_goal: number;
  };
}

function mapExclusionReason(
  record: PreprocessedReview,
): CurationExclusionReason {
  if (record.discovery_reason.includes("playlist promotion")) {
    return "playlist_promotion";
  }
  if (record.discovery_reason.includes("social spam")) {
    return "social_spam";
  }
  if (record.discovery_reason.includes("too short")) {
    return "too_short";
  }

  switch (record.primary_category) {
    case "technical":
      return "technical_issue";
    case "billing":
      return "billing_or_pricing";
    case "ads":
      return "advertising";
    case "praise":
      return "praise_only";
    default:
      return "not_discovery_related";
  }
}

function toCurationRecord(record: PreprocessedReview): CurationRecord {
  const included = record.discovery_relevant;
  const payload = toClassificationPayload(record);

  return {
    ...record,
    ...payload,
    reason: record.discovery_reason,
    included,
    stage: "preprocess",
    exclusion_reason: included ? undefined : mapExclusionReason(record),
  };
}

function buildStats(
  totalLoaded: number,
  duplicatesRemoved: number,
  records: CurationRecord[],
): CurationStats {
  const excluded = records.filter((record) => !record.included);
  const by_reason: Record<string, number> = {};

  for (const record of excluded) {
    const key = record.exclusion_reason ?? "not_discovery_related";
    by_reason[key] = (by_reason[key] ?? 0) + 1;
  }

  return {
    total_loaded: totalLoaded,
    duplicates_removed: duplicatesRemoved,
    included: records.filter((record) => record.included).length,
    excluded: excluded.length,
    borderline_reviewed: 0,
    by_reason,
  };
}

function buildPreprocessingSummary(records: CurationRecord[]) {
  const by_primary_category: Record<string, number> = {};
  const by_discovery_outcome: Record<string, number> = {};
  let with_user_goal = 0;

  for (const record of records) {
    by_primary_category[record.primary_category] =
      (by_primary_category[record.primary_category] ?? 0) + 1;
    by_discovery_outcome[record.discovery_outcome] =
      (by_discovery_outcome[record.discovery_outcome] ?? 0) + 1;
    if (record.user_goal) {
      with_user_goal += 1;
    }
  }

  return { by_primary_category, by_discovery_outcome, with_user_goal };
}

/**
 * PM-research-oriented cleaning pipeline (Phases 1–6) before classification.
 * Keeps all unique reviews in `records`; only discovery_relevant rows go to `included`.
 */
export async function curateReviews(
  reviews: RawReview[],
  onProgress?: (completed: number, total: number) => void,
): Promise<CurationResult> {
  const totalLoaded = reviews.length;
  const { unique, duplicates_removed } = dedupeReviewsForPreprocessing(reviews);

  const records = unique.map((review, index) =>
    toCurationRecord(
      preprocessReview(review.source, review.text, `review-${index + 1}`),
    ),
  );

  onProgress?.(records.length, records.length);

  const included = records
    .filter((record) => record.included)
    .map(({ review_id, source, original_text, cleaned_text, primary_category, discovery_relevant, discovery_outcome, user_goal, discovery_reason, confidence, explicit_signal_count, implicit_signal_count, text }) => ({
      review_id,
      source,
      original_text,
      cleaned_text,
      primary_category,
      discovery_relevant,
      discovery_outcome,
      user_goal,
      discovery_reason,
      confidence,
      explicit_signal_count,
      implicit_signal_count,
      text,
    }));

  const excluded = records.filter((record) => !record.included);

  return {
    included,
    excluded,
    records,
    stats: buildStats(totalLoaded, duplicates_removed, records),
    preprocessing: buildPreprocessingSummary(records),
  };
}

export function formatCurationReason(reason: string): string {
  return reason.replace(/_/g, " ");
}

/** @deprecated Use dedupeReviewsForPreprocessing from review-preprocessing. */
export function dedupeRawReviews(
  reviews: RawReview[],
  minLen = 15,
): { unique: RawReview[]; duplicates_removed: number } {
  void minLen;
  return dedupeReviewsForPreprocessing(reviews);
}

export type { PreprocessedReview };
