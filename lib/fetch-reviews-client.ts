import type {
  FetchConfigResponse,
  FetchReviewsRequest,
  FetchReviewsResult,
  FetchSourceId,
} from "@/lib/fetch/types";
import type { RawReview } from "@/lib/types";
import { parseApiJson } from "@/lib/parse-api-response";

export interface FetchLiveReviewsOptions {
  onSourceProgress?: (
    source: FetchSourceId,
    completed: number,
    total: number,
  ) => void;
}

function dedupeRawReviews(reviews: RawReview[]): RawReview[] {
  const seen = new Set<string>();
  return reviews.filter((review) => {
    const text = review.text.trim();
    const key = text.toLowerCase().slice(0, 220);
    if (text.length < 15 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildFetchLabel(
  sources: FetchSourceId[],
  limitPerSource: number,
): string {
  if (sources.length === 1) {
    return `live-${sources[0]}-${limitPerSource}`;
  }
  return `live-${sources.join("+")}-${limitPerSource}each`;
}

async function fetchLiveReviewsForSource(
  request: FetchReviewsRequest,
  source: FetchSourceId,
): Promise<FetchReviewsResult> {
  const response = await fetch("/api/fetch-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, sources: [source] }),
  });

  const data = await parseApiJson<FetchReviewsResult & { error?: string }>(
    response,
  );

  if (!response.ok) {
    throw new Error(data.error ?? `Failed to fetch from ${source}.`);
  }

  return data;
}

export async function loadFetchConfig(): Promise<FetchConfigResponse> {
  const response = await fetch("/api/fetch-reviews");
  const data = await parseApiJson<FetchConfigResponse & { error?: string }>(
    response,
  );
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load fetch options.");
  }
  return data;
}

export async function fetchLiveReviews(
  request: FetchReviewsRequest,
  options?: FetchLiveReviewsOptions,
): Promise<FetchReviewsResult> {
  const sources = [...new Set(request.sources)];
  if (sources.length === 0) {
    throw new Error("Select at least one source to fetch.");
  }

  const combined: RawReview[] = [];
  const bySource: Partial<Record<FetchSourceId, number>> = {};
  const sourceErrors: string[] = [];

  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    options?.onSourceProgress?.(source, index + 1, sources.length);

    try {
      const result = await fetchLiveReviewsForSource(request, source);
      bySource[source] = result.count;
      combined.push(...result.reviews);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to fetch ${source}.`;
      sourceErrors.push(`${source}: ${message}`);
      bySource[source] = 0;
    }
  }

  const reviews = dedupeRawReviews(combined);
  if (reviews.length === 0) {
    const detail =
      sourceErrors.length > 0
        ? sourceErrors.join(" ")
        : "No reviews returned. Try another source, lower the min rating filter, or increase the fetch count.";
    throw new Error(detail);
  }

  const result: FetchReviewsResult = {
    reviews,
    count: reviews.length,
    bySource,
    fetchedAt: new Date().toISOString(),
    label: buildFetchLabel(sources, request.limitPerSource),
  };

  if (sourceErrors.length > 0) {
    return {
      ...result,
      warning: `Some sources failed (${sourceErrors.join("; ")}). Loaded ${reviews.length} reviews from the sources that succeeded.`,
    };
  }

  return result;
}
