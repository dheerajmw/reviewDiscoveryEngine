import {
  mapUserGoalToBehavior,
  NON_RESEARCH_FALLBACK,
  normalizeClassificationUserGoal,
  normalizeSupportsQuestions,
  type ClassificationUserGoal,
} from "./classify-research";
import { normalizeTaxonomyFields } from "./taxonomy";
import type {
  ClassificationEvidence,
  ClassifiedReview,
  RawReview,
  TaxonomyViolation,
} from "./types";

const DEFAULT_CONFIDENCE = 0.7;

export interface ClassificationItemInput {
  research_relevant?: boolean;
  supports_questions?: string[];
  observation?: string;
  evidence?: string;
  user_goal?: string;
  discovery_relevant?: boolean;
  discovery_reason?: string;
  discovery_confidence?: number;
  theme?: string;
  behavior?: string;
  emotion?: string;
  segment?: string;
  barrier?: string;
  root_cause?: string;
  unmet_need?: string;
  confidence?: number;
}

function normalizeConfidence(value: unknown, fallback = DEFAULT_CONFIDENCE): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function parseLabel(value: string | undefined): string {
  return typeof value === "string" ? value : "";
}

export function mergeClassificationItem(
  review: RawReview,
  item: ClassificationItemInput,
  index: number,
): { review: ClassifiedReview; violations: TaxonomyViolation[] } {
  const research_relevant = Boolean(item.research_relevant);

  if (!research_relevant) {
    const confidence = normalizeConfidence(item.confidence, 0.3);
    const evidence: ClassificationEvidence = {
      discovery:
        typeof item.discovery_reason === "string"
          ? item.discovery_reason
          : "Insufficient PM research value.",
      observation: "",
      research_quote: "",
      supports_questions: [],
      classification_user_goal: "other",
    };

    return {
      review: {
        source: review.source,
        text: review.text,
        review_id: review.review_id,
        original_text: review.original_text,
        cleaned_text: review.cleaned_text,
        primary_category: review.primary_category,
        discovery_outcome: review.discovery_outcome,
        user_goal: review.user_goal,
        discovery_relevant: false,
        discovery_reason:
          typeof item.discovery_reason === "string"
            ? item.discovery_reason
            : "Review lacks meaningful evidence for PM research questions.",
        discovery_confidence:
          typeof item.discovery_confidence === "number"
            ? normalizeConfidence(item.discovery_confidence)
            : undefined,
        research_relevant: false,
        supports_questions: [],
        observation: "",
        research_evidence: "",
        classification_user_goal: "other",
        theme: NON_RESEARCH_FALLBACK.theme,
        behavior: NON_RESEARCH_FALLBACK.behavior,
        emotion: NON_RESEARCH_FALLBACK.emotion,
        segment: NON_RESEARCH_FALLBACK.segment,
        barrier: NON_RESEARCH_FALLBACK.barrier,
        root_cause: NON_RESEARCH_FALLBACK.root_cause,
        unmet_need: NON_RESEARCH_FALLBACK.unmet_need,
        confidence,
        evidence,
      },
      violations: [],
    };
  }

  const supports_questions = normalizeSupportsQuestions(item.supports_questions);
  const observation =
    typeof item.observation === "string" ? item.observation.trim() : "";
  const researchQuote =
    typeof item.evidence === "string" ? item.evidence.trim() : "";
  const classification_user_goal = normalizeClassificationUserGoal(
    item.user_goal,
  );

  const { fields, violations } = normalizeTaxonomyFields(
    {
      theme: parseLabel(item.theme),
      behavior:
        parseLabel(item.behavior) ||
        mapUserGoalToBehavior(classification_user_goal),
      emotion: parseLabel(item.emotion),
      segment: parseLabel(item.segment),
      barrier: parseLabel(item.barrier),
      root_cause: parseLabel(item.root_cause),
      unmet_need: parseLabel(item.unmet_need),
    },
    index,
  );

  const evidence: ClassificationEvidence = {
    discovery:
      typeof item.discovery_reason === "string"
        ? item.discovery_reason
        : observation || undefined,
    theme: researchQuote || undefined,
    observation: observation || undefined,
    research_quote: researchQuote || undefined,
    supports_questions,
    classification_user_goal,
  };

  return {
    review: {
      source: review.source,
      text: review.text,
      review_id: review.review_id,
      original_text: review.original_text,
      cleaned_text: review.cleaned_text,
      primary_category: review.primary_category,
      discovery_outcome: review.discovery_outcome,
      user_goal: review.user_goal,
      discovery_relevant: item.discovery_relevant !== false,
      discovery_reason:
        typeof item.discovery_reason === "string"
          ? item.discovery_reason
          : observation || undefined,
      discovery_confidence:
        typeof item.discovery_confidence === "number"
          ? normalizeConfidence(item.discovery_confidence)
          : undefined,
      research_relevant: true,
      supports_questions,
      observation,
      research_evidence: researchQuote,
      classification_user_goal,
      theme: fields.theme,
      behavior: fields.behavior,
      emotion: fields.emotion,
      segment: fields.segment,
      barrier: fields.barrier,
      root_cause: fields.root_cause,
      unmet_need: fields.unmet_need,
      confidence: normalizeConfidence(item.confidence, DEFAULT_CONFIDENCE),
      evidence,
    },
    violations,
  };
}

export function mergeClassifications(
  items: ClassificationItemInput[],
  reviews: RawReview[],
): { classified: ClassifiedReview[]; violations: TaxonomyViolation[] } {
  if (items.length !== reviews.length) {
    throw new Error(
      `Expected ${reviews.length} classifications, got ${items.length}.`,
    );
  }

  const violations: TaxonomyViolation[] = [];
  const classified = reviews.map((review, index) => {
    const { review: merged, violations: fieldViolations } = mergeClassificationItem(
      review,
      items[index] ?? {},
      index,
    );
    violations.push(...fieldViolations);
    return merged;
  });

  return { classified, violations };
}
