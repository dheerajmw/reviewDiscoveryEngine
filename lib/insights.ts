import {
  buildInsightsUserPrompt,
  INSIGHTS_SYSTEM_PROMPT,
} from "./insights-prompt";
import { formatLlmError, isRetryableRateLimit } from "./llm-errors";
import {
  createOpenRouterClient,
  generateJsonCompletion,
} from "./openrouter-client";
import type {
  AggregationResult,
  ClassifiedReview,
  InsightResult,
} from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface RawInsightResponse {
  summary?: string;
  rootCauses?: string[];
  discoveryProblems?: string[];
  opportunities?: { title?: string; description?: string }[];
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

function extractJson(content: string): RawInsightResponse {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as RawInsightResponse;
}

function normalizeInsights(raw: RawInsightResponse): InsightResult {
  const opportunities = (raw.opportunities ?? [])
    .map((item) => ({
      title: item.title?.trim() ?? "",
      description: item.description?.trim() ?? "",
    }))
    .filter((item) => item.title && item.description);

  if (
    !raw.summary?.trim() ||
    !(raw.rootCauses?.length ?? 0) ||
    !(raw.discoveryProblems?.length ?? 0) ||
    opportunities.length < 3
  ) {
    throw new Error("Model response missing required insight fields.");
  }

  return {
    summary: raw.summary.trim(),
    rootCauses: (raw.rootCauses ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
    discoveryProblems: (raw.discoveryProblems ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
    opportunities,
  };
}

async function requestInsights(
  apiKey: string,
  aggregation: AggregationResult,
  samples: ClassifiedReview[],
): Promise<InsightResult> {
  const client = createOpenRouterClient(apiKey);
  const content = await generateJsonCompletion(
    client,
    INSIGHTS_SYSTEM_PROMPT,
    buildInsightsUserPrompt(aggregation, samples),
    0.4,
  );

  return normalizeInsights(extractJson(content));
}

export async function generateInsights(
  aggregation: AggregationResult,
  samples: ClassifiedReview[],
  apiKey: string,
): Promise<InsightResult> {
  try {
    try {
      return await withRetry(() =>
        requestInsights(apiKey, aggregation, samples),
      );
    } catch (firstError) {
      if (firstError instanceof SyntaxError) {
        return await withRetry(() =>
          requestInsights(apiKey, aggregation, samples),
        );
      }
      throw firstError;
    }
  } catch (error) {
    throw new Error(formatLlmError(error));
  }
}
