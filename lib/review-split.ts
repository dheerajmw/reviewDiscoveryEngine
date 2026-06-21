import { estimateLlmClassification } from "./llm-limits";
import type { LlmClassificationEstimate } from "./llm-limits";
import type { RawReview } from "./types";

export const MIN_SPLIT_PARTS = 2;
export const MAX_SPLIT_PARTS = 5;

export function splitReviews(reviews: RawReview[], parts: number): RawReview[][] {
  const count = Math.min(
    MAX_SPLIT_PARTS,
    Math.max(MIN_SPLIT_PARTS, Math.floor(parts)),
  );
  if (reviews.length === 0) return [];
  if (count >= reviews.length) {
    return reviews.map((review) => [review]);
  }

  const chunkSize = Math.ceil(reviews.length / count);
  const chunks: RawReview[][] = [];
  for (let i = 0; i < reviews.length; i += chunkSize) {
    chunks.push(reviews.slice(i, i + chunkSize));
  }
  return chunks;
}

export interface SplitOption {
  parts: number;
  chunkSizes: number[];
  estimates: LlmClassificationEstimate[];
  allWithinQuota: boolean;
}

export function getSplitChunkSizes(reviewCount: number, parts: number): number[] {
  if (reviewCount <= 0) return [];
  const chunkSize = Math.ceil(reviewCount / parts);
  const sizes: number[] = [];
  let remaining = reviewCount;
  for (let index = 0; index < parts && remaining > 0; index++) {
    const size = Math.min(chunkSize, remaining);
    sizes.push(size);
    remaining -= size;
  }
  return sizes;
}

export function getSplitOptions(reviewCount: number): SplitOption[] {
  const options: SplitOption[] = [];
  for (let parts = MIN_SPLIT_PARTS; parts <= MAX_SPLIT_PARTS; parts++) {
    const chunkSizes = getSplitChunkSizes(reviewCount, parts);
    const estimates = chunkSizes.map((size) => estimateLlmClassification(size));
    options.push({
      parts,
      chunkSizes,
      estimates,
      allWithinQuota: estimates.every(
        (estimate) => !estimate.exceedsDailyTokenQuota,
      ),
    });
  }
  return options;
}

export function buildSplitDatasetName(
  baseName: string,
  partIndex: number,
  totalParts: number,
): string {
  const stem = baseName.replace(/\s*·\s*part\s+\d+\s+of\s+\d+\s*$/i, "").trim();
  return `${stem} · part ${partIndex} of ${totalParts}`;
}
