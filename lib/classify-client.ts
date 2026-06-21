import {
  DEFAULT_CLASSIFY_BATCH_SIZE,
  estimateLlmClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
} from "./llm-limits";
import type { ClassifiedReview, RawReview } from "./types";

export { DEFAULT_CLASSIFY_BATCH_SIZE as CLASSIFY_BATCH_SIZE };
export { estimateLlmClassification };

const BATCH_RETRY_DELAY_MS = 15_000;
const MAX_BATCH_RETRIES = 3;

export interface ClassifyAllResult {
  classified: ClassifiedReview[];
  mock: boolean;
  warning?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    if (response.status === 429 && attempt < MAX_BATCH_RETRIES - 1) {
      await sleep(BATCH_RETRY_DELAY_MS * (attempt + 1));
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
    const result = await classifyBatch(batch);

    classified.push(...result.classified);
    mock = mock || result.mock;
    warning = warning ?? result.warning;
    onProgress?.(classified.length, reviews.length);
  }

  return { classified, mock, warning };
}
