/** Groq free-tier limits for llama-3.3-70b-versatile (console.groq.com). */
export const GROQ_RATE_LIMITS = {
  model: "llama-3.3-70b-versatile",
  requestsPerMinute: 30,
  requestsPerDay: 1_000,
  tokensPerMinute: 12_000,
  tokensPerDay: 100_000,
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
  const raw = process.env.GROQ_CLASSIFY_BATCH_SIZE;
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

/** Delay between classify batches to respect RPM and TPM. Override with GROQ_BATCH_DELAY_MS. */
export function getClassifyBatchDelayMs(batchSize = getClassifyBatchSize()): number {
  const envOverride = process.env.GROQ_BATCH_DELAY_MS;
  if (envOverride) {
    const parsed = Number(envOverride);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  const tokensPerBatch = estimateTokensPerClassifyBatch(batchSize);
  const tpmDelayMs = Math.ceil(
    (tokensPerBatch / GROQ_RATE_LIMITS.tokensPerMinute) * 60_000,
  );
  const rpmDelayMs = Math.ceil(60_000 / GROQ_RATE_LIMITS.requestsPerMinute);
  return Math.max(tpmDelayMs, rpmDelayMs, 2_000);
}

export interface GroqClassificationEstimate {
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

export function estimateGroqClassification(
  reviewCount: number,
  batchSize = DEFAULT_CLASSIFY_BATCH_SIZE,
): GroqClassificationEstimate {
  const batches = Math.ceil(reviewCount / batchSize);
  const tokensPerBatch = estimateTokensPerClassifyBatch(batchSize);
  const estimatedTokens = batches * tokensPerBatch;
  const batchDelayMs = getClassifyBatchDelayMs(batchSize);
  const estimatedMinutes = Math.ceil((batches * batchDelayMs) / 60_000);
  const maxBatchesPerDay = Math.floor(
    GROQ_RATE_LIMITS.tokensPerDay / tokensPerBatch,
  );

  return {
    reviewCount,
    batchSize,
    batches,
    estimatedTokens,
    estimatedMinutes,
    batchDelayMs,
    exceedsDailyTokenQuota: estimatedTokens > GROQ_RATE_LIMITS.tokensPerDay,
    exceedsDailyRequestQuota: batches > GROQ_RATE_LIMITS.requestsPerDay,
    maxReviewsPerDay: maxBatchesPerDay * batchSize,
  };
}
