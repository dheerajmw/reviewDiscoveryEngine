import { getLlmProvider, LLM_MODEL } from "./llm-config";

/** Groq Developer plan — meta-llama/llama-4-scout-17b-16e-instruct (console.groq.com → Limits). */
const GROQ_SCOUT_LIMITS = {
  requestsPerMinute: 30,
  requestsPerDay: 1_000,
  tokensPerMinute: 30_000,
  tokensPerDay: 500_000,
} as const;

/** Cerebras personal org — gpt-oss-120b (cloud.cerebras.ai → Limits). */
const CEREBRAS_LIMITS = {
  requestsPerMinute: 5,
  requestsPerDay: 2_400,
  tokensPerMinute: 30_000,
  tokensPerDay: 1_000_000,
} as const;

function providerDefaults() {
  return getLlmProvider() === "groq" ? GROQ_SCOUT_LIMITS : CEREBRAS_LIMITS;
}

/**
 * Planning limits for classification batches.
 * Override with LLM_DAILY_TOKEN_BUDGET / LLM_REQUESTS_PER_DAY in .env.local.
 */
function dailyTokenBudget(): number {
  const raw =
    process.env.LLM_DAILY_TOKEN_BUDGET ?? process.env.GEMINI_DAILY_TOKEN_BUDGET;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return providerDefaults().tokensPerDay;
}

function dailyRequestBudget(): number {
  const raw =
    process.env.LLM_REQUESTS_PER_DAY ?? process.env.GEMINI_REQUESTS_PER_DAY;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return providerDefaults().requestsPerDay;
}

export const LLM_RATE_LIMITS = {
  get model() {
    return LLM_MODEL;
  },
  get requestsPerMinute() {
    return providerDefaults().requestsPerMinute;
  },
  get requestsPerDay() {
    return dailyRequestBudget();
  },
  get tokensPerMinute() {
    return providerDefaults().tokensPerMinute;
  },
  get tokensPerDay() {
    return dailyTokenBudget();
  },
} as const;

/** Compact classify prompt + taxonomy (amortized per request). */
const SYSTEM_PROMPT_TOKEN_OVERHEAD = 1_800;

/** Input: labels + evidence + discovery fields per review in user prompt. */
const TOKENS_PER_REVIEW_ESTIMATE = 400;

/** Output: full classification JSON per review (incl. 7 classification_reasons). */
const TOKENS_PER_REVIEW_OUTPUT_ESTIMATE = 1_050;

/** JSON wrapper overhead in classify responses. */
const OUTPUT_BATCH_OVERHEAD = 1_000;

/** Max reviews the /api/classify route accepts per request (output-token safe). */
export function maxClassifyBatchSizeForOutput(): number {
  const cap = getLlmMaxOutputTokens();
  return Math.max(
    1,
    Math.floor((cap - OUTPUT_BATCH_OVERHEAD) / TOKENS_PER_REVIEW_OUTPUT_ESTIMATE),
  );
}

export const MAX_CLASSIFY_BATCH_SIZE = 10;

/** Wall-clock budget for one /api/classify call (LLM + Turso cache). */
export function getClassifyPlatformDeadlineMs(): number {
  const raw = process.env.CLASSIFY_PLATFORM_DEADLINE_MS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 5_000) {
      return Math.floor(parsed);
    }
  }
  // Vercel Hobby hard-caps at 10s; return JSON 503 before an HTML 504 page.
  return process.env.VERCEL ? 9_000 : 110_000;
}

/** Default batch size when LLM_CLASSIFY_BATCH_SIZE is unset. */
export const DEFAULT_CLASSIFY_BATCH_SIZE = 10;

export function getClassifyBatchSize(): number {
  const safeMax = maxClassifyBatchSizeForOutput();
  const raw =
    process.env.LLM_CLASSIFY_BATCH_SIZE ?? process.env.GEMINI_CLASSIFY_BATCH_SIZE;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.min(Math.floor(parsed), safeMax, MAX_CLASSIFY_BATCH_SIZE);
    }
  }
  return Math.min(DEFAULT_CLASSIFY_BATCH_SIZE, safeMax);
}

export function estimateTokensPerClassifyBatch(batchSize: number): number {
  return SYSTEM_PROMPT_TOKEN_OVERHEAD + batchSize * TOKENS_PER_REVIEW_ESTIMATE;
}

export function estimateOutputTokensPerBatch(batchSize: number): number {
  return OUTPUT_BATCH_OVERHEAD + batchSize * TOKENS_PER_REVIEW_OUTPUT_ESTIMATE;
}

export function estimateTotalTokensPerBatch(batchSize: number): number {
  return (
    estimateTokensPerClassifyBatch(batchSize) +
    estimateOutputTokensPerBatch(batchSize)
  );
}

/** Amortized input + output tokens per classified review (planning estimate). */
export function estimateTokensPerReview(
  batchSize = getClassifyBatchSize(),
): number {
  if (batchSize <= 0) return 0;
  return Math.round(estimateTotalTokensPerBatch(batchSize) / batchSize);
}

/** Groq llama-4-scout / Cerebras gpt-oss: large context — generous output cap for classify JSON. */
export function getLlmMaxOutputTokens(): number {
  const raw = process.env.LLM_MAX_OUTPUT_TOKENS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return 16_384;
}

/** Scale max output tokens so large batches do not truncate JSON. */
export function estimateMaxOutputTokens(batchSize: number): number {
  const cap = getLlmMaxOutputTokens();
  const estimated = OUTPUT_BATCH_OVERHEAD + batchSize * TOKENS_PER_REVIEW_OUTPUT_ESTIMATE;
  const withBuffer = Math.ceil(estimated * 1.2);
  return Math.min(cap, Math.max(2_048, withBuffer));
}

/** Minimum delay between consecutive API calls (respects provider RPM). */
export function getLlmRequestCooldownMs(): number {
  const rpmDelayMs = Math.ceil(60_000 / LLM_RATE_LIMITS.requestsPerMinute);
  const envOverride =
    process.env.LLM_REQUEST_COOLDOWN_MS ?? process.env.LLM_BATCH_DELAY_MS;
  if (envOverride) {
    const parsed = Number(envOverride);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.max(parsed, rpmDelayMs);
    }
  }
  const bufferMs = getLlmProvider() === "cerebras" ? 1_000 : 500;
  return rpmDelayMs + bufferMs;
}

/** Delay between classify batches to respect RPM and TPM. */
export function getClassifyBatchDelayMs(batchSize = getClassifyBatchSize()): number {
  const tokensPerBatch = estimateTotalTokensPerBatch(batchSize);
  const tpmDelayMs = Math.ceil(
    (tokensPerBatch / LLM_RATE_LIMITS.tokensPerMinute) * 60_000,
  );
  const minSafeDelayMs = Math.max(tpmDelayMs, getLlmRequestCooldownMs(), 2_000);

  const envOverride =
    process.env.LLM_BATCH_DELAY_MS ?? process.env.GEMINI_BATCH_DELAY_MS;
  if (envOverride) {
    const parsed = Number(envOverride);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.max(parsed, minSafeDelayMs);
    }
  }
  return minSafeDelayMs;
}

export interface LlmClassificationEstimate {
  reviewCount: number;
  batchSize: number;
  batches: number;
  estimatedTokens: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  tokensPerReview: number;
  estimatedMinutes: number;
  batchDelayMs: number;
  exceedsDailyTokenQuota: boolean;
  exceedsDailyRequestQuota: boolean;
  maxReviewsPerDay: number;
  dailyTokenBudgetPct: number;
}

export function estimateLlmClassification(
  reviewCount: number,
  batchSize = getClassifyBatchSize(),
): LlmClassificationEstimate {
  const batches = Math.ceil(reviewCount / batchSize);
  const inputPerBatch = estimateTokensPerClassifyBatch(batchSize);
  const outputPerBatch = estimateOutputTokensPerBatch(batchSize);
  const estimatedInputTokens = batches * inputPerBatch;
  const estimatedOutputTokens = batches * outputPerBatch;
  const estimatedTokens = estimatedInputTokens + estimatedOutputTokens;
  const tokensPerReview =
    reviewCount > 0 ? Math.round(estimatedTokens / reviewCount) : 0;
  const batchDelayMs = getClassifyBatchDelayMs(batchSize);
  const estimatedMinutes = Math.ceil((batches * batchDelayMs) / 60_000);
  const tokensPerBatchTotal = inputPerBatch + outputPerBatch;
  const maxBatchesByTokens = Math.floor(
    LLM_RATE_LIMITS.tokensPerDay / tokensPerBatchTotal,
  );
  const maxBatchesByRequests = LLM_RATE_LIMITS.requestsPerDay;
  const maxBatchesPerDay = Math.min(maxBatchesByTokens, maxBatchesByRequests);
  const dailyTokenBudgetPct =
    LLM_RATE_LIMITS.tokensPerDay > 0
      ? Math.round((estimatedTokens / LLM_RATE_LIMITS.tokensPerDay) * 1000) / 10
      : 0;

  return {
    reviewCount,
    batchSize,
    batches,
    estimatedTokens,
    estimatedInputTokens,
    estimatedOutputTokens,
    tokensPerReview,
    estimatedMinutes,
    batchDelayMs,
    exceedsDailyTokenQuota: estimatedTokens > LLM_RATE_LIMITS.tokensPerDay,
    exceedsDailyRequestQuota: batches > LLM_RATE_LIMITS.requestsPerDay,
    maxReviewsPerDay: maxBatchesPerDay * batchSize,
    dailyTokenBudgetPct,
  };
}
