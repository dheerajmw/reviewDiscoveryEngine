import { normalizeReviewText } from "./normalize";
import {
  ADS_PATTERNS,
  BILLING_PATTERNS,
  countDiscoverySignals,
  countPatternHits,
  DISCOVERY_FAILURE_PATTERNS,
  DISCOVERY_SUCCESS_PATTERNS,
  IMPLICIT_DISCOVERY_PATTERNS,
  EXPLICIT_DISCOVERY_PATTERNS,
  PRAISE_PATTERNS,
  TECHNICAL_PATTERNS,
  USER_GOAL_RULES,
} from "./signals";
import type {
  DiscoveryOutcome,
  PreprocessedReview,
  PrimaryCategory,
  UserGoal,
} from "./types";

const MIN_RESEARCH_TEXT_LENGTH = 20;

interface CategoryScores {
  technical: number;
  billing: number;
  ads: number;
  praise: number;
  discovery: number;
}

function scoreNoiseCategories(cleaned: string, discoveryHits: number): CategoryScores {
  return {
    technical: countPatternHits(cleaned, TECHNICAL_PATTERNS),
    billing: countPatternHits(cleaned, BILLING_PATTERNS),
    ads: countPatternHits(cleaned, ADS_PATTERNS),
    praise: countPatternHits(cleaned, PRAISE_PATTERNS),
    discovery: discoveryHits,
  };
}

/** Phase 2 — assign primary_category without discarding the review. */
export function detectPrimaryCategory(
  cleaned: string,
  discoveryHits: number,
): PrimaryCategory {
  const scores = scoreNoiseCategories(cleaned, discoveryHits);
  const noiseTotal =
    scores.technical + scores.billing + scores.ads + scores.praise;

  if (discoveryHits >= 1 && noiseTotal >= 1) {
    return "mixed";
  }

  if (discoveryHits >= 1) {
    return "discovery";
  }

  const noiseEntries: { key: PrimaryCategory; score: number }[] = [
    { key: "technical", score: scores.technical },
    { key: "billing", score: scores.billing },
    { key: "ads", score: scores.ads },
    { key: "praise", score: scores.praise },
  ];

  noiseEntries.sort((a, b) => b.score - a.score);
  const top = noiseEntries[0];

  if (top.score >= 1) {
    return top.key;
  }

  if (scores.praise >= 1) {
    return "praise";
  }

  return "mixed";
}

/** Phase 3 — explicit + implicit discovery relevance for PM research. */
export function assessDiscoveryRelevance(
  cleaned: string,
  primaryCategory: PrimaryCategory,
): {
  discovery_relevant: boolean;
  discovery_reason: string;
  confidence: number;
  explicit_signal_count: number;
  implicit_signal_count: number;
} {
  const { explicit, implicit, total } = countDiscoverySignals(cleaned);

  if (total === 0) {
    return {
      discovery_relevant: false,
      discovery_reason:
        primaryCategory === "discovery"
          ? "Marked discovery category but no detectable signals after normalization."
          : `No discovery signals; primary focus appears to be ${primaryCategory}.`,
      confidence: 0.85,
      explicit_signal_count: explicit,
      implicit_signal_count: implicit,
    };
  }

  const signalNote =
    explicit >= 1 && implicit >= 1
      ? "explicit and implicit discovery signals"
      : explicit >= 1
        ? "explicit recommendation or discovery language"
        : "implicit repetition, sameness, or exploration signals";

  const mixedNote =
    primaryCategory === "mixed"
      ? " Mixed with ads, billing, technical, or praise topics."
      : "";

  return {
    discovery_relevant: true,
    discovery_reason: `Review contains ${signalNote}.${mixedNote}`,
    confidence: Math.min(
      0.95,
      0.68 + explicit * 0.06 + implicit * 0.05 + (primaryCategory === "discovery" ? 0.08 : 0),
    ),
    explicit_signal_count: explicit,
    implicit_signal_count: implicit,
  };
}

/** Phase 4 — discovery success / failure / neutral. */
export function inferDiscoveryOutcome(
  cleaned: string,
  discoveryRelevant: boolean,
): DiscoveryOutcome {
  if (!discoveryRelevant) {
    return "unknown";
  }

  const successHits = countPatternHits(cleaned, DISCOVERY_SUCCESS_PATTERNS);
  const failureHits = countPatternHits(cleaned, DISCOVERY_FAILURE_PATTERNS);
  const { implicit } = countDiscoverySignals(cleaned);

  if (successHits >= 1 && failureHits === 0) {
    return "successful";
  }

  if (failureHits >= 1 && successHits === 0) {
    return "failed";
  }

  if (successHits >= 1 && failureHits >= 1) {
    return "neutral";
  }

  if (implicit >= 1 && failureHits === 0) {
    return "neutral";
  }

  if (implicit >= 1) {
    return "failed";
  }

  if (countPatternHits(cleaned, EXPLICIT_DISCOVERY_PATTERNS) >= 1) {
    return "neutral";
  }

  return "unknown";
}

/** Phase 5 — infer listening goal for behavior research (Q3). */
export function extractUserGoal(
  cleaned: string,
  discoveryRelevant: boolean,
): UserGoal {
  if (!discoveryRelevant) {
    return null;
  }

  for (const rule of USER_GOAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(cleaned))) {
      return rule.goal;
    }
  }

  if (countPatternHits(cleaned, IMPLICIT_DISCOVERY_PATTERNS) >= 1) {
    return "get personalized recommendations";
  }

  if (/\bplaylist(s)?\b/.test(cleaned)) {
    return "refresh playlists";
  }

  if (/\b(new music|new songs?)\b/.test(cleaned)) {
    return "find new artists";
  }

  return null;
}

export function preprocessReview(
  source: string,
  originalText: string,
  reviewId: string,
): PreprocessedReview {
  const { original_text, cleaned_text } = normalizeReviewText(originalText);

  if (cleaned_text.length < MIN_RESEARCH_TEXT_LENGTH) {
    return {
      review_id: reviewId,
      source,
      original_text,
      cleaned_text,
      primary_category: "mixed",
      discovery_relevant: false,
      discovery_outcome: "unknown",
      user_goal: null,
      discovery_reason: "Review is too short to support PM discovery research.",
      confidence: 0.9,
      explicit_signal_count: 0,
      implicit_signal_count: 0,
    };
  }

  const { total: discoveryHits } = countDiscoverySignals(cleaned_text);
  const primary_category = detectPrimaryCategory(cleaned_text, discoveryHits);
  const relevance = assessDiscoveryRelevance(cleaned_text, primary_category);
  const discovery_outcome = inferDiscoveryOutcome(
    cleaned_text,
    relevance.discovery_relevant,
  );
  const user_goal = extractUserGoal(
    cleaned_text,
    relevance.discovery_relevant,
  );

  return {
    review_id: reviewId,
    source,
    original_text,
    cleaned_text,
    primary_category,
    discovery_relevant: relevance.discovery_relevant,
    discovery_outcome,
    user_goal,
    discovery_reason: relevance.discovery_reason,
    confidence: relevance.confidence,
    explicit_signal_count: relevance.explicit_signal_count,
    implicit_signal_count: relevance.implicit_signal_count,
  };
}

export function toClassificationPayload(
  review: PreprocessedReview,
): PreprocessedReview & { text: string } {
  return {
    ...review,
    text: review.original_text,
  };
}
