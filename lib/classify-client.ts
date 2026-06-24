import {
  DEFAULT_CLASSIFY_BATCH_SIZE,
  estimateLlmClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
  getLlmRequestCooldownMs,
} from "./llm-limits";
import { isRecoverableParseError } from "./classify";
import { isTransientRateLimit } from "./llm-errors";
import type { ClassifiedReview, RawReview } from "./types";

export { DEFAULT_CLASSIFY_BATCH_SIZE as CLASSIFY_BATCH_SIZE };
export { estimateLlmClassification };

const MAX_BATCH_RETRIES = 4;

export interface ClassifyRuntimeConfig {
  mockEnabled: boolean;
  batchSize: number;
  batchDelayMs: number;
  provider?: string;
  model?: string;
}

let classifyConfigPromise: Promise<ClassifyRuntimeConfig> | null = null;

/** Server-authoritative batch settings (env vars are not available in the browser). */
export async function loadClassifyRuntimeConfig(): Promise<ClassifyRuntimeConfig> {
  if (!classifyConfigPromise) {
    classifyConfigPromise = fetch("/api/classify/config")
      .then(async (response) => {
        const data = (await response.json()) as ClassifyRuntimeConfig & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load classify config.");
        }
        const batchSize =
          Number.isFinite(Number(data.batchSize)) && Number(data.batchSize) >= 1
            ? Math.floor(Number(data.batchSize))
            : getClassifyBatchSize();
        return {
          mockEnabled: Boolean(data.mockEnabled),
          batchSize,
          batchDelayMs:
            Number.isFinite(Number(data.batchDelayMs)) &&
            Number(data.batchDelayMs) >= 0
              ? Math.floor(Number(data.batchDelayMs))
              : getClassifyBatchDelayMs(batchSize),
          provider: data.provider,
          model: data.model,
        };
      })
      .catch(() => ({
        mockEnabled: true,
        batchSize: DEFAULT_CLASSIFY_BATCH_SIZE,
        batchDelayMs: getClassifyBatchDelayMs(DEFAULT_CLASSIFY_BATCH_SIZE),
      }));
  }
  return classifyConfigPromise;
}

export function resetClassifyRuntimeConfigCache(): void {
  classifyConfigPromise = null;
}

export interface ClassifyAllResult {
  classified: ClassifiedReview[];
  mock: boolean;
  warning?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPartialProgressError(
  message: string,
  completed: number,
  total: number,
): string {
  if (completed > 0 && completed < total) {
    return (
      `${message} ${completed}/${total} reviews are cached — retry Analyze to continue (cached reviews skip the API).`
    );
  }
  return message;
}

async function classifyBatch(
  batch: RawReview[],
): Promise<{ classified: ClassifiedReview[]; mock: boolean; warning?: string }> {
  let lastError = "Classification request failed.";

  for (let attempt = 0; attempt < MAX_BATCH_RETRIES; attempt++) {
    const response = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews: batch }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        classified: data.classified,
        mock: Boolean(data.mock),
        warning:
          typeof data.warning === "string" ? data.warning : undefined,
      };
    }

    lastError = data.error ?? lastError;
    const retryable =
      response.status === 429 ||
      response.status === 503 ||
      isTransientRateLimit(new Error(lastError));

    if (retryable && attempt < MAX_BATCH_RETRIES - 1) {
      await sleep(getLlmRequestCooldownMs() * (attempt + 1));
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
}

async function classifyBatchResilient(
  batch: RawReview[],
): Promise<{ classified: ClassifiedReview[]; mock: boolean; warning?: string }> {
  try {
    return await classifyBatch(batch);
  } catch (error) {
    if (batch.length === 1 || !isRecoverableParseError(error)) {
      throw error;
    }

    const classified: ClassifiedReview[] = [];
    let mock = false;
    let warning: string | undefined;

    for (let index = 0; index < batch.length; index++) {
      if (index > 0) {
        await sleep(getLlmRequestCooldownMs());
      }
      const result = await classifyBatch([batch[index]!]);
      classified.push(...result.classified);
      mock = mock || result.mock;
      warning = warning ?? result.warning;
    }

    return { classified, mock, warning };
  }
}

export async function classifyAllReviews(
  reviews: RawReview[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ClassifyAllResult> {
  const { batchSize, batchDelayMs } = await loadClassifyRuntimeConfig();

  const classified: ClassifiedReview[] = [];
  let mock = false;
  let warning: string | undefined;

  for (let i = 0; i < reviews.length; i += batchSize) {
    if (i > 0) {
      await sleep(batchDelayMs);
    }

    const batch = reviews.slice(i, i + batchSize);
    try {
      const result = await classifyBatchResilient(batch);

      classified.push(...result.classified);
      mock = mock || result.mock;
      warning = warning ?? result.warning;
      onProgress?.(classified.length, reviews.length);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Classification failed.";
      throw new Error(
        formatPartialProgressError(message, classified.length, reviews.length),
      );
    }
  }

  return { classified, mock, warning };
}
