import {
  buildClassifyUserPrompt,
  CLASSIFY_SYSTEM_PROMPT,
} from "./classify-prompt";
import { formatLlmError, isRetryableRateLimit } from "./llm-errors";
import {
  createOpenRouterClient,
  generateJsonCompletion,
} from "./openrouter-client";
import type { ClassifiedReview, RawReview } from "./types";

const DEFAULT_CONFIDENCE = 0.7;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface ClassificationItem {
  theme?: string;
  behavior?: string;
  emotion?: string;
  segment?: string;
  barrier?: string;
  root_cause?: string;
  unmet_need?: string;
  confidence?: number;
}

interface ClassificationResponse {
  classifications?: ClassificationItem[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableRateLimit(error) || attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

function extractJson(content: string): ClassificationResponse {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as ClassificationResponse;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_CONFIDENCE;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeItem(
  item: ClassificationItem,
  review: RawReview,
): ClassifiedReview {
  return {
    source: review.source,
    text: review.text,
    theme: item.theme?.trim() || "Other",
    behavior: item.behavior?.trim() || "Unknown",
    emotion: item.emotion?.trim() || "Unknown",
    segment: item.segment?.trim() || "Casual",
    barrier: item.barrier?.trim() || "Other",
    root_cause: item.root_cause?.trim() || "Unknown",
    unmet_need: item.unmet_need?.trim() || "Unknown",
    confidence: normalizeConfidence(item.confidence),
  };
}

function mergeClassifications(
  items: ClassificationItem[],
  reviews: RawReview[],
): ClassifiedReview[] {
  if (items.length !== reviews.length) {
    throw new Error(
      `Expected ${reviews.length} classifications, got ${items.length}.`,
    );
  }

  return reviews.map((review, index) =>
    normalizeItem(items[index] ?? {}, review),
  );
}

async function requestClassifications(
  apiKey: string,
  reviews: RawReview[],
): Promise<ClassifiedReview[]> {
  const client = createOpenRouterClient(apiKey);
  const content = await generateJsonCompletion(
    client,
    CLASSIFY_SYSTEM_PROMPT,
    buildClassifyUserPrompt(reviews),
    0.2,
  );

  const parsed = extractJson(content);
  if (!parsed.classifications?.length) {
    throw new Error("Model response missing classifications array.");
  }

  return mergeClassifications(parsed.classifications, reviews);
}

export async function classifyReviews(
  reviews: RawReview[],
  apiKey: string,
): Promise<ClassifiedReview[]> {
  try {
    try {
      return await withRetry(() => requestClassifications(apiKey, reviews));
    } catch (firstError) {
      if (
        firstError instanceof SyntaxError ||
        (firstError instanceof Error &&
          firstError.message.includes("classifications"))
      ) {
        return await withRetry(() => requestClassifications(apiKey, reviews));
      }
      throw firstError;
    }
  } catch (error) {
    throw new Error(formatLlmError(error));
  }
}
