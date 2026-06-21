import type { RawReview } from "@/lib/types";

export type FetchSourceId =
  | "playstore"
  | "appstore"
  | "reddit"
  | "spotify-community"
  | "social-media";

export type PlayStoreSort = "newest" | "rating" | "helpful";
export type AppStoreSort = "recent" | "helpful";

export interface FetchedReviewRow extends RawReview {
  rating?: number | string;
  date?: string;
  url?: string;
}

export interface FetchReviewsRequest {
  sources: FetchSourceId[];
  limitPerSource: number;
  playStoreSort?: PlayStoreSort;
  appStoreSort?: AppStoreSort;
  /** Store region code, or `global` for all regions. */
  region?: string;
  /** @deprecated Use `region` */
  country?: string;
  minRating?: number;
  redditQuery?: string;
}

export interface FetchReviewsResult {
  reviews: RawReview[];
  count: number;
  bySource: Partial<Record<FetchSourceId, number>>;
  fetchedAt: string;
  label: string;
  warning?: string;
}

export interface FetchSourceConfig {
  id: FetchSourceId;
  label: string;
  description: string;
  supportsSort: boolean;
  supportsMinRating: boolean;
  supportsCountry: boolean;
  defaultLimit: number;
  maxLimit: number;
}

export interface FetchConfigResponse {
  sources: FetchSourceConfig[];
  playStoreSorts: { id: PlayStoreSort; label: string }[];
  appStoreSorts: { id: AppStoreSort; label: string }[];
  regions: { id: string; label: string; description?: string }[];
  countries: { id: string; label: string }[];
  defaults: {
    limitPerSource: number;
    region: string;
    country: string;
    playStoreSort: PlayStoreSort;
    appStoreSort: AppStoreSort;
  };
  limits: {
    minPerSource: number;
    maxPerSource: number;
    maxSources: number;
  };
}
