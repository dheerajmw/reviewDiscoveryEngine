import {
  buildClassifyUserPrompt,
  CLASSIFY_SYSTEM_PROMPT,
} from "./classify-prompt";
import { mergeClassifications } from "./classify-normalize";
import { formatLlmError, isRetryableRateLimit } from "./llm-errors";
import {
  createGeminiClient,
  generateJsonCompletion,
} from "./gemini-client";
import { buildTaxonomyReport } from "./taxonomy";
import type { ClassifiedReview, RawReview, TaxonomyReport } from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface ClassificationResponse {
  classifications?: Record<string, unknown>[];
}

export interface ClassifyResult {
  classified: ClassifiedReview[];
  taxonomyReport: TaxonomyReport;
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

async function requestClassifications(
  apiKey: string,
  reviews: RawReview[],
): Promise<ClassifyResult> {
  const client = createGeminiClient(apiKey);
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

  const { classified, violations } = mergeClassifications(
    parsed.classifications,
    reviews,
  );

  return {
    classified,
    taxonomyReport: buildTaxonomyReport(classified, violations),
  };
}

export async function classifyReviews(
  reviews: RawReview[],
  apiKey: string,
): Promise<ClassifyResult> {
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

export { CLASSIFY_SYSTEM_PROMPT, buildClassifyUserPrompt };
