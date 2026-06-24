import { SPOTIFY_APP_STORE_ID, SPOTIFY_APP_STORE_SLUG, USER_AGENT } from "./config";
import type { FetchedReviewRow } from "./types";
import { fetchWithRetry } from "./utils";
import { getSourceFetchBudgetMs } from "./budget";

/**
 * Apple shut down the public iTunes RSS customer-reviews feed in 2026.
 * app-store-scraper depends on that feed and now returns 0 reviews.
 *
 * What still works: each localized App Store product page SSR's reviews into
 * <script id="serialized-server-data"> as {"$kind":"Review"} objects.
 * ~10 unique reviews per country; aggregate storefronts to reach higher limits.
 */

/** Storefronts for page-based fetch (~10 unique reviews each for Spotify). */
export const APP_STORE_PAGE_COUNTRY_CODES = [
  "us",
  "gb",
  "de",
  "in",
  "au",
  "ca",
  "fr",
  "es",
  "it",
  "br",
  "mx",
  "jp",
  "kr",
  "nl",
  "se",
  "pl",
  "tr",
  "id",
  "ph",
  "sg",
] as const;

interface AppStoreSsrReview {
  id?: string;
  title?: string;
  contents?: string;
  rating?: number;
  date?: string;
  reviewerName?: string;
}

function walkForReviews(node: unknown, out: AppStoreSsrReview[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkForReviews(item, out);
    return;
  }
  const record = node as Record<string, unknown>;
  if (record.$kind === "Review") {
    out.push(record as AppStoreSsrReview);
  }
  for (const value of Object.values(record)) {
    walkForReviews(value, out);
  }
}

export function extractAppStoreReviewsFromHtml(html: string): AppStoreSsrReview[] {
  const match = html.match(
    /<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]?.trim()) return [];

  try {
    const data = JSON.parse(match[1]) as unknown;
    const reviews: AppStoreSsrReview[] = [];
    walkForReviews(data, reviews);
    return reviews;
  } catch {
    return [];
  }
}

function reviewText(review: AppStoreSsrReview): string {
  const title = review.title?.trim() ?? "";
  const body = review.contents?.trim() ?? "";
  if (title && body) return `${title} — ${body}`;
  return body || title;
}

function toFetchedRow(
  review: AppStoreSsrReview,
  country: string,
  appId: number,
): FetchedReviewRow | null {
  const text = reviewText(review);
  if (text.length < 15) return null;

  const rating =
    typeof review.rating === "number" && review.rating >= 1 && review.rating <= 5
      ? review.rating
      : "";

  return {
    source: "appstore",
    text,
    rating,
    date: review.date ?? "",
    url: review.id
      ? `https://apps.apple.com/${country}/app/spotify-music-and-podcasts/id${appId}?see-all=reviews#review-${review.id}`
      : `https://apps.apple.com/${country}/app/spotify-music-and-podcasts/id${appId}`,
  };
}

async function fetchCountryPage(
  appId: number,
  slug: string,
  country: string,
): Promise<AppStoreSsrReview[]> {
  const url = `https://apps.apple.com/${country}/app/${slug}/id${appId}?see-all=reviews`;
  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeoutMs: 8_000,
    retries: 0,
  });
  if (!response.ok) {
    throw new Error(`App Store page returned ${response.status} for ${country}.`);
  }
  const html = await response.text();
  return extractAppStoreReviewsFromHtml(html);
}

function countriesForLimit(
  limit: number,
  countries: readonly string[],
): string[] {
  const needed = Math.min(
    countries.length,
    Math.max(2, Math.ceil(limit / 8)),
  );
  return countries.slice(0, needed);
}

export async function fetchAppStoreReviewsFromPages(options: {
  limit: number;
  countries: readonly string[];
  appId?: number;
  slug?: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  const appId = options.appId ?? SPOTIFY_APP_STORE_ID;
  const slug = options.slug ?? SPOTIFY_APP_STORE_SLUG;
  const minRating = options.minRating ?? 0;
  const deadline = Date.now() + getSourceFetchBudgetMs();
  const countryList = countriesForLimit(options.limit, options.countries);

  const rows: FetchedReviewRow[] = [];
  const seenIds = new Set<string>();

  const batches = await Promise.all(
    countryList.map(async (country) => {
      if (Date.now() > deadline) return [] as { id?: string; row: FetchedReviewRow }[];
      try {
        const pageReviews = await fetchCountryPage(appId, slug, country);
        const batch: { id?: string; row: FetchedReviewRow }[] = [];
        for (const review of pageReviews) {
          const row = toFetchedRow(review, country, appId);
          if (!row) continue;
          if (
            minRating > 0 &&
            typeof row.rating === "number" &&
            row.rating < minRating
          ) {
            continue;
          }
          batch.push({ id: review.id?.trim(), row });
        }
        return batch;
      } catch (error) {
        console.warn(
          `[fetch] appstore ${country}:`,
          error instanceof Error ? error.message : error,
        );
        return [] as { id?: string; row: FetchedReviewRow }[];
      }
    }),
  );

  for (const batch of batches) {
    for (const item of batch) {
      const id = item.id;
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      rows.push(item.row);
      if (rows.length >= options.limit) break;
    }
    if (rows.length >= options.limit) break;
  }

  return rows.slice(0, options.limit);
}
