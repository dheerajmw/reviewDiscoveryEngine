export type {
  DiscoveryOutcome,
  PreprocessedReview,
  PreprocessedReviewForClassification,
  PreprocessingStats,
  PrimaryCategory,
  UserGoal,
} from "./types";

export { normalizeReviewText, dedupeKey } from "./normalize";
export {
  countDiscoverySignals,
  countPatternHits,
  EXPLICIT_DISCOVERY_PATTERNS,
  IMPLICIT_DISCOVERY_PATTERNS,
} from "./signals";
export {
  detectPrimaryCategory,
  assessDiscoveryRelevance,
  inferDiscoveryOutcome,
  extractUserGoal,
  preprocessReview,
  toClassificationPayload,
} from "./preprocess-review";

import type { RawReview } from "../types";
import { dedupeKey, normalizeReviewText } from "./normalize";
import { preprocessReview, toClassificationPayload } from "./preprocess-review";
import type { PreprocessedReview, PreprocessingStats, PrimaryCategory } from "./types";

const DEDUPE_MIN_LENGTH = 15;

export function dedupeReviewsForPreprocessing(
  reviews: RawReview[],
): { unique: RawReview[]; duplicates_removed: number } {
  const seen = new Set<string>();
  const unique: RawReview[] = [];
  let duplicates_removed = 0;

  for (const review of reviews) {
    const { cleaned_text } = normalizeReviewText(review.text ?? "");
    const key = dedupeKey(cleaned_text);

    if (cleaned_text.length < DEDUPE_MIN_LENGTH) {
      continue;
    }

    if (seen.has(key)) {
      duplicates_removed += 1;
      continue;
    }

    seen.add(key);
    unique.push({ source: review.source, text: review.text });
  }

  return { unique, duplicates_removed };
}

export function preprocessReviewCorpus(
  reviews: RawReview[],
): {
  records: PreprocessedReview[];
  stats: PreprocessingStats;
} {
  const records = reviews.map((review, index) =>
    preprocessReview(
      review.source,
      review.text,
      `review-${index + 1}`,
    ),
  );

  const stats: PreprocessingStats = {
    by_primary_category: {
      technical: 0,
      billing: 0,
      ads: 0,
      praise: 0,
      discovery: 0,
      mixed: 0,
    },
    by_discovery_outcome: {
      successful: 0,
      failed: 0,
      neutral: 0,
      unknown: 0,
    },
    with_user_goal: 0,
  };

  for (const record of records) {
    stats.by_primary_category[record.primary_category as PrimaryCategory] += 1;
    stats.by_discovery_outcome[record.discovery_outcome] += 1;
    if (record.user_goal) {
      stats.with_user_goal += 1;
    }
  }

  return { records, stats };
}
