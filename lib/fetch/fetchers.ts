import {
  DEFAULT_REDDIT_SUBREDDITS,
  GLOBAL_REGION_ID,
  parseRedditQueryInput,
  SPOTIFY_APP_STORE_ID,
  SPOTIFY_PLAY_ID,
  STORE_REGION_CODES,
  USER_AGENT,
} from "./config";
import type {
  AppStoreSort,
  FetchedReviewRow,
  PlayStoreSort,
} from "./types";
import { dedupeByText, filterByMinRating, sleep } from "./utils";

async function fetchPlayStoreReviewsForRegion(options: {
  limit: number;
  sort: PlayStoreSort;
  country: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  const gplay = await import("google-play-scraper");
  const scraper = gplay.default ?? gplay;

  const sortMap: Record<PlayStoreSort, number> = {
    newest: 2,
    rating: 3,
    helpful: 1,
  };

  const rows: FetchedReviewRow[] = [];
  const seen = new Set<string>();
  let token: string | undefined;

  while (rows.length < options.limit) {
    const result = await scraper.reviews({
      appId: SPOTIFY_PLAY_ID,
      lang: "en",
      country: options.country,
      sort: sortMap[options.sort],
      paginate: true,
      nextPaginationToken: token,
    });

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
  if (options.region === GLOBAL_REGION_ID) {
    const combined: FetchedReviewRow[] = [];
    for (const country of STORE_REGION_CODES) {
      if (combined.length >= options.limit) break;
      const batch = await fetchPlayStoreReviewsForRegion({
        ...options,
        country,
        limit: options.limit - combined.length,
      });
      combined.push(...batch);
    }
    return dedupeByText(combined).slice(0, options.limit);
  }

  return fetchPlayStoreReviewsForRegion({
    ...options,
    country: options.region,
  });
}

async function fetchAppStoreReviewsForRegion(options: {
  limit: number;
  sort: AppStoreSort;
  country: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  const store = await import("app-store-scraper");
  const scraper = store.default ?? store;
  const sort =
    options.sort === "helpful" ? "mostHelpful" : "mostRecent";

  const rows: FetchedReviewRow[] = [];

  for (let page = 1; page <= 12 && rows.length < options.limit; page++) {
    try {
      const reviews = await scraper.reviews({
        id: SPOTIFY_APP_STORE_ID,
        country: options.country,
        page,
        sort,
      });
      if (!reviews?.length) break;

      for (const review of reviews) {
        rows.push({
          source: "appstore",
          text: review.text?.trim() ?? "",
          rating: review.score ?? "",
          date: review.updated ?? review.date ?? "",
          url: review.url ?? "",
        });
      }
    } catch {
      break;
    }
    await sleep(600);
  }

  return filterByMinRating(
    dedupeByText(rows.filter((row) => row.text.length >= 15)).slice(
      0,
      options.limit,
    ),
    options.minRating ?? 0,
  );
}

export async function fetchAppStoreReviews(options: {
  limit: number;
  sort: AppStoreSort;
  region: string;
  minRating?: number;
}): Promise<FetchedReviewRow[]> {
  if (options.region === GLOBAL_REGION_ID) {
    const combined: FetchedReviewRow[] = [];
    for (const country of STORE_REGION_CODES) {
      if (combined.length >= options.limit) break;
      const batch = await fetchAppStoreReviewsForRegion({
        ...options,
        country,
        limit: options.limit - combined.length,
      });
      combined.push(...batch);
    }
    return dedupeByText(combined).slice(0, options.limit);
  }

  return fetchAppStoreReviewsForRegion({
    ...options,
    country: options.region,
  });
}

async function pullpushFetch<T>(
  type: "submission" | "comment",
  params: Record<string, string | number | undefined>,
  limit: number,
  mapRow: (item: T) => FetchedReviewRow | null,
): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  let before: number | undefined;

  while (rows.length < limit) {
    const url = new URL(`https://api.pullpush.io/reddit/search/${type}/`);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
    url.searchParams.set("size", String(Math.min(100, limit - rows.length)));
    if (before) url.searchParams.set("before", String(before));

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Reddit archive API returned ${response.status}.`);
    }

    const json = (await response.json()) as { data?: T[] };
    const data = json.data ?? [];
    if (!data.length) break;

    for (const item of data) {
      const row = mapRow(item);
      if (row) rows.push(row);
      if (rows.length >= limit) break;
    }

    before = (data[data.length - 1] as { created_utc?: number })?.created_utc;
    if (!before) break;
    await sleep(400);
  }

  return rows;
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

  for (const sub of subreddits) {
    if (rows.length >= options.limit) break;
    try {
      const batch = await pullpushFetch(
        "submission",
        { subreddit: sub },
        Math.min(80, options.limit - rows.length),
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
      );
      batch.forEach(add);
    } catch {
      /* continue other subreddits */
    }
  }

  for (const query of queries) {
    if (rows.length >= options.limit) break;
    try {
      const batch = await pullpushFetch(
        "comment",
        { q: `spotify ${query}` },
        Math.min(40, options.limit - rows.length),
        (comment: {
          body?: string;
          created_utc?: number;
          permalink?: string;
        }) => {
          const text = comment.body?.trim() ?? "";
          if (
            text.length < 25 ||
            text === "[deleted]" ||
            text === "[removed]"
          ) {
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
        },
      );
      batch.forEach(add);
    } catch {
      /* continue */
    }
  }

  for (const sub of DEFAULT_REDDIT_SUBREDDITS.slice(0, 2)) {
    if (rows.length >= options.limit) break;
    try {
      const batch = await pullpushFetch(
        "comment",
        { subreddit: sub },
        Math.min(60, options.limit - rows.length),
        (comment: {
          body?: string;
          created_utc?: number;
          permalink?: string;
        }) => {
          const text = comment.body?.trim() ?? "";
          if (
            text.length < 25 ||
            text === "[deleted]" ||
            text === "[removed]"
          ) {
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
        },
      );
      batch.forEach(add);
    } catch {
      /* continue */
    }
  }

  return dedupeByText(rows).slice(0, options.limit);
}

async function fetchJinaMarkdown(targetUrl: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${targetUrl}`, {
    headers: { "User-Agent": USER_AGENT },
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

    const text =
      body.length > 40
        ? `${title}. ${body}`.replace(/\s+/g, " ").trim()
        : title;
    if (text.length < 25) continue;

    threads.push({ url, text: text.slice(0, 2000) });
  }

  return threads;
}

export async function fetchSpotifyCommunityReviews(options: {
  limit: number;
}): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  const boards = [
    "https://community.spotify.com/t5/Content-Questions/bd-p/content",
    "https://community.spotify.com/t5/Your-Library/bd-p/yourlibrary",
    "https://community.spotify.com/t5/iOS-iPhone-iPad/bd-p/spotifyiOS",
    "https://community.spotify.com/t5/Android/bd-p/spotifyandroid",
    "https://community.spotify.com/t5/Desktop-Windows/bd-p/desktop_windows",
    "https://community.spotify.com/t5/Music-Discussion/bd-p/music_discussion",
    "https://community.spotify.com/t5/Discovery-Promo/bd-p/discovery_and_promo",
    "https://community.spotify.com/t5/Accounts/bd-p/spotifyaccountrelated",
  ];

  for (const board of boards) {
    if (rows.length >= options.limit) break;
    for (let page = 1; page <= 6 && rows.length < options.limit; page++) {
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
      await sleep(1200);
    }
  }

  return dedupeByText(rows).slice(0, options.limit);
}

export async function fetchSocialMediaReviews(options: {
  limit: number;
}): Promise<FetchedReviewRow[]> {
  const rows: FetchedReviewRow[] = [];
  const blueskyQueries = [
    "spotify recommendations",
    "spotify discover weekly",
    "spotify algorithm",
    "spotify discovery",
    "spotify playlist",
    "spotify radio",
    "spotify wrapped",
    "spotify daily mix",
  ];

  for (const query of blueskyQueries) {
    if (rows.length >= options.limit) break;
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
  ];
  for (const query of hnQueries) {
    if (rows.length >= options.limit) break;
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
  ];
  const mastodonQueries = ["spotify recommendations", "spotify discovery"];
  for (const instance of instances) {
    for (const query of mastodonQueries) {
      if (rows.length >= options.limit) break;
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
