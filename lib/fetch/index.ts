import {
  clampLimitPerSource,
  DEFAULT_LIMIT_PER_SOURCE,
  GLOBAL_REGION_ID,
  isFetchSourceId,
  MAX_SOURCES_PER_REQUEST,
} from "./config";
import {
  fetchAppStoreReviews,
  fetchPlayStoreReviews,
  fetchRedditReviews,
  fetchSocialMediaReviews,
  fetchSpotifyCommunityReviews,
} from "./fetchers";
import type {
  FetchReviewsRequest,
  FetchReviewsResult,
  FetchSourceId,
} from "./types";
import { dedupeByText, toRawReviews } from "./utils";

function buildLabel(
  sources: FetchSourceId[],
  limitPerSource: number,
): string {
  if (sources.length === 1) {
    return `live-${sources[0]}-${limitPerSource}`;
  }
  return `live-${sources.join("+")}-${limitPerSource}each`;
}

export async function fetchLiveReviews(
  request: FetchReviewsRequest,
): Promise<FetchReviewsResult> {
  const sources = [...new Set(request.sources)];
  const limitPerSource = clampLimitPerSource(
    request.limitPerSource || DEFAULT_LIMIT_PER_SOURCE,
  );
  const region = (
    request.region ??
    request.country ??
    GLOBAL_REGION_ID
  ).toLowerCase();
  const minRating = request.minRating ?? 0;

  const bySource: Partial<Record<FetchSourceId, number>> = {};
  const combined: ReturnType<typeof dedupeByText> = [];

  for (const source of sources) {
    try {
      const rows = await fetchSourceReviews(source, {
        limitPerSource,
        region,
        minRating,
        playStoreSort: request.playStoreSort ?? "newest",
        appStoreSort: request.appStoreSort ?? "recent",
        redditQuery: request.redditQuery,
      });
      bySource[source] = rows.length;
      combined.push(...rows);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      console.error(`[fetch] ${source} failed:`, message);
      bySource[source] = 0;
    }
  }

  const reviews = toRawReviews(dedupeByText(combined));

  if (reviews.length === 0) {
    const failedSources = sources.filter((source) => !bySource[source]);
    const detail =
      failedSources.length > 0
        ? `All selected sources failed (${failedSources.join(", ")}). Try another source, lower the min rating filter, or use a saved corpus.`
        : "No reviews returned. Try another source, lower the min rating filter, or increase the fetch count.";
    throw new Error(detail);
  }

  return {
    reviews,
    count: reviews.length,
    bySource,
    fetchedAt: new Date().toISOString(),
    label: buildLabel(sources, limitPerSource),
  };
}

async function fetchSourceReviews(
  source: FetchSourceId,
  options: {
    limitPerSource: number;
    region: string;
    minRating: number;
    playStoreSort: NonNullable<FetchReviewsRequest["playStoreSort"]>;
    appStoreSort: NonNullable<FetchReviewsRequest["appStoreSort"]>;
    redditQuery?: string;
  },
) {
  switch (source) {
    case "playstore":
      return fetchPlayStoreReviews({
        limit: options.limitPerSource,
        sort: options.playStoreSort,
        region: options.region,
        minRating: options.minRating,
      });
    case "appstore":
      return fetchAppStoreReviews({
        limit: options.limitPerSource,
        sort: options.appStoreSort,
        region: options.region,
        minRating: options.minRating,
      });
    case "reddit":
      return fetchRedditReviews({
        limit: options.limitPerSource,
        query: options.redditQuery,
      });
    case "spotify-community":
      return fetchSpotifyCommunityReviews({ limit: options.limitPerSource });
    case "social-media":
      return fetchSocialMediaReviews({ limit: options.limitPerSource });
    default:
      return [];
  }
}

export function parseFetchReviewsRequest(
  body: Record<string, unknown>,
): FetchReviewsRequest {
  const rawSources = body.sources;
  if (!Array.isArray(rawSources) || rawSources.length === 0) {
    throw new Error("Select at least one source to fetch.");
  }

  const sources = rawSources
    .map(String)
    .filter(isFetchSourceId);

  if (sources.length === 0) {
    throw new Error("No valid sources selected.");
  }

  if (sources.length > MAX_SOURCES_PER_REQUEST) {
    throw new Error(`Maximum ${MAX_SOURCES_PER_REQUEST} sources per fetch.`);
  }

  const limitPerSource = clampLimitPerSource(Number(body.limitPerSource));

  const regionRaw =
    typeof body.region === "string"
      ? body.region
      : typeof body.country === "string"
        ? body.country
        : GLOBAL_REGION_ID;

  return {
    sources,
    limitPerSource,
    playStoreSort:
      body.playStoreSort === "rating" ||
      body.playStoreSort === "helpful" ||
      body.playStoreSort === "newest"
        ? body.playStoreSort
        : "newest",
    appStoreSort:
      body.appStoreSort === "helpful" || body.appStoreSort === "recent"
        ? body.appStoreSort
        : "recent",
    region: regionRaw.toLowerCase(),
    country: regionRaw.toLowerCase(),
    minRating:
      typeof body.minRating === "number" && body.minRating >= 1
        ? Math.min(5, Math.floor(body.minRating))
        : 0,
    redditQuery:
      typeof body.redditQuery === "string" ? body.redditQuery.trim() : undefined,
  };
}
