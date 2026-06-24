import type { FetchedReviewRow } from "./types";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: {
    headers?: HeadersInit;
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: options.headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Fetch failed.");
}

export function dedupeByText(
  rows: FetchedReviewRow[],
  minLen = 15,
): FetchedReviewRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const text = (row.text ?? "").trim();
    const key = text.toLowerCase().slice(0, 220);
    if (text.length < minLen || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterByMinRating(
  rows: FetchedReviewRow[],
  minRating: number,
): FetchedReviewRow[] {
  if (!minRating || minRating <= 0) return rows;
  return rows.filter((row) => {
    const rating = Number(row.rating);
    return Number.isFinite(rating) && rating >= minRating;
  });
}

export function toRawReviews(rows: FetchedReviewRow[]) {
  return rows.map(({ source, text }) => ({ source, text }));
}
