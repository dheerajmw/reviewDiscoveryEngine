# ReviewLens

Spotify review intelligence for product managers — fetch public reviews, curate discovery-related evidence, classify with Gemini, and explore findings in an interactive dashboard.

**Scope:** Music discovery, recommendations, playlists, repetition, and exploration. Not billing, login, crashes, or generic app praise.

---

## Research questions

The pipeline is designed to answer these six PM assignment questions:

1. **Why do users struggle to discover new music?**
2. **What are the most common frustrations with recommendations?**
3. **What listening behaviors are users trying to achieve?**
4. **What causes users to repeatedly listen to the same content?**
5. **Which user segments experience different discovery challenges?**
6. **What unmet needs emerge consistently across reviews?**

---

## Capabilities

### Data ingestion

- **Live fetch** from Google Play, App Store, Reddit, Spotify Community, and social sources (Hacker News, etc.)
- **CSV upload** (`source`, `text` columns)
- **Bundled corpora** under `docs/review-corpus/` (`all-reviews.csv`, `playstore.csv`, `reddit.csv`, …)

### PM preprocessing & curation

- HTML entity decoding, text normalization, deduplication
- Noise categorization: technical, billing, ads, praise, discovery, mixed
- Explicit + implicit discovery signal detection (including repetition / sameness without saying “recommendation”)
- Discovery outcome (`successful` / `failed` / `neutral` / `unknown`) and user-goal hints
- Keeps **all** unique reviews for audit; only `discovery_relevant` rows proceed to classification

### Research-grade classification (Gemini or mock)

Five-step analyst flow per review:

1. **Research relevance** — filters generic praise / low-value text
2. **Question mapping** — which of the six research questions the review supports
3. **Evidence extraction** — PM observation + short verbatim quote
4. **User goal** — e.g. find new artists, explore genres, refresh playlists
5. **Taxonomy classification** — theme, barrier, behavior, emotion, segment, root_cause, unmet_need (independent fields, no theme→root_cause shortcuts)

Classification is batched, rate-limited, and **cached in Turso** by content hash.

### Evidence & findings (deterministic)

- Full-corpus **aggregation**: frequencies, cross-tabs (segment × theme/barrier/unmet_need), quote clusters
- **Research findings** with evidence-backed summaries and linked quotes for each question
- **Product opportunities** derived from top unmet-need clusters

### Dashboard & exploration

- Interactive dashboard with filters (source, confidence), charts, findings, barriers, opportunities
- **Evidence review list** — all matched classified reviews with metadata
- **Export**: Markdown, JSON, classified CSV, PM research report (MD / JSON / PDF)
- **Grounded chat assistant** — answers only from stored evidence and findings
- **Research repository** — save, reopen, and compare past runs
- **Quote explorer** — search quotes from saved runs

### Demo mode

- `USE_MOCK_CLASSIFIER=true` or automatic fallback when Gemini is unavailable
- Sidebar indicator when demo/mock classification is active

---

## Complete workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. INGEST                                                      │
│     Live fetch │ CSV upload │ Bundled corpus                    │
│     → RawReview[] { source, text }                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PREPROCESS & CURATE  (POST /api/curate-reviews)             │
│     Normalize → categorize noise → discovery relevance          │
│     → outcome + user_goal + metadata                            │
│     included[] = discovery_relevant                             │
│     records[]  = all unique reviews (audit)                     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CLASSIFY  (POST /api/classify, batched)                     │
│     Research relevance → question mapping → evidence              │
│     → user goal → taxonomy tags                                 │
│     → ClassifiedReview[]                                        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AGGREGATE  (POST /api/aggregate)                            │
│     Frequencies, cross-tabs, quote clusters                     │
│     (discovery_relevant reviews only)                           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. FINDINGS  (POST /api/findings)                              │
│     Six research answers + evidence-backed quotes               │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. PERSIST  (POST /api/runs → Turso)                            │
│     Redirect to /runs/{id}                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. EXPLORE                                                     │
│     Dashboard │ Export │ Chat │ Repository │ Compare │ Quotes   │
└─────────────────────────────────────────────────────────────────┘
```

### UI pipeline states

`idle` → `fetching` / `parsing` → `curating` → `uploaded` → `classifying` → `aggregating` → `saving` → dashboard

If cleanup finds zero discovery-relevant reviews: `curation_empty` → guided return to upload.

### User journeys

| Route | Purpose |
|-------|---------|
| `/` | New analysis — fetch, import, cleanup preview, analyze |
| `/runs/{id}` | Dashboard for a saved run |
| `/history` | Research repository (all runs) |
| `/runs/compare` | Compare two runs |
| `/runs/{id}/quotes` | Quote explorer |

---

## Evidence vs interpretation

| Layer | Mechanism | Auditable? |
|-------|-----------|------------|
| **Aggregation & findings** | Deterministic counts and quote linking | Yes |
| **Classification** | Gemini LLM (or rule-based mock) with extracted evidence | Per-review quotes + confidence |
| **Chat** | LLM grounded in saved evidence context | Citations from corpus |

There is no separate LLM “insights” API — narrative summaries come from **findings + dashboard**, not a second generative pass.

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **LLM:** Groq (`meta-llama/llama-4-scout-17b-16e-instruct` by default) for classification and chat
- **Database:** Turso (libSQL) — runs, reviews, classifications, quote cache
- **Styling:** Tailwind CSS v4

---

## Getting started

### Prerequisites

- Node.js 20+
- [Groq API key](https://console.groq.com) (optional if using mock mode)
- Turso database (optional — defaults to local `file:data/research.db`)

### Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local — at minimum set GROQ_API_KEY for live classification
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Recommended first run

1. Load a bundled corpus such as **`all-reviews.csv`** from the home page, or
2. Live-fetch with **Reddit + Spotify Community** included (better discovery language than store-only pulls)
3. Confirm **`USE_MOCK_CLASSIFIER=false`** for real LLM tags
4. Aim for **150–500 reviews fetched** → typically **25–200** kept after cleanup

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm test             # Preprocessing + classification unit tests
npm run evaluate     # Classification evaluation script
```

---

## Environment variables

See [`.env.local.example`](.env.local.example). Key variables:

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | `groq` (default) or `cerebras` |
| `GROQ_API_KEY` | Live LLM classification and chat (Groq) |
| `GROQ_MODEL` | Model slug (default `meta-llama/llama-4-scout-17b-16e-instruct`) |
| `LLM_DAILY_TOKEN_BUDGET` | Optional cap for quota-split UI (default `500000` TPD on Groq) |
| `LLM_REQUESTS_PER_DAY` | Daily request budget for split UI (default `1000` on Groq) |
| `LLM_CLASSIFY_BATCH_SIZE` | Reviews per LLM call (default `2`, auto-capped for output tokens) |
| `LLM_BATCH_DELAY_MS` | Delay floor between batches (auto from RPM + TPM) |
| `USE_MOCK_CLASSIFIER` | `true` = rule-based demo mode |
| `TURSO_DATABASE_URL` | Research repository (local file or remote) |
| `TURSO_AUTH_TOKEN` | Required for remote Turso |
| `FETCH_MAX_REVIEWS_PER_SOURCE` | Cap per live-fetch source |
| `CEREBRAS_API_KEY` | Optional — set `LLM_PROVIDER=cerebras` to use Cerebras instead |

---

## API overview

| Endpoint | Role |
|----------|------|
| `GET/POST /api/fetch-reviews` | Fetch config + live scrape |
| `GET /api/corpus` | Bundled CSV corpora |
| `POST /api/curate-reviews` | PM preprocessing / curation |
| `GET /api/classify/config` | Mock flag, batch limits |
| `POST /api/classify` | Batched research classification |
| `POST /api/aggregate` | Evidence aggregation |
| `POST /api/findings` | Six research findings |
| `POST/GET /api/runs` | Save / list analysis runs |
| `GET /api/runs/[id]` | Load a run |
| `POST /api/runs/compare` | Compare two runs |
| `GET /api/quotes` | Quote search |
| `POST /api/chat` | Grounded discovery assistant |

---

## Project structure (key paths)

```
app/                    # Next.js pages and API routes
components/
  upload/               # Fetch, CSV, curation UI
  dashboard/            # Charts, findings, evidence panels
lib/
  review-preprocessing/ # PM cleaning pipeline (Phases 1–6)
  review-curation.ts    # Curation orchestration
  classify*.ts          # LLM + mock classification
  aggregation.ts        # Evidence engine
  findings.ts           # Deterministic research answers
  fetch/                # Live review scrapers
services/               # Turso persistence, classification cache
docs/
  review-corpus/        # Sample CSV datasets
  PROJECT_BLUEPRINT.md  # Architecture notes
```

---

## Documentation

- [`docs/PROJECT_BLUEPRINT.md`](docs/PROJECT_BLUEPRINT.md) — architecture and pipeline design
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phased build plan
- [`docs/review-corpus/README.md`](docs/review-corpus/README.md) — bundled datasets

---

## License

Private / academic project — see repository owner for usage terms.
