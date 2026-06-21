import type { FetchedReviewRow } from "./types";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
