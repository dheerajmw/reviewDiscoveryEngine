# Spotify Review Corpus

Fetched for ReviewLens research (not wired into app runtime).

| File | Target | Fetched |
|------|--------|---------|
| playstore.csv | 600 | 600 |
| appstore.csv | 600 | 441 |
| reddit.csv | 500 | 499 |
| spotify-community.csv | ≤300 | 265 |
| social-media.csv | ≤300 | 191 |
| all-reviews.csv | combined | 1996 |

## Columns
`source,text,rating,date,url`

## Sources
- **Play Store / App Store** — public store review scrapers (Spotify app)
- **Reddit** — [Pullpush](https://api.pullpush.io) archive API
- **Spotify Community** — community.spotify.com via reader proxy
- **Social** — Bluesky, Mastodon, Hacker News public APIs

## App import
Upload `all-reviews.csv` in the app (uses `source` + `text` columns).

Fetched: 2026-06-19T10:09:03.587Z
