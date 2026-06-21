import {
  buildDiscoveryRelevanceUserPrompt,
  DISCOVERY_RELEVANCE_SYSTEM_PROMPT,
} from "./discovery-relevance-prompt";
import { formatLlmError } from "./llm-errors";
import {
  createGroqClient,
  generateJsonCompletion,
} from "./groq-client";
import type { DiscoveryRelevanceAssessment, RawReview } from "./types";

const EXCLUDE_PATTERNS = [
  /\b(billing|charged|refund|subscription|premium price|too expensive)\b/i,
  /\b(login|log in|sign in|password|account locked)\b/i,
  /\b(crash|crashes|crashing|won't open|wont open|freeze|frozen|bug|glitch)\b/i,
  /\b(too many ads|advertisement|annoying ads)\b/i,
  /\b(customer support|contact support)\b/i,
];

const INCLUDE_PATTERNS = [
  /\b(recommend|recommendation|suggest|algorithm|for you)\b/i,
  /\b(discover(y)?|discover weekly|release radar|daily mix)\b/i,
  /\b(find(ing)? (new )?(artist|music|song)s?)\b/i,
  /\b(personaliz|novelty|explor(e|ation)|new music)\b/i,
  /\b(same (artist|song|music|playlist)|repeat(ing|s|ed)?|regurgitat|recycled)\b/i,
  /\b(genre).{0,40}(bubble|locked|stuck|same|one type)\b/i,
  /\b(playlist).{0,30}(discover|recommend|suggest|stale|same)\b/i,
];

function extractJson(content: string): { assessments?: DiscoveryRelevanceAssessment[] } {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as { assessments?: DiscoveryRelevanceAssessment[] };
}

function clampConfidence(value: unknown, fallback = 0.5): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

/** Demo-mode discovery assessment — independent rules, default exclude for ambiguous. */
export function assessDiscoveryRelevanceMock(text: string): DiscoveryRelevanceAssessment {
  const lower = text.toLowerCase();

  const excludeHits = EXCLUDE_PATTERNS.filter((p) => p.test(text)).length;
  const includeHits = INCLUDE_PATTERNS.filter((p) => p.test(text)).length;

  if (excludeHits >= 1 && includeHits === 0) {
    return {
      discovery_relevant: false,
      reason: "Review focuses on non-discovery issues (billing, ads, login, or technical problems).",
      confidence: clampConfidence(0.72 + excludeHits * 0.05, 0.72),
    };
  }

  if (includeHits >= 2) {
    return {
      discovery_relevant: true,
      reason: "Review discusses recommendations, discovery, or music exploration.",
      confidence: clampConfidence(0.78 + includeHits * 0.04, 0.78),
    };
  }

  if (includeHits === 1) {
    return {
      discovery_relevant: true,
      reason: "Review mentions a discovery-related topic.",
      confidence: 0.65,
    };
  }

  if (lower.length < 40) {
    return {
      discovery_relevant: false,
      reason: "Short review lacks clear discovery context; excluded by default.",
      confidence: 0.55,
    };
  }

  return {
    discovery_relevant: false,
    reason: "No clear discovery, recommendation, or exploration topic identified.",
    confidence: 0.62,
  };
}

export async function assessDiscoveryRelevanceBatch(
  reviews: RawReview[],
  apiKey: string,
): Promise<DiscoveryRelevanceAssessment[]> {
  try {
    const client = createGroqClient(apiKey);
    const content = await generateJsonCompletion(
      client,
      DISCOVERY_RELEVANCE_SYSTEM_PROMPT,
      buildDiscoveryRelevanceUserPrompt(reviews),
      0.1,
    );

    const parsed = extractJson(content);
    if (!parsed.assessments?.length) {
      throw new Error("Model response missing assessments array.");
    }
    if (parsed.assessments.length !== reviews.length) {
      throw new Error(
        `Expected ${reviews.length} assessments, got ${parsed.assessments.length}.`,
      );
    }

    return parsed.assessments.map((item) => ({
      discovery_relevant: Boolean(item.discovery_relevant),
      reason:
        typeof item.reason === "string" && item.reason.trim()
          ? item.reason.trim()
          : item.discovery_relevant
            ? "Review discusses discovery or recommendations."
            : "Review does not discuss discovery topics.",
      confidence: clampConfidence(item.confidence, 0.7),
    }));
  } catch (error) {
    throw new Error(formatLlmError(error));
  }
}

export function filterDiscoveryRelevant<T extends { discovery_relevant: boolean }>(
  reviews: T[],
): T[] {
  return reviews.filter((r) => r.discovery_relevant);
}

export function relevanceLabel(relevant: boolean): string {
  return relevant ? "Discovery Related" : "Not Discovery Related";
}

/** @deprecated Use assessDiscoveryRelevanceMock or assessDiscoveryRelevanceBatch */
export function assessDiscoveryRelevance(text: string): boolean {
  return assessDiscoveryRelevanceMock(text).discovery_relevant;
}

/** @deprecated Use assessDiscoveryRelevanceMock or assessDiscoveryRelevanceBatch */
export function preCheckReview(review: RawReview): boolean {
  return assessDiscoveryRelevanceMock(review.text).discovery_relevant;
}
