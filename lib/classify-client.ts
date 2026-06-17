import type { ClassifiedReview, RawReview } from "./types";

// Free tier is ~15 requests/min — keep batches small and spaced out
export const CLASSIFY_BATCH_SIZE = 5;
const BATCH_DELAY_MS = 5000;
const BATCH_RETRY_DELAY_MS = 15000;
const MAX_BATCH_RETRIES = 3;

export interface ClassifyAllResult {
  classified: ClassifiedReview[];
  mock: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function classifyBatch(
  batch: RawReview[],
): Promise<{ classified: ClassifiedReview[]; mock: boolean }> {
  let lastError = "Classification request failed.";

  for (let attempt = 0; attempt < MAX_BATCH_RETRIES; attempt++) {
    const response = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews: batch }),
    });

    const data = await response.json();

    if (response.ok) {
      return { classified: data.classified, mock: Boolean(data.mock) };
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
  const classified: ClassifiedReview[] = [];
  let mock = false;

  for (let i = 0; i < reviews.length; i += CLASSIFY_BATCH_SIZE) {
    if (i > 0) {
      await sleep(BATCH_DELAY_MS);
    }

    const batch = reviews.slice(i, i + CLASSIFY_BATCH_SIZE);
    const result = await classifyBatch(batch);

    classified.push(...result.classified);
    mock = mock || result.mock;
    onProgress?.(classified.length, reviews.length);
  }

  return { classified, mock };
}
