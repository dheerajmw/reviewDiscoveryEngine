import type { RawReview } from "./types";

export interface CorpusLoadResult {
  file: string;
  label: string;
  reviews: RawReview[];
  count: number;
}

export async function loadCorpusFile(fileId: string): Promise<CorpusLoadResult> {
  const res = await fetch(`/api/corpus?file=${encodeURIComponent(fileId)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to load review corpus.");
  }

  return data as CorpusLoadResult;
}
