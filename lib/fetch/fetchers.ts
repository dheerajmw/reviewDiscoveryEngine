import {
  APP_STORE_PAGE_COUNTRY_CODES,
  fetchAppStoreReviewsFromPages,
} from "./app-store-page";
import {
  getPullpushRequestTimeoutMs,
  getSourceFetchBudgetMs,
  isTightFetchBudget,
} from "./budget";
import {
  communityFetchPlan,
  DEFAULT_REDDIT_SUBREDDITS,
  GLOBAL_REGION_ID,
  parseRedditQueryInput,
  PULLPUSH_MAX_PAGES,
  redditFetchPlan,
  SPOTIFY_PLAY_ID,
  STORE_REGION_CODES,
  USER_AGENT,
} from "./config";
import { cleanSpotifyCommunityReviewText } from "../spotify-community-text";
import type {
  AppStoreSort,
  FetchedReviewRow,
  PlayStoreSort,
} from "./types";
import gplay from "google-play-scraper";
import {
  dedupeByText,
  fetchWithRetry,
  filterByMinRating,
  sleep,
} from "./utils";

const playScraper = (gplay as { default?: typeof gplay }).default ?? gplay;

async function fetchPlayStoreReviewsForRegion(options: {
  limit: number;
  sort: PlayStoreSort;
  country: string;
  minRating?: number;
  deadline?: number;
}): Promise<FetchedReviewRow[]> {
  const sortMap: Record<PlayStoreSort, number> = {
    newest: 2,
    rating: 3,
    helpful: 1,
  };

  const rows: FetchedReviewRow[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  let pages = 0;
  const maxPages = isTightFetchBudget() ? 2 : 12;

  while (rows.length < options.limit) {
    if (options.deadline && Date.now() > options.deadline) break;
    if (pages >= maxPages) break;

    const result = await playScraper.reviews({
      appId: SPOTIFY_PLAY_ID,
      lang: "en",
      country: options.country,
      sort: sortMap[options.sort],
      paginate: true,
      nextPaginationToken: token,
    });

    pages += 1;
    const data = result.data ?? [];
    if (!data.length) break;

    for (const review of data) {
      const text = review.text?.trim() ?? "";
      const key = text.toLowerCase().slice(0, 220);
      if (text.length < 15 || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        source: "playstore",
        text,
        rating: review.score ?? "",
        date: review.date ? String(review.date) : "",
        url: review.id
          ? `https://play.google.com/store/apps/details?id=${SPOTIFY_PLAY_ID}&reviewId=${review.id}`
          : "",
      });
      if (rows.length >= options.limit) break;
    }

    token = result.nextPaginationToken ?? undefined;
    if (!token) break;
  }

  return filterByMinRating(rows.slice(0, options.limit), options.minRating ?? 0);
}

export async function fetchPlayStoreReviews(options: {
  limit: number;
  sort: PlayStoreSort;
  region: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  const deadline = Date.now() + getSourceFetchBudgetMs();

  if (options.region === GLOBAL_REGION_ID) {
    const countries = isTightFetchBudget() ? ["us"] : STORE_REGION_CODES;
    const combined: FetchedReviewRow[] = [];
    for (const country of countries) {
      if (combined.length >= options.limit || Date.now() > deadline) break;
      const batch = await fetchPlayStoreReviewsForRegion({
        ...options,
        country,
        limit: options.limit - combined.length,
        deadline,
      });
      combined.push(...batch);
    }
    return dedupeByText(combined).slice(0, options.limit);
  }

  return fetchPlayStoreReviewsForRegion({
    ...options,
    country: options.region,
    deadline,
  });
}

async function fetchAppStoreReviewsForRegion(options: {
  limit: number;
  sort: AppStoreSort;
  country: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  void options.sort;
  const countries =
    options.country === GLOBAL_REGION_ID
      ? APP_STORE_PAGE_COUNTRY_CODES
      : [options.country];

  return fetchAppStoreReviewsFromPages({
    limit: options.limit,
    countries,
    minRating: options.minRating,
  });
}

export async function fetchAppStoreReviews(options: {
  limit: number;
  sort: AppStoreSort;
  region: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  if (options.region === GLOBAL_REGION_ID) {
    return fetchAppStoreReviewsFromPages({
      limit: options.limit,
      countries: APP_STORE_PAGE_COUNTRY_CODES,
      minRating: options.minRating,
    });
  }

  return fetchAppStoreReviewsForRegion({
    ...options,
    country: options.region,
  });
}

interface PullpushBudget {
  deadline: number;
  reserveRequest: () => boolean;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  shouldStop: () => boolean,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        if (shouldStop()) return;
        const item = items[next];
        next += 1;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

async function pullpushFetch<T>(
  type: "submission" | "comment",
  params: Record<string, string | number | undefined>,
  limit: number,
  mapRow: (item: T) => FetchedReviewRow | null,
  budget?: PullpushBudget,
): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  let before: number | undefined;
  let pages = 0;

  while (rows.length < limit && pages < PULLPUSH_MAX_PAGES) {
    if (budget && Date.now() > budget.deadline) break;
    if (budget && !budget.reserveRequest()) break;

    const requestTimeoutMs = Math.min(
      getPullpushRequestTimeoutMs(),
      budget ? Math.max(1_000, budget.deadline - Date.now()) : getPullpushRequestTimeoutMs(),
    );
    if (budget && requestTimeoutMs < 1_000) break;

    const url = new URL(`https://api.pullpush.io/reddit/search/${type}/`);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
    url.searchParams.set("size", String(Math.min(100, limit - rows.length)));
    if (before) url.searchParams.set("before", String(before));

    let response: Response;
    try {
      response = await fetchWithRetry(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
        timeoutMs: requestTimeoutMs,
        retries: 0,
      });
    } catch {
      break;
    }

    if (!response.ok) break;

    const json = (await response.json()) as { data?: T[] };
    const data = json.data ?? [];
    pages += 1;
    if (!data.length) break;

    for (const item of data) {
      const row = mapRow(item);
      if (row) rows.push(row);
      if (rows.length >= limit) break;
    }

    before = (data[data.length - 1] as { created_utc?: number })?.created_utc;
    if (!before) break;
    await sleep(300);
  }

  return rows;
}

function mapRedditComment(
  comment: {
    body?: string;
    created_utc?: number;
    permalink?: string;
  },
): FetchedReviewRow | null {
  const text = comment.body?.trim() ?? "";
  if (text.length < 25 || text === "[deleted]" || text === "[removed]") {
    return null;
  }
  return {
    source: "reddit",
    text,
    rating: "",
    date: comment.created_utc
      ? new Date(comment.created_utc * 1000).toISOString()
      : "",
    url: comment.permalink ? `https://reddit.com${comment.permalink}` : "",
  };
}

export async function fetchRedditReviews(options: {
  limit: number;
  query?: string;
}): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  const seen = new Set<string>();

  const add = (row: FetchedReviewRow | null) => {
    if (!row?.text) return;
    const key = row.text.toLowerCase().slice(0, 220);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const subreddits = [...DEFAULT_REDDIT_SUBREDDITS];
  const queries = parseRedditQueryInput(options.query);
  const budgetMs = getSourceFetchBudgetMs();
  const plan = redditFetchPlan(options.limit, queries.length, budgetMs);
  const deadline = Date.now() + budgetMs;
  let apiRequests = 0;
  const budget: PullpushBudget = {
    deadline,
    reserveRequest: () => {
      if (apiRequests >= plan.maxApiRequests) return false;
      apiRequests += 1;
      return true;
    },
  };

  const remaining = () => Math.max(0, options.limit - rows.length);
  const shouldStop = () => rows.length >= options.limit || Date.now() > deadline;

  await runWithConcurrency(
    queries.slice(0, plan.maxQueries),
    budgetMs <= 12_000 ? 2 : 3,
    async (query) => {
      const batch = await pullpushFetch(
        "comment",
        { q: `spotify ${query}` },
        Math.min(plan.perQueryBatch, remaining()),
        mapRedditComment,
        budget,
      );
      batch.forEach(add);
    },
    shouldStop,
  );

  await runWithConcurrency(
    subreddits.slice(0, plan.subredditCommentCount),
    2,
    async (sub) => {
      const batch = await pullpushFetch(
        "comment",
        { subreddit: sub },
        Math.min(plan.perSubCommentBatch, remaining()),
        mapRedditComment,
        budget,
      );
      batch.forEach(add);
    },
    shouldStop,
  );

  await runWithConcurrency(
    subreddits.slice(0, plan.subredditSubmissionCount),
    2,
    async (sub) => {
      const batch = await pullpushFetch(
        "submission",
        { subreddit: sub },
        Math.min(plan.perSubSubmissionBatch, remaining()),
        (submission: {
          title?: string;
          selftext?: string;
          removed_by_category?: string;
          created_utc?: number;
          permalink?: string;
        }) => {
          const text = [submission.title, submission.selftext]
            .filter(Boolean)
            .join(" — ")
            .trim();
          if (text.length < 20 || submission.removed_by_category) return null;
          return {
            source: "reddit",
            text,
            rating: "",
            date: submission.created_utc
              ? new Date(submission.created_utc * 1000).toISOString()
              : "",
            url: submission.permalink
              ? `https://reddit.com${submission.permalink}`
              : `https://reddit.com/r/${sub}`,
          };
        },
        budget,
      );
      batch.forEach(add);
    },
    shouldStop,
  );

  return dedupeByText(rows).slice(0, options.limit);
}

async function fetchJinaMarkdown(targetUrl: string): Promise<string> {
  if (!/^https?:\/\//i.test(targetUrl)) {
    throw new Error("Invalid community board URL.");
  }

  const readerUrl = `https://r.jina.ai/${targetUrl}`;
  const response = await fetchWithRetry(readerUrl, {
    headers: { "User-Agent": USER_AGENT },
    timeoutMs: Math.min(8_000, getPullpushRequestTimeoutMs() + 2_000),
    retries: 0,
  });
  if (!response.ok) {
    throw new Error(`Community reader returned ${response.status}.`);
  }
  return response.text();
}

function parseCommunityBoardMarkdown(markdown: string) {
  const threads: { url: string; text: string }[] = [];
  const blocks = markdown.split(/^## /m).slice(1);

  for (const block of blocks) {
    const titleMatch = block.match(
      /^\[([^\]]+)\]\((https:\/\/community\.spotify\.com[^\s)]+)/,
    );
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/^[^_]*_+/, "").trim();
    const url = titleMatch[2];
    const body = block
      .replace(/^\[[^\]]+\]\([^)]+\)\s*/, "")
      .split(/\n## /)[0]
      .replace(/\*\*\d+\*\* Views/g, "")
      .replace(/\*\*\d+\*\* likes/g, "")
      .replace(/Plan\s+\w+/gi, "")
      .replace(/\n{3,}/g, "\n")
      .trim();

    const text = cleanSpotifyCommunityReviewText(
      body.length > 40
        ? `${title}. ${body}`.replace(/\s+/g, " ").trim()
        : title,
    );
    if (text.length < 25) continue;

    threads.push({ url, text: text.slice(0, 2000) });
  }

  return threads;
}

export async function fetchSpotifyCommunityReviews(options: {
  limit: number;
}): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  const budgetMs = getSourceFetchBudgetMs();
  const deadline = Date.now() + budgetMs;
  const plan = communityFetchPlan(options.limit, budgetMs);
  const boards = [
    "https://community.spotify.com/t5/Content-Questions/bd-p/content",
    "https://community.spotify.com/t5/Your-Library/bd-p/yourlibrary",
    "https://community.spotify.com/t5/iOS-iPhone-iPad/bd-p/spotifyiOS",
    "https://community.spotify.com/t5/Android/bd-p/spotifyandroid",
    "https://community.spotify.com/t5/Desktop-Windows/bd-p/desktop_windows",
    "https://community.spotify.com/t5/Music-Discussion/bd-p/music_discussion",
    "https://community.spotify.com/t5/Discovery-Promo/bd-p/discovery_and_promo",
    "https://community.spotify.com/t5/Accounts/bd-p/spotifyaccountrelated",
  ].slice(0, plan.maxBoards);

  for (const board of boards) {
    if (rows.length >= options.limit || Date.now() > deadline) break;
    for (
      let page = 1;
      page <= plan.maxPagesPerBoard && rows.length < options.limit;
      page++
    ) {
      if (Date.now() > deadline) break;
      const url =
        page === 1 ? board : `${board}/page/${page}?sort_by=-topicPostDate`;
      try {
        const markdown = await fetchJinaMarkdown(url);
        const threads = parseCommunityBoardMarkdown(markdown);
        if (!threads.length) break;
        for (const thread of threads) {
          rows.push({
            source: "spotify-community",
            text: thread.text,
            rating: "",
            date: "",
            url: thread.url,
          });
          if (rows.length >= options.limit) break;
        }
      } catch {
        break;
      }
      if (page < plan.maxPagesPerBoard) {
        await sleep(plan.sleepMs);
      }
    }
  }

  return dedupeByText(rows).slice(0, options.limit);
}

export async function fetchSocialMediaReviews(options: {
  limit: number;
}): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  const deadline = Date.now() + getSourceFetchBudgetMs();
  const tight = getSourceFetchBudgetMs() <= 12_000;
  const blueskyQueries = [
    "spotify recommendations",
    "spotify discover weekly",
    "spotify algorithm",
    "spotify discovery",
    "spotify playlist",
    "spotify radio",
    "spotify wrapped",
    "spotify daily mix",
  ].slice(0, tight ? 3 : 8);

  for (const query of blueskyQueries) {
    if (rows.length >= options.limit || Date.now() > deadline) break;
    try {
      const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=25`;
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) continue;
      const json = (await response.json()) as {
        posts?: Array<{
          uri?: string;
          author?: { handle?: string };
          record?: { text?: string; createdAt?: string };
        }>;
      };

      for (const post of json.posts ?? []) {
        const text = post.record?.text?.trim() ?? "";
        if (text.length < 25) continue;
        const uri = post.uri ?? "";
        const handle = post.author?.handle ?? "user";
        const rkey = uri.split("/").pop();
        rows.push({
          source: "social-media",
          text,
          rating: "",
          date: post.record?.createdAt ?? "",
          url: rkey
            ? `https://bsky.app/profile/${handle}/post/${rkey}`
            : `https://bsky.app/profile/${handle}`,
        });
      }
      await sleep(500);
    } catch {
      /* continue */
    }
  }

  const hnQueries = [
    "spotify%20recommendations",
    "spotify%20discovery",
    "spotify%20algorithm",
    "discover%20weekly%20spotify",
  ].slice(0, tight ? 2 : 4);
  for (const query of hnQueries) {
    if (rows.length >= options.limit || Date.now() > deadline) break;
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=comment&hitsPerPage=50`;
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) continue;
      const json = (await response.json()) as {
        hits?: Array<{
          comment_text?: string;
          created_at?: string;
          story_url?: string;
          objectID?: string;
        }>;
      };

      for (const hit of json.hits ?? []) {
        const text = hit.comment_text?.replace(/<[^>]+>/g, " ").trim() ?? "";
        if (text.length < 25) continue;
        rows.push({
          source: "social-media",
          text,
          rating: "",
          date: hit.created_at ?? "",
          url:
            hit.story_url ??
            `https://news.ycombinator.com/item?id=${hit.objectID}`,
        });
      }
      await sleep(400);
    } catch {
      /* continue */
    }
  }

  const instances = [
    "https://mastodon.social",
    "https://mas.to",
    "https://mstdn.social",
  ].slice(0, tight ? 1 : 3);
  const mastodonQueries = ["spotify recommendations", "spotify discovery"].slice(
    0,
    tight ? 1 : 2,
  );
  for (const instance of instances) {
    for (const query of mastodonQueries) {
      if (rows.length >= options.limit || Date.now() > deadline) break;
      try {
        const url = `${instance}/api/v2/search?q=${encodeURIComponent(query)}&type=statuses&limit=30`;
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (!response.ok) continue;
        const json = (await response.json()) as {
          statuses?: Array<{ content?: string; created_at?: string; url?: string }>;
        };

        for (const status of json.statuses ?? []) {
          const text = (status.content ?? "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (text.length < 25) continue;
          rows.push({
            source: "social-media",
            text,
            rating: "",
            date: status.created_at ?? "",
            url: status.url ?? "",
          });
        }
        await sleep(500);
      } catch {
        /* continue */
      }
    }
  }

  return dedupeByText(rows).slice(0, options.limit);
}
