# ReviewLens — Implementation Plan

> Maps [PROJECT_BLUEPRINT.md](./PROJECT_BLUEPRINT.md) to seven build phases.  
> Blueprint phases 4 (Root Cause) and 5 (Opportunity) are combined into **Phase 4: Insight Engine**.  
> Blueprint phase 6 (Dashboard) maps to **Phase 5: Dashboard UI**.  
> Blueprint phase 7 (Review Chatbot) maps to **Phase 6: Review Chatbot**.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | API routes + UI in one repo |
| Language | TypeScript | Shared types across pipeline |
| Styling | Tailwind CSS | Fast iteration on dashboard |
| CSV parsing | `papaparse` | Browser + server compatible |
| AI | OpenRouter API (`gpt-4o-mini` via OpenAI SDK) | Cost-effective classification + chat at scale |
| Charts | `recharts` | Simple bar/pie charts for distributions |
| State (MVP) | React context + in-memory | No DB needed for ~600 reviews |

---

## Target Directory Structure

```
reviewDiscoveryEngine/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Upload → pipeline → dashboard flow
│   ├── globals.css
│   └── api/
│       ├── classify/route.ts
│       ├── aggregate/route.ts
│       ├── findings/route.ts       # Deterministic research findings (6 PM questions)
│       ├── insights/route.ts
│       └── chat/route.ts
├── components/
│   ├── upload/
│   │   ├── FileUpload.tsx
│   │   └── UploadPreview.tsx
│   ├── dashboard/
│   │   ├── ThemeChart.tsx
│   │   ├── SegmentBreakdown.tsx
│   │   ├── BarrierAnalysis.tsx
│   │   ├── RootCauses.tsx
│   │   └── Opportunities.tsx
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── ChatMessage.tsx
│   │   └── SuggestedQuestions.tsx
│   └── ui/
│       ├── Card.tsx
│       ├── ProgressBar.tsx
│       └── LoadingState.tsx
├── lib/
│   ├── types.ts                    # Shared interfaces
│   ├── csv-parser.ts
│   ├── classify-prompt.ts
│   ├── aggregation.ts
│   ├── insights-prompt.ts
│   ├── chat-context.ts             # Build grounded context from pipeline output
│   └── chat-prompt.ts
├── data/
│   └── sample-reviews.csv          # Dev fixture (~10 rows)
├── docs/
│   └── review-corpus/              # Fetched review datasets (not app runtime)
├── .env.local                      # OPENROUTER_API_KEY
├── package.json
└── docs/
```

---

## Shared Types (`lib/types.ts`)

Define once, use everywhere:

```ts
export interface RawReview {
  source: "reddit" | "playstore" | "appstore" | string;
  text: string;
}

export interface ClassifiedReview extends RawReview {
  theme: string;
  behavior: string;
  emotion: string;
  segment: string;
  barrier: string;
  root_cause: string;
  unmet_need: string;
  confidence: number;
}

export interface AggregationResult {
  themeFrequency: Record<string, { count: number; pct: number }>;
  segmentBreakdown: Record<string, { count: number; pct: number }>;
  barrierAnalysis: Record<string, { count: number; pct: number }>;
  totalReviews: number;
}

export interface InsightResult {
  summary: string;
  rootCauses: string[];
  discoveryProblems: string[];
  opportunities: { title: string; description: string }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnalysisContext {
  totalReviews: number;
  summary: string;
  rootCauses: string[];
  discoveryProblems: string[];
  opportunities: { title: string; description: string }[];
  themeFrequency: AggregationResult["themeFrequency"];
  segmentBreakdown: AggregationResult["segmentBreakdown"];
  barrierAnalysis: AggregationResult["barrierAnalysis"];
  representativeReviews: ClassifiedReview[]; // sampled per top theme
  sourceBreakdown: Record<string, number>;
}

export interface ChatResponse {
  reply: string;
  citations?: {
    label: string;
    count?: number;
    sources?: string[];
  }[];
}
```

---

## Phase 0: Setup Next.js App

**Goal:** Runnable app skeleton with upload screen visible.

### Tasks

| # | Task | Details |
|---|------|---------|
| 0.1 | Scaffold project | `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false` |
| 0.2 | Add dependencies | `papaparse`, `openai`, `recharts`; dev: `@types/papaparse` |
| 0.3 | Create `lib/types.ts` | All shared interfaces (see above) |
| 0.4 | Build UI shell | `app/layout.tsx` — title, max-width container, neutral background |
| 0.5 | Placeholder upload page | `app/page.tsx` — heading, description, empty `FileUpload` slot |
| 0.6 | Stub `FileUpload.tsx` | Drag-and-drop zone + file input (no parsing yet) |
| 0.7 | Env setup | `.env.local.example` with `OPENAI_API_KEY=`; add `.env.local` to `.gitignore` |
| 0.8 | Add sample CSV | `data/sample-reviews.csv` with 5–10 rows for local dev |

### Acceptance Criteria

- [ ] `npm run dev` starts without errors
- [ ] Home page shows "ReviewLens" + upload area
- [ ] File picker accepts `.csv` only

### Estimated effort: **2–3 hours**

---

## Phase 1: CSV Upload + Parsing

**Goal:** Upload CSV → parse → in-memory `RawReview[]`.

### Tasks

| # | Task | Details |
|---|------|---------|
| 1.1 | Implement `lib/csv-parser.ts` | Use papaparse; validate required columns `source`, `text`; trim whitespace; skip empty rows |
| 1.2 | Wire `FileUpload` | On file select → parse client-side → call `onParsed(reviews)` |
| 1.3 | Build `UploadPreview` | Table showing first 5 rows: source badge + truncated text |
| 1.4 | Row count + validation errors | Show "Loaded 612 reviews" or column-missing error |
| 1.5 | App state | `useState<RawReview[]>` in `page.tsx`; gate next step until data loaded |
| 1.6 | Source normalization | Map variants (`Play Store` → `playstore`, etc.) in parser |

### CSV Contract

```csv
source,text
reddit,"I keep hearing the same artists..."
playstore,"Discovery tab is useless"
```

### Acceptance Criteria

- [ ] Valid CSV with `source` + `text` columns parses correctly
- [ ] Invalid CSV shows clear error (missing columns, empty file)
- [ ] Preview table renders parsed rows
- [ ] Handles quoted fields and commas inside text

### Estimated effort: **3–4 hours**

---

## Phase 2: AI Classification API

**Goal:** `POST /api/classify` converts each review to structured JSON.

### Tasks

| # | Task | Details |
|---|------|---------|
| 2.1 | Create `lib/classify-prompt.ts` | System prompt defining taxonomy (themes, segments, barriers) + JSON schema |
| 2.2 | Build `app/api/classify/route.ts` | Accept `{ reviews: RawReview[] }`; return `{ classified: ClassifiedReview[] }` |
| 2.3 | Batch strategy | Process in chunks of 10–20 reviews per GPT call to balance cost/latency |
| 2.4 | Response parsing | `JSON.parse` with fallback retry on malformed output |
| 2.5 | Confidence scoring | Ask model to return 0–1 confidence; default 0.7 if missing |
| 2.6 | Client integration | "Analyze Reviews" button → POST → progress indicator |
| 2.7 | Error handling | Rate-limit retry, API key missing → 500 with message |

### Classification Prompt (sketch)

```
You are a product research analyst for a music streaming app.
For each review, extract:
- theme: primary discovery problem (e.g. Repetition Fatigue, Genre Lock-in)
- behavior: what the user is doing
- emotion: frustration, confusion, satisfaction, etc.
- segment: Long-term user | Explorer | Power listener | Casual
- barrier: Low novelty | No control | Trust issues | Algorithm opacity
- root_cause: one-sentence hypothesis
- unmet_need: what they wish existed
- confidence: 0-1

Return JSON array matching input order.
```

### Acceptance Criteria

- [ ] Single review returns all 8 structured fields
- [ ] 600 reviews complete in < 5 min (batched)
- [ ] Low-confidence items (< 0.5) flagged in UI (optional badge)
- [ ] Works with `sample-reviews.csv` end-to-end

### Estimated effort: **5–6 hours**

---

## Phase 3: Aggregation Engine

**Goal:** `POST /api/aggregate` computes frequency distributions from classified data.

### Tasks

| # | Task | Details |
|---|------|---------|
| 3.1 | Implement `lib/aggregation.ts` | Pure functions: `countByField(reviews, field)` → `{ value: { count, pct } }` |
| 3.2 | Build `app/api/aggregate/route.ts` | Accept `{ classified: ClassifiedReview[] }`; return `AggregationResult` |
| 3.3 | Theme frequency | Group by `theme`; sort desc by count |
| 3.4 | Segment breakdown | Group by `segment` |
| 3.5 | Barrier analysis | Group by `barrier` |
| 3.6 | Cross-tabs (stretch) | Theme × segment matrix for deeper patterns |
| 3.7 | Pipeline wiring | After classify completes → auto-call aggregate → store result |

### Example Output

```json
{
  "themeFrequency": {
    "Repetition Fatigue": { "count": 228, "pct": 38 },
    "Genre Lock-in": { "count": 132, "pct": 22 }
  },
  "segmentBreakdown": { "Long-term users": { "count": 264, "pct": 44 } },
  "barrierAnalysis": { "Low novelty": { "count": 246, "pct": 41 } },
  "totalReviews": 600
}
```

### Acceptance Criteria

- [ ] Percentages sum to ~100% per dimension (rounding tolerance ±1%)
- [ ] Empty input returns zeroed result, not crash
- [ ] Deterministic output for same input (no AI involved)
- [ ] Unit-testable pure functions in `lib/aggregation.ts`

### Estimated effort: **3–4 hours**

---

## Phase 4: Insight Engine

**Goal:** `POST /api/insights` turns aggregated patterns into root-cause narratives and product opportunities.

> Combines blueprint Phase 4 (Root Cause) + Phase 5 (Opportunity).

### Tasks

| # | Task | Details |
|---|------|---------|
| 4.1 | Create `lib/insights-prompt.ts` | Prompt template injecting aggregation stats |
| 4.2 | Build `app/api/insights/route.ts` | Accept `{ aggregation: AggregationResult, sampleReviews: ClassifiedReview[] }` |
| 4.3 | Root cause generation | 3–5 PM-level explanations (why repetition, why limited exploration) |
| 4.4 | Discovery problem statements | "Users struggle to discover music because…" |
| 4.5 | Opportunity generation | 3+ product ideas with title + description |
| 4.6 | Evidence grounding | Pass top 10 reviews per dominant theme as context to reduce hallucination |
| 4.7 | Pipeline wiring | After aggregate → auto-call insights → store `InsightResult` |

### Insight Prompt (sketch)

```
Given these aggregated review patterns for a music streaming app:
- Top themes: {themeFrequency}
- User segments: {segmentBreakdown}
- Barriers: {barrierAnalysis}

And these representative reviews: {samples}

Generate:
1. A 2-sentence executive summary
2. 3-5 root cause explanations (WHY, not WHAT)
3. 3 discovery problem statements
4. 3 product opportunities (title + 1-sentence description each)

Write for a PM audience. Be specific to music discovery.
```

### Acceptance Criteria

- [ ] Insights reference actual top themes from aggregation (not generic)
- [ ] At least 3 opportunities returned, each actionable
- [ ] Root causes explain mechanism, not just restate stats
- [ ] Full pipeline: upload → classify → aggregate → insights completes in one flow

### Estimated effort: **4–5 hours**

---

## Phase 5: Dashboard UI

**Goal:** Visual dashboard showing all pipeline outputs.

> Maps to blueprint Phase 6 (Dashboard).

### Tasks

| # | Task | Details |
|---|------|---------|
| 5.1 | Pipeline state machine | `idle → uploaded → classifying → aggregating → insights → done` |
| 5.2 | `LoadingState.tsx` | Step progress: "Classifying 120/600…" |
| 5.3 | `ThemeChart.tsx` | Horizontal bar chart of theme frequency (recharts) |
| 5.4 | `SegmentBreakdown.tsx` | Donut or stacked bar for user segments |
| 5.5 | `BarrierAnalysis.tsx` | Ranked list with percentage bars |
| 5.6 | `RootCauses.tsx` | Numbered cards with AI explanations |
| 5.7 | `Opportunities.tsx` | Card grid: title, description, optional "impact" tag |
| 5.8 | Layout | Two-column on desktop; stacked on mobile; section headers |
| 5.9 | Export (stretch) | "Download Report" → JSON or markdown summary |
| 5.10 | Polish | Source filter tabs, confidence filter, empty states |

### Dashboard Wireframe

```
┌─────────────────────────────────────────────────┐
│  ReviewLens          [Re-upload]   │
├─────────────────────────────────────────────────┤
│  Executive Summary (AI-generated, 2 sentences)  │
├──────────────────┬──────────────────────────────┤
│ Theme Distribution│  User Segments              │
│ ████ 38% Repet.  │  ◉ Long-term 44%             │
│ ███  22% Genre   │  ◉ Explorer 25%              │
├──────────────────┴──────────────────────────────┤
│  Discovery Barriers                             │
│  Low novelty ████████ 41%                       │
│  No control  █████ 26%                          │
├─────────────────────────────────────────────────┤
│  Root Causes                                    │
│  1. Recommendation systems prioritize…          │
│  2. Historical listening patterns…              │
├─────────────────────────────────────────────────┤
│  Product Opportunities                          │
│  ┌──────────────┐ ┌──────────────┐              │
│  │ Novelty Slider│ │ Explainable  │              │
│  │ …            │ │ Recs …       │              │
│  └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] All five dashboard sections render with real pipeline data
- [ ] Loading states between each pipeline stage
- [ ] Responsive layout (mobile + desktop)
- [ ] Re-upload resets state cleanly
- [ ] Demo-ready with full 600-review CSV

### Estimated effort: **6–8 hours**

---

## Phase 6: Review Chatbot

**Goal:** After analysis completes, users can ask natural-language questions about the **same session's** classified reviews and get grounded answers — e.g. *"Why do users struggle to discover new music?"*

> Maps to blueprint **Phase 7 — Review Chatbot**.  
> This is a **read-only Q&A layer** on top of existing pipeline output. It does not re-classify or fetch new reviews.

### Why this phase exists

The dashboard shows *what* patterns exist. The chatbot answers *why* and *how* in conversational form, with evidence tied to themes, segments, barriers, and real review snippets — useful for PM interviews, stakeholder walkthroughs, and ad-hoc exploration.

### Architecture

```mermaid
flowchart TB
    subgraph pipeline [Completed pipeline session]
        C[classified reviews]
        A[aggregation]
        I[insights]
    end

    pipeline --> CTX[buildAnalysisContext]
    CTX --> CTXOUT[AnalysisContext JSON]

    U[User question] --> UI[ChatPanel]
    UI --> API["POST /api/chat"]
    CTXOUT --> API
    H[chat history] --> API
    API --> LLM[OpenRouter / gpt-4o-mini]
    LLM --> R[Grounded reply + citations]
    R --> UI
```

### Context strategy (MVP)

No vector DB for MVP. Build a compact, grounded context bundle in `lib/chat-context.ts`:

| Context block | Source | Purpose |
|---------------|--------|---------|
| Executive summary | `InsightResult.summary` | High-level narrative |
| Top themes + % | `AggregationResult.themeFrequency` | Quantitative backing |
| Segments + barriers | aggregation | Who struggles and how |
| Root causes & problems | `InsightResult` | Pre-synthesized WHY |
| Opportunities | `InsightResult` | Product angle if asked |
| Representative reviews | `ClassifiedReview[]` | 5–8 reviews per top 3 themes |
| Source mix | classified `source` field | Play Store vs Reddit weighting |

**Token budget:** cap representative reviews at ~40–60 items; truncate long review text to ~300 chars. Full corpus stays in client state but only a relevant subset is sent per question (stretch: keyword/theme filter before LLM call).

### Tasks

| # | Task | Details |
|---|------|---------|
| 6.1 | `lib/chat-context.ts` | `buildAnalysisContext(classified, aggregation, insights)` → `AnalysisContext` |
| 6.2 | `lib/chat-prompt.ts` | System prompt: answer **only** from context; cite themes/segments; admit gaps |
| 6.3 | `app/api/chat/route.ts` | `POST { messages, context }` → `{ reply, citations? }` |
| 6.4 | Grounding rules | Forbid inventing stats; require referencing theme names or review evidence |
| 6.5 | `ChatPanel.tsx` | Floating panel or right drawer on dashboard; visible when `pipelineStep === "done"` |
| 6.6 | `SuggestedQuestions.tsx` | Chips for common PM questions (see below) |
| 6.7 | `ChatMessage.tsx` | User/assistant bubbles; optional citation pills under assistant messages |
| 6.8 | Session state | `useState<ChatMessage[]>` in dashboard; reset on re-upload |
| 6.9 | Loading UX | Typing indicator while `/api/chat` runs |
| 6.10 | Mock mode | Reuse `USE_MOCK_CLASSIFIER` pattern — rule-based replies from aggregation when no API key |

### Suggested starter questions

- Why do users struggle to discover new music?
- What are the top discovery barriers?
- Which user segment complains most about repetition?
- How do Play Store reviews differ from Reddit?
- What product opportunities address low novelty?
- Show evidence for genre lock-in.

### Chat API contract

**Request**

```json
{
  "messages": [
    { "role": "user", "content": "Why do users struggle to discover new music?" }
  ],
  "context": { "...AnalysisContext" }
}
```

**Response**

```json
{
  "reply": "Users struggle primarily because…",
  "citations": [
    { "label": "Repetition Fatigue", "count": 228, "sources": ["reddit", "playstore"] }
  ]
}
```

### System prompt (sketch)

```
You are a product research assistant for a music streaming app.
Answer ONLY using the provided analysis context (aggregated stats, insights, and sample reviews).
- Reference specific themes, barriers, segments, and percentages when making claims.
- Quote or paraphrase representative reviews when giving evidence.
- If the context does not support an answer, say so clearly.
- Write for a PM audience: concise, specific, no generic advice.
- Do not invent statistics or reviews not present in the context.
```

### UI wireframe (dashboard + chat)

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard (existing sections)                    [Ask AI ◉] │
├──────────────────────────────────────────────────────────────┤
│  … Theme chart · Barriers · Root causes · Opportunities …    │
└──────────────────────────────────────────────────────────────┘

┌─ Chat panel (slide-over) ────────────────────────────────────┐
│  Ask about your reviews                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Why do users struggle to discover new music?            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  [Why discovery fails?] [Top barriers?] [Segment pain?]      │
│                                                              │
│  Assistant: Based on 1,126 reviews, the dominant barrier…    │
│  ▸ Repetition Fatigue (38%) · sources: reddit, playstore     │
│                                                              │
│  ┌ Type a question… ──────────────────────────────── [Send]┐ │
└──────────────────────────────────────────────────────────────┘
```

### Acceptance criteria

- [ ] Chat panel only appears after pipeline reaches `done`
- [ ] Question *"Why do users struggle to discover new music?"* returns answer referencing real top themes/barriers from session
- [ ] Assistant does not hallucinate review counts or theme names absent from context
- [ ] Re-upload clears chat history
- [ ] Works with full `docs/review-corpus/all-reviews.csv` session
- [ ] API key missing → clear error or mock fallback (consistent with classify/insights)

### Stretch (post-MVP)

| Enhancement | Benefit |
|-------------|---------|
| Semantic retrieval (embeddings) | Pick most relevant reviews per question instead of fixed sample |
| Streaming responses | Better UX for long answers |
| Export chat transcript | Include in report download |
| Filter-aware chat | Respect dashboard source/confidence filters in context |

### Estimated effort: **5–7 hours**

---

## End-to-End Pipeline Flow (updated)

```mermaid
flowchart LR
    A[CSV Upload / Corpus] --> B[parseReviewsCsv]
    B --> R[discovery-relevance pre-check]
    R --> C["POST /api/classify"]
    C --> D["POST /api/aggregate"]
    D --> F["POST /api/findings"]
    F --> E["POST /api/insights"]
    E --> UI[Dashboard]
    UI --> G["POST /api/chat"]
    D --> H[buildAnalysisContext]
    F --> H
    E --> H
    H --> G

    C -.->|batched LLM| C
    E -.->|single LLM interpretation| E
    F -.->|deterministic| F
    G -.->|per user message| G
```

### Client orchestration (`components/upload/UploadSection.tsx`)

```ts
async function runPipeline(reviews: RawReview[]) {
  setStep("classifying");
  const { classified } = await classifyAllReviews(reviews, onProgress);

  setStep("aggregating");
  const aggregation = await fetchAggregation(classified);

  const findings = await fetchFindings(aggregation);

  setStep("insights");
  const { interpretation } = await fetchInsights(aggregation, findings);

  setStep("done");
  return { classified, aggregation, findings, interpretation };
}

// Dashboard — chat uses full evidence context
const context = buildAnalysisContext(evidence, findings, interpretation);
```

### What each stage produces

| Stage | API / module | Output |
|-------|----------------|--------|
| Parse | `lib/csv-parser.ts` | `RawReview[]` |
| Relevance | `lib/discovery-relevance.ts` | Pre-check + `discovery_relevant` on classify |
| Classify | `POST /api/classify` | `ClassifiedReview[]` (8 dimensions) |
| Aggregate | `POST /api/aggregate` | `AggregationResult` — all frequencies, cross-tabs, quotes |
| Findings | `POST /api/findings` | `ResearchFindings` — 6 PM questions answered |
| Insights | `POST /api/insights` | `InterpretationResult` — AI narrative on evidence |
| Dashboard | React state | Evidence sections + Interpretation sections |
| Chat | `POST /api/chat` | Grounded reply + citations with quotes |

---

## Build Order & Dependencies

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 3b ──► Phase 4 ──► Phase 5 ──► Phase 6
  │            │            │            │            │            │            │            │
  skeleton     data         AI           evidence     findings     interpret    visuals      chatbot
```

| Phase | Blocked by | Can test with |
|-------|-----------|---------------|
| 0 | — | Browser visit |
| 1 | 0 | `sample-reviews.csv` |
| 2 | 1 | 10-review subset |
| 3 | 2 | Mock classified JSON |
| 3b (findings) | 3 | Mock aggregation JSON |
| 4 | 3, 3b | Full evidence + findings |
| 5 | 4 | Full pipeline |
| 6 | 5 | Completed session + sample questions |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| GPT cost for 600 reviews | Batch 15–20 per call; use `gpt-4o-mini`; dev with 10-row sample |
| Inconsistent classification labels | Fixed taxonomy in prompt; normalize casing in aggregation |
| Slow pipeline UX | Progress bar with batch count; consider streaming partial results |
| API key exposure | Server-side routes only; never call OpenAI from client |
| Malformed GPT JSON | Retry once; Zod validation on response shape |
| Chatbot hallucination | Strict system prompt; context-only answers; citation metadata |
| Chat context too large | Sample reviews per theme; truncate text; optional retrieval filter |

---

## Total Estimated Effort

| Phase | Hours |
|-------|-------|
| 0 — Setup | 2–3 |
| 1 — CSV parsing | 3–4 |
| 2 — Classification | 5–6 |
| 3 — Aggregation | 3–4 |
| 4 — Insights | 4–5 |
| 5 — Dashboard | 6–8 |
| 6 — Review chatbot | 5–7 |
| **Total** | **28–37 hours** |

---

## Definition of Done (MVP)

1. User uploads a CSV with 600+ reviews (or `docs/review-corpus/all-reviews.csv`)
2. App classifies all reviews via LLM
3. Aggregated theme/segment/barrier stats are computed
4. AI generates root causes and product opportunities
5. Dashboard displays all five sections clearly
6. Entire flow works in a single session without page reload
7. **Chatbot answers grounded questions** about the analyzed session (e.g. discovery struggles, top barriers, segment differences)
8. Chat resets on re-upload; answers cite themes/stats from the session, not generic product advice
