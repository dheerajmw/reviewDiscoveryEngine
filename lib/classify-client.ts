import {
  DEFAULT_CLASSIFY_BATCH_SIZE,
  estimateLlmClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
  getLlmRequestCooldownMs,
} from "./llm-limits";
import { isRecoverableParseError } from "./classify";
import { isTransientRateLimit } from "./llm-errors";
import {
  isRecoverableApiResponseError,
  parseApiJson,
} from "./parse-api-response";
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

function isRecoverableClassifyError(error: unknown): boolean {
  return isRecoverableParseError(error) || isRecoverableApiResponseError(error);
}

function isRetryableClassifyResponse(
  response: Response,
  error: unknown,
): boolean {
  if (
    response.status === 429 ||
    response.status === 503 ||
    response.status === 504
  ) {
    return true;
  }
  if (response.status >= 500) return true;
  if (isTransientRateLimit(error)) return true;
  return isRecoverableApiResponseError(error);
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

    let data: {
      classified?: ClassifiedReview[];
      mock?: boolean;
      warning?: string;
      error?: string;
    };

    try {
      data = await parseApiJson(response);
    } catch (parseError) {
      lastError =
        parseError instanceof Error
          ? parseError.message
          : "Invalid classification response.";
      if (
        isRetryableClassifyResponse(response, parseError) &&
        attempt < MAX_BATCH_RETRIES - 1
      ) {
        await sleep(getLlmRequestCooldownMs() * (attempt + 1));
        continue;
      }
      throw new Error(lastError);
    }

    if (response.ok) {
      if (!Array.isArray(data.classified) || data.classified.length === 0) {
        throw new Error("Classification response missing reviews.");
      }
      return {
        classified: data.classified,
        mock: Boolean(data.mock),
        warning:
          typeof data.warning === "string" ? data.warning : undefined,
      };
    }

    lastError = data.error ?? lastError;
    if (
      isRetryableClassifyResponse(response, new Error(lastError)) &&
      attempt < MAX_BATCH_RETRIES - 1
    ) {
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
    if (batch.length === 1 || !isRecoverableClassifyError(error)) {
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
