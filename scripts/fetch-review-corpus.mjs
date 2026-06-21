/**
 * One-off corpus fetcher — NOT part of app runtime.
 * Run: node scripts/fetch-review-corpus.mjs
 * Output: docs/review-corpus/*.csv
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/review-corpus");

const TARGETS = {
  playstore: 600,
  appstore: 600,
  reddit: 500,
  "spotify-community": 300,
  "social-media": 300,
};

const SPOTIFY_PLAY_ID = "com.spotify.music";
const SPOTIFY_APP_STORE_ID = 324684580;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ReviewDiscoveryEngine/1.0; research)";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(value) {
  const s = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${s.replace(/"/g, '""')}"`;
}

function writeCsv(filename, rows) {
  const header = "source,text,rating,date,url\n";
  const body = rows
    .map((r) =>
      [
        csvEscape(r.source),
        csvEscape(r.text),
        csvEscape(r.rating ?? ""),
        csvEscape(r.date ?? ""),
        csvEscape(r.url ?? ""),
      ].join(","),
    )
    .join("\n");
  writeFileSync(join(OUT_DIR, filename), header + body + "\n", "utf8");
}

function dedupeByText(rows, minLen = 15) {
  const seen = new Set();
  return rows.filter((r) => {
    const text = (r.text ?? "").trim();
    const key = text.toLowerCase().slice(0, 220);
    if (text.length < minLen || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchPlayStore(limit) {
  console.log(`Fetching Play Store (target ${limit})...`);
  const gplay = await import("google-play-scraper");
  const scraper = gplay.default ?? gplay;
  const rows = [];
  const seen = new Set();
  let token = null;

  while (rows.length < limit) {
    const result = await scraper.reviews({
      appId: SPOTIFY_PLAY_ID,
      lang: "en",
      country: "us",
      sort: scraper.sort.NEWEST,
      paginate: true,
      nextPaginationToken: token,
    });
    const data = result.data ?? [];
    if (!data.length) break;

    for (const r of data) {
      const text = r.text?.trim() ?? "";
      const key = text.toLowerCase().slice(0, 220);
      if (text.length < 15 || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        source: "playstore",
        text,
        rating: r.score ?? "",
        date: r.date ?? "",
        url: r.id
          ? `https://play.google.com/store/apps/details?id=${SPOTIFY_PLAY_ID}&reviewId=${r.id}`
          : "",
      });
      if (rows.length >= limit) break;
    }

    token = result.nextPaginationToken;
    if (!token) break;
  }

  return rows.slice(0, limit);
}

async function fetchAppStore(limit) {
  console.log(`Fetching App Store (target ${limit})...`);
  const store = await import("app-store-scraper");
  const scraper = store.default ?? store;
  const rows = [];

  for (let page = 1; page <= 12 && rows.length < limit; page++) {
    try {
      const reviews = await scraper.reviews({
        id: SPOTIFY_APP_STORE_ID,
        country: "us",
        page,
        sort: scraper.sort.RECENT,
      });
      if (!reviews?.length) break;
      for (const r of reviews) {
        rows.push({
          source: "appstore",
          text: r.text?.trim() ?? "",
          rating: r.score ?? "",
          date: r.updated ?? r.date ?? "",
          url: r.url ?? "",
        });
      }
    } catch (err) {
      console.warn(`  appstore page ${page}:`, err.message);
      break;
    }
    await sleep(600);
  }

  return dedupeByText(rows.filter((r) => r.text.length >= 15)).slice(0, limit);
}

async function pullpushFetch(type, params, limit, mapRow) {
  const rows = [];
  let before = undefined;

  while (rows.length < limit) {
    const url = new URL(`https://api.pullpush.io/reddit/search/${type}/`);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") url.searchParams.set(k, String(v));
    }
    url.searchParams.set("size", Math.min(100, limit - rows.length));
    if (before) url.searchParams.set("before", String(before));

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`Pullpush ${res.status}`);
    const json = await res.json();
    const data = json.data ?? [];
    if (!data.length) break;

    for (const item of data) {
      const row = mapRow(item);
      if (row) rows.push(row);
      if (rows.length >= limit) break;
    }

    before = data[data.length - 1]?.created_utc;
    if (!before) break;
    await sleep(400);
  }

  return rows;
}

async function fetchReddit(limit) {
  console.log(`Fetching Reddit via Pullpush (target ${limit})...`);
  const rows = [];
  const seen = new Set();

  const add = (row) => {
    if (!row?.text) return;
    const key = row.text.toLowerCase().slice(0, 220);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const subreddits = [
    "spotify",
    "truespotify",
    "SpotifyPlaylists",
    "LetsTalkMusic",
    "music",
  ];
  const queries = [
    "discover weekly",
    "recommendations",
    "algorithm",
    "discovery",
    "radio",
    "playlist",
    "recommend",
    "wrapped",
    "daily mix",
  ];

  for (const sub of subreddits) {
    if (rows.length >= limit) break;
    try {
      const batch = await pullpushFetch(
        "submission",
        { subreddit: sub },
        Math.min(80, limit - rows.length),
        (s) => {
          const text = [s.title, s.selftext].filter(Boolean).join(" — ").trim();
          if (text.length < 20 || s.removed_by_category) return null;
          return {
            source: "reddit",
            text,
            rating: "",
            date: s.created_utc
              ? new Date(s.created_utc * 1000).toISOString()
              : "",
            url: s.permalink
              ? `https://reddit.com${s.permalink}`
              : `https://reddit.com/r/${sub}`,
          };
        },
      );
      batch.forEach(add);
    } catch (err) {
      console.warn(`  submissions r/${sub}:`, err.message);
    }
  }

  for (const q of queries) {
    if (rows.length >= limit) break;
    try {
      const batch = await pullpushFetch(
        "comment",
        { q: `spotify ${q}` },
        Math.min(40, limit - rows.length),
        (c) => {
          const text = c.body?.trim() ?? "";
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
            date: c.created_utc
              ? new Date(c.created_utc * 1000).toISOString()
              : "",
            url: c.permalink
              ? `https://reddit.com${c.permalink}`
              : "",
          };
        },
      );
      batch.forEach(add);
    } catch (err) {
      console.warn(`  comments q="${q}":`, err.message);
    }
  }

  for (const sub of ["spotify", "truespotify"]) {
    if (rows.length >= limit) break;
    try {
      const batch = await pullpushFetch(
        "comment",
        { subreddit: sub },
        Math.min(60, limit - rows.length),
        (c) => {
          const text = c.body?.trim() ?? "";
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
            date: c.created_utc
              ? new Date(c.created_utc * 1000).toISOString()
              : "",
            url: c.permalink
              ? `https://reddit.com${c.permalink}`
              : "",
          };
        },
      );
      batch.forEach(add);
    } catch (err) {
      console.warn(`  comments r/${sub}:`, err.message);
    }
  }

  return dedupeByText(rows).slice(0, limit);
}

async function fetchJinaMarkdown(targetUrl) {
  const proxyUrl = `https://r.jina.ai/${targetUrl}`;
  const res = await fetch(proxyUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  return res.text();
}

function parseCommunityBoardMarkdown(markdown) {
  const threads = [];
  const blocks = markdown.split(/^## /m).slice(1);

  for (const block of blocks) {
    const titleMatch = block.match(
      /^\[([^\]]+)\]\((https:\/\/community\.spotify\.com[^\s)]+)/,
    );
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/^[^_]*_+/, "").trim();
    const url = titleMatch[1].includes("](https")
      ? titleMatch[2]
      : titleMatch[2];
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

    threads.push({ title, url, text: text.slice(0, 2000) });
  }

  return threads;
}

async function fetchSpotifyCommunity(limit) {
  console.log(`Fetching Spotify Community via Jina proxy (max ${limit})...`);
  const rows = [];
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
    if (rows.length >= limit) break;
    for (let page = 1; page <= 6 && rows.length < limit; page++) {
      const url =
        page === 1 ? board : `${board}/page/${page}?sort_by=-topicPostDate`;
      try {
        const md = await fetchJinaMarkdown(url);
        const threads = parseCommunityBoardMarkdown(md);
        if (!threads.length) break;
        for (const t of threads) {
          rows.push({
            source: "spotify-community",
            text: t.text,
            rating: "",
            date: "",
            url: t.url,
          });
          if (rows.length >= limit) break;
        }
      } catch (err) {
        console.warn(`  community ${url}:`, err.message);
        break;
      }
      await sleep(1200);
    }
  }

  return dedupeByText(rows).slice(0, limit);
}

async function fetchSocialMedia(limit) {
  console.log(`Fetching social media (max ${limit})...`);
  const rows = [];

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

  for (const q of blueskyQueries) {
    if (rows.length >= limit) break;
    try {
      const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25`;
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) continue;
      const json = await res.json();
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
    } catch (err) {
      console.warn(`  bluesky "${q}":`, err.message);
    }
  }

  try {
    const hnPages = [
      "spotify%20recommendations",
      "spotify%20discovery",
      "spotify%20algorithm",
      "discover%20weekly%20spotify",
    ];
    for (const q of hnPages) {
      if (rows.length >= limit) break;
      const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=comment&hitsPerPage=50`;
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) continue;
      const json = await res.json();
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
    }
  } catch (err) {
    console.warn("  HN:", err.message);
  }

  const instances = [
    "https://mastodon.social",
    "https://mas.to",
    "https://mstdn.social",
  ];
  const mastodonQueries = ["spotify recommendations", "spotify discovery"];
  for (const instance of instances) {
    for (const q of mastodonQueries) {
      if (rows.length >= limit) break;
      try {
        const url = `${instance}/api/v2/search?q=${encodeURIComponent(q)}&type=statuses&limit=30`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) continue;
        const json = await res.json();
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
        /* skip */
      }
    }
  }

  return dedupeByText(rows).slice(0, limit);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const playstore = await fetchPlayStore(TARGETS.playstore);
  writeCsv("playstore.csv", playstore);
  console.log(`  → ${playstore.length} playstore`);

  const appstore = await fetchAppStore(TARGETS.appstore);
  writeCsv("appstore.csv", appstore);
  console.log(`  → ${appstore.length} appstore`);

  const reddit = await fetchReddit(TARGETS.reddit);
  writeCsv("reddit.csv", reddit);
  console.log(`  → ${reddit.length} reddit`);

  const community = await fetchSpotifyCommunity(TARGETS["spotify-community"]);
  writeCsv("spotify-community.csv", community);
  console.log(`  → ${community.length} spotify-community`);

  const social = await fetchSocialMedia(TARGETS["social-media"]);
  writeCsv("social-media.csv", social);
  console.log(`  → ${social.length} social-media`);

  const all = [...playstore, ...appstore, ...reddit, ...community, ...social];
  writeCsv("all-reviews.csv", all);

  const summary = {
    playstore: playstore.length,
    appstore: appstore.length,
    reddit: reddit.length,
    "spotify-community": community.length,
    "social-media": social.length,
    total: all.length,
  };

  const readme = `# Spotify Review Corpus

Fetched for Review Discovery Engine research (not wired into app runtime).

| File | Target | Fetched |
|------|--------|---------|
| playstore.csv | ${TARGETS.playstore} | ${summary.playstore} |
| appstore.csv | ${TARGETS.appstore} | ${summary.appstore} |
| reddit.csv | ${TARGETS.reddit} | ${summary.reddit} |
| spotify-community.csv | ≤${TARGETS["spotify-community"]} | ${summary["spotify-community"]} |
| social-media.csv | ≤${TARGETS["social-media"]} | ${summary["social-media"]} |
| all-reviews.csv | combined | ${summary.total} |

## Columns
\`source,text,rating,date,url\`

## Sources
- **Play Store / App Store** — public store review scrapers (Spotify app)
- **Reddit** — [Pullpush](https://api.pullpush.io) archive API
- **Spotify Community** — community.spotify.com via reader proxy
- **Social** — Bluesky, Mastodon, Hacker News public APIs

## App import
Upload \`all-reviews.csv\` in the app (uses \`source\` + \`text\` columns).

Fetched: ${new Date().toISOString()}
`;
  writeFileSync(join(OUT_DIR, "README.md"), readme, "utf8");

  console.log("\nDone.", summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
