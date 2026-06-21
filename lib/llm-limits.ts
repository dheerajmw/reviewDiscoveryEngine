import { GEMINI_MODEL } from "./gemini-config";

/**
 * Conservative planning limits for Gemini classification batches.
 * Override daily token budget with GEMINI_DAILY_TOKEN_BUDGET if needed.
 */
function dailyTokenBudget(): number {
  const raw = process.env.GEMINI_DAILY_TOKEN_BUDGET;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return 1_000_000;
}

export const LLM_RATE_LIMITS = {
  get model() {
    return GEMINI_MODEL;
  },
  requestsPerMinute: 15,
  requestsPerDay: 1_500,
  tokensPerMinute: 250_000,
  get tokensPerDay() {
    return dailyTokenBudget();
  },
} as const;

/** Compact classify prompt + taxonomy (amortized per request). */
const SYSTEM_PROMPT_TOKEN_OVERHEAD = 1_800;

/** Labels + one evidence string + discovery fields per review. */
const TOKENS_PER_REVIEW_ESTIMATE = 400;

/** Max reviews the /api/classify route accepts per request. */
export const MAX_CLASSIFY_BATCH_SIZE = 20;

/** Default batch size — fewer requests, less repeated system prompt. */
export const DEFAULT_CLASSIFY_BATCH_SIZE = 20;

export function getClassifyBatchSize(): number {
  const raw = process.env.GEMINI_CLASSIFY_BATCH_SIZE;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_CLASSIFY_BATCH_SIZE) {
      return Math.floor(parsed);
    }
  }
  return DEFAULT_CLASSIFY_BATCH_SIZE;
}

export function estimateTokensPerClassifyBatch(batchSize: number): number {
  return SYSTEM_PROMPT_TOKEN_OVERHEAD + batchSize * TOKENS_PER_REVIEW_ESTIMATE;
}

/** Delay between classify batches to respect RPM and TPM. Override with GEMINI_BATCH_DELAY_MS. */
export function getClassifyBatchDelayMs(batchSize = getClassifyBatchSize()): number {
  const envOverride = process.env.GEMINI_BATCH_DELAY_MS;
  if (envOverride) {
    const parsed = Number(envOverride);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  const tokensPerBatch = estimateTokensPerClassifyBatch(batchSize);
  const tpmDelayMs = Math.ceil(
    (tokensPerBatch / LLM_RATE_LIMITS.tokensPerMinute) * 60_000,
  );
  const rpmDelayMs = Math.ceil(60_000 / LLM_RATE_LIMITS.requestsPerMinute);
  return Math.max(tpmDelayMs, rpmDelayMs, 2_000);
}

export interface LlmClassificationEstimate {
  reviewCount: number;
  batchSize: number;
  batches: number;
  estimatedTokens: number;
  estimatedMinutes: number;
  batchDelayMs: number;
  exceedsDailyTokenQuota: boolean;
  exceedsDailyRequestQuota: boolean;
  maxReviewsPerDay: number;
}

export function estimateLlmClassification(
  reviewCount: number,
  batchSize = DEFAULT_CLASSIFY_BATCH_SIZE,
): LlmClassificationEstimate {
  const batches = Math.ceil(reviewCount / batchSize);
  const tokensPerBatch = estimateTokensPerClassifyBatch(batchSize);
  const estimatedTokens = batches * tokensPerBatch;
  const batchDelayMs = getClassifyBatchDelayMs(batchSize);
  const estimatedMinutes = Math.ceil((batches * batchDelayMs) / 60_000);
  const maxBatchesPerDay = Math.floor(
    LLM_RATE_LIMITS.tokensPerDay / tokensPerBatch,
  );

  return {
    reviewCount,
    batchSize,
    batches,
    estimatedTokens,
    estimatedMinutes,
    batchDelayMs,
    exceedsDailyTokenQuota: estimatedTokens > LLM_RATE_LIMITS.tokensPerDay,
    exceedsDailyRequestQuota: batches > LLM_RATE_LIMITS.requestsPerDay,
    maxReviewsPerDay: maxBatchesPerDay * batchSize,
  };
}
