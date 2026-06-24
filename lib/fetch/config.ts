import type {
  AppStoreSort,
  FetchConfigResponse,
  FetchSourceConfig,
  FetchSourceId,
  PlayStoreSort,
} from "./types";

export const USER_AGENT =
  "Mozilla/5.0 (compatible; ReviewLens/1.0; research)";

export const SPOTIFY_PLAY_ID = "com.spotify.music";
export const SPOTIFY_APP_STORE_ID = 324684580;
/** Required for apps.apple.com page fetch (RSS feed no longer works). */
export const SPOTIFY_APP_STORE_SLUG = "spotify-music-and-podcasts";

/** Subreddits scraped automatically when Reddit is selected (no input needed). */
export const DEFAULT_REDDIT_SUBREDDITS = [
  "spotify",
  "truespotify",
  "LetsTalkMusic",
  "music",
  "listentothis",
  "ifyoulikeblank",
] as const;

export const DEFAULT_REDDIT_SUBREDDIT_LABELS = DEFAULT_REDDIT_SUBREDDITS.map(
  (sub) => `r/${sub}`,
);

/** Comment search topics — each is queried as "spotify <term>" (not subreddit names). */
export const DEFAULT_REDDIT_DISCOVERY_QUERIES = [
  "discover weekly",
  "release radar",
  "spotify dj",
  "recommendation algorithm",
  "music discovery",
  "same songs repeat",
  "recommendation quality",
  "genre bubble",
  "shuffle repeat",
  "find new artists",
  "daily mix",
  "recommendation diversity",
  "discovery fatigue",
  "autoplay recommendations",
  "listening history loop",
  "artist discovery",
] as const;

export const DEFAULT_REDDIT_QUERY_INPUT =
  DEFAULT_REDDIT_DISCOVERY_QUERIES.join(", ");

export function parseRedditQueryInput(query?: string): string[] {
  const trimmed = query?.trim();
  if (!trimmed) return [...DEFAULT_REDDIT_DISCOVERY_QUERIES];
  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export const MIN_LIMIT_PER_SOURCE = 10;
export const DEFAULT_MAX_LIMIT_PER_SOURCE = 1000;
export const DEFAULT_LIMIT_PER_SOURCE = 50;
export const MAX_SOURCES_PER_REQUEST = 5;

export function getMaxLimitPerSource(): number {
  const raw = process.env.FETCH_MAX_REVIEWS_PER_SOURCE;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= MIN_LIMIT_PER_SOURCE) {
      return Math.floor(parsed);
    }
  }
  return DEFAULT_MAX_LIMIT_PER_SOURCE;
}

/** @deprecated Use getMaxLimitPerSource() for runtime/env-aware cap. */
export const MAX_LIMIT_PER_SOURCE = DEFAULT_MAX_LIMIT_PER_SOURCE;

export const FETCH_SOURCES: FetchSourceConfig[] = [
  {
    id: "playstore",
    label: "Play Store",
    description: "Google Play reviews for Spotify",
    supportsSort: true,
    supportsMinRating: true,
    supportsCountry: true,
    defaultLimit: 100,
    maxLimit: DEFAULT_MAX_LIMIT_PER_SOURCE,
  },
  {
    id: "appstore",
    label: "App Store",
    description: "Apple App Store reviews for Spotify",
    supportsSort: true,
    supportsMinRating: true,
    supportsCountry: true,
    defaultLimit: 100,
    maxLimit: DEFAULT_MAX_LIMIT_PER_SOURCE,
  },
  {
    id: "reddit",
    label: "Reddit",
    description: "Spotify-related posts and comments from music subreddits",
    supportsSort: false,
    supportsMinRating: false,
    supportsCountry: false,
    defaultLimit: 80,
    maxLimit: DEFAULT_MAX_LIMIT_PER_SOURCE,
  },
  {
    id: "spotify-community",
    label: "Spotify Community",
    description: "community.spotify.com forum threads",
    supportsSort: false,
    supportsMinRating: false,
    supportsCountry: false,
    defaultLimit: 60,
    maxLimit: DEFAULT_MAX_LIMIT_PER_SOURCE,
  },
  {
    id: "social-media",
    label: "Social media",
    description: "Bluesky, Hacker News, Mastodon posts",
    supportsSort: false,
    supportsMinRating: false,
    supportsCountry: false,
    defaultLimit: 60,
    maxLimit: DEFAULT_MAX_LIMIT_PER_SOURCE,
  },
];

export const PLAY_STORE_SORTS: { id: PlayStoreSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "rating", label: "Highest rating" },
  { id: "helpful", label: "Most helpful" },
];

export const APP_STORE_SORTS: { id: AppStoreSort; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "helpful", label: "Most helpful" },
];

export const GLOBAL_REGION_ID = "global";

export const FETCH_COUNTRIES = [
  { id: "us", label: "United States" },
  { id: "gb", label: "United Kingdom" },
  { id: "de", label: "Germany" },
  { id: "in", label: "India" },
  { id: "au", label: "Australia" },
  { id: "ca", label: "Canada" },
];

/** Store scrape targets when region is "All regions". */
export const STORE_REGION_CODES = FETCH_COUNTRIES.map((country) => country.id);

export const FETCH_REGIONS = [
  {
    id: GLOBAL_REGION_ID,
    label: "All regions",
    description: "Mix reviews from multiple store regions",
  },
  ...FETCH_COUNTRIES.map((country) => ({
    id: country.id,
    label: country.label,
    description: undefined,
  })),
];

const VALID_SOURCE_IDS = new Set(FETCH_SOURCES.map((s) => s.id));

export function isFetchSourceId(value: string): value is FetchSourceId {
  return VALID_SOURCE_IDS.has(value as FetchSourceId);
}

export function getFetchConfig(): FetchConfigResponse {
  return {
    sources: FETCH_SOURCES,
    playStoreSorts: PLAY_STORE_SORTS,
    appStoreSorts: APP_STORE_SORTS,
    regions: FETCH_REGIONS,
    countries: FETCH_COUNTRIES,
    defaults: {
      limitPerSource: DEFAULT_LIMIT_PER_SOURCE,
      region: GLOBAL_REGION_ID,
      country: GLOBAL_REGION_ID,
      playStoreSort: "newest",
      appStoreSort: "recent",
    },
    limits: {
      minPerSource: MIN_LIMIT_PER_SOURCE,
      maxPerSource: getMaxLimitPerSource(),
      maxSources: MAX_SOURCES_PER_REQUEST,
    },
  };
}

export function clampLimitPerSource(value: number): number {
  return Math.min(
    getMaxLimitPerSource(),
    Math.max(MIN_LIMIT_PER_SOURCE, Math.floor(value)),
  );
}
