import {
  buildClassifyUserPrompt,
  CLASSIFY_SYSTEM_PROMPT,
} from "./classify-prompt";
import { mergeClassifications } from "./classify-normalize";
import { formatLlmError, isRetryableRateLimit } from "./llm-errors";
import {
  createLlmClient,
  generateJsonCompletion,
  LlmOutputTruncatedError,
} from "./llm-client";
import { estimateMaxOutputTokens, getLlmRequestCooldownMs } from "./llm-limits";
import { buildTaxonomyReport } from "./taxonomy";
import type { ClassifiedReview, RawReview, TaxonomyReport } from "./types";

const MAX_RETRIES = 3;

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
      await sleep(getLlmRequestCooldownMs() * (attempt + 1));
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

function isRecoverableParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    error instanceof LlmOutputTruncatedError ||
    (error instanceof Error &&
      (error.message.includes("JSON") ||
        error.message.includes("truncated") ||
        error.message.includes("Unterminated")))
  );
}

async function splitAndClassify(
  apiKey: string,
  reviews: RawReview[],
): Promise<ClassifyResult> {
  const mid = Math.ceil(reviews.length / 2);
  const left = await requestClassifications(apiKey, reviews.slice(0, mid));
  await sleep(getLlmRequestCooldownMs());
  const right = await requestClassifications(apiKey, reviews.slice(mid));
  const classified = [...left.classified, ...right.classified];
  const violations = [
    ...left.taxonomyReport.violations,
    ...right.taxonomyReport.violations,
  ];
  return {
    classified,
    taxonomyReport: buildTaxonomyReport(classified, violations),
  };
}

async function requestClassifications(
  apiKey: string,
  reviews: RawReview[],
): Promise<ClassifyResult> {
  const client = createLlmClient(apiKey);
  let content: string;

  try {
    content = await generateJsonCompletion(
      client,
      CLASSIFY_SYSTEM_PROMPT,
      buildClassifyUserPrompt(reviews),
      0.2,
      estimateMaxOutputTokens(reviews.length),
    );
  } catch (error) {
    if (reviews.length > 1 && isRecoverableParseError(error)) {
      return splitAndClassify(apiKey, reviews);
    }
    throw error;
  }

  let parsed: ClassificationResponse;
  try {
    parsed = extractJson(content);
  } catch (error) {
    if (reviews.length > 1 && isRecoverableParseError(error)) {
      return splitAndClassify(apiKey, reviews);
    }
    throw error;
  }

  if (!parsed.classifications?.length) {
    if (reviews.length > 1) {
      return splitAndClassify(apiKey, reviews);
    }
    throw new Error("Model response missing classifications array.");
  }

  if (parsed.classifications.length !== reviews.length) {
    if (reviews.length <= 1) {
      throw new Error(
        `Expected ${reviews.length} classifications, got ${parsed.classifications.length}.`,
      );
    }
    return splitAndClassify(apiKey, reviews);
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
    return await withRetry(() => requestClassifications(apiKey, reviews));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Classification JSON was truncated or invalid. Retry Analyze — cached reviews are skipped. Try LLM_CLASSIFY_BATCH_SIZE=5 if this persists.",
      );
    }
    throw new Error(formatLlmError(error));
  }
}

export { CLASSIFY_SYSTEM_PROMPT, buildClassifyUserPrompt };
