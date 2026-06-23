import {
  DEFAULT_CLASSIFY_BATCH_SIZE,
  estimateLlmClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
  getLlmRequestCooldownMs,
} from "./llm-limits";
import { isTransientRateLimit } from "./llm-errors";
import type { ClassifiedReview, RawReview } from "./types";

export { DEFAULT_CLASSIFY_BATCH_SIZE as CLASSIFY_BATCH_SIZE };
export { estimateLlmClassification };

const MAX_BATCH_RETRIES = 4;

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

export async function classifyAllReviews(
  reviews: RawReview[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ClassifyAllResult> {
  const batchSize = getClassifyBatchSize();
  const batchDelayMs = getClassifyBatchDelayMs(batchSize);

  const classified: ClassifiedReview[] = [];
  let mock = false;
  let warning: string | undefined;

  for (let i = 0; i < reviews.length; i += batchSize) {
    if (i > 0) {
      await sleep(batchDelayMs);
    }

    const batch = reviews.slice(i, i + batchSize);
    try {
      const result = await classifyBatch(batch);

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
