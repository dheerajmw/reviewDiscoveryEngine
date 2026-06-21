# Google Stitch Prompt — ReviewLens

> Paste the entire **PROMPT** section below into [Google Stitch](https://stitch.withgoogle.com).
> No character limit — this is the full spec.

---

## PROMPT (copy from here)

Design the complete frontend UI for **ReviewLens** — a single-page web app that helps product managers analyze music-streaming app reviews and turn them into actionable discovery insights.

The UI must feel **simple, clear, and calm**. No clutter. No gradients. No glassmorphism. No decorative illustrations. White space is the primary design tool. Every screen should be understandable in 3 seconds.

Think: **Linear + Notion + a lightweight analytics dashboard** — professional, minimal, trustworthy.

---

# 1. PRODUCT OVERVIEW

**What it does:**
1. User uploads a CSV of reviews (Spotify / App Store / Play Store / Reddit)
2. AI classifies each review into themes, segments, barriers, emotions
3. System aggregates patterns across all reviews
4. AI generates root causes, discovery problems, and product opportunities
5. Dashboard displays everything clearly

**Target user:** Product manager or UX researcher presenting music discovery findings.

**Platform:** Responsive web app (desktop-first, mobile-friendly).

**Page structure:** Single page, no sidebar, no login, no settings. Flow moves top-to-bottom: Upload → Process → Dashboard.

---

# 2. DESIGN PRINCIPLES

- **Simple:** One primary action per screen state. No competing CTAs.
- **Clear:** Obvious hierarchy — title → context → data → action.
- **Quiet:** Neutral zinc palette. Data speaks louder than decoration.
- **Honest:** Show loading states, errors, and demo-mode banners plainly.
- **Fast-feeling:** Subtle animations only — never flashy or distracting.

---

# 3. DESIGN SYSTEM

## 3.1 Color palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#fafafa` (zinc-50) | Page background |
| Surface | `#ffffff` | Cards, upload zone |
| Border | `#e4e4e7` (zinc-200) | Card borders, table dividers |
| Text primary | `#18181b` (zinc-900) | Headings, labels |
| Text secondary | `#71717a` (zinc-500) | Helper text, metadata |
| Primary button | `#18181b` bg, white text | Analyze, Re-upload |
| Error | `#fef2f2` bg, `#991b1b` text | Error alerts |
| Warning/demo | `#fffbeb` bg, `#92400e` text | Demo mode banner |
| Low confidence | `#fef3c7` bg, `#92400e` text | Confidence badges |

**Source badges (small pills):**
- `reddit` → soft orange `#ffedd5` / `#9a3412`
- `playstore` → soft green `#dcfce7` / `#166534`
- `appstore` → soft blue `#dbeafe` / `#1e40af`

**Charts:** Monochrome zinc scale only (`#18181b` → `#d4d4d8`). No rainbow charts.

## 3.2 Typography

- Font: **Inter** or **Geist Sans**
- Page title: 30px / semibold / zinc-900
- Section title: 14px / semibold / zinc-900
- Body: 14px / regular / zinc-700 / line-height 1.6
- Caption/meta: 12px / regular / zinc-500
- Code hints (`source`, `text`): 13px / mono or regular / zinc-700

## 3.3 Spacing & layout

- Max content width: **1152px**, centered
- Page padding: 40px desktop, 16px mobile
- Card padding: 20–24px
- Card radius: 12px (`rounded-xl`)
- Card shadow: very subtle `0 1px 3px rgba(0,0,0,0.06)`
- Section gap: 24px between major blocks
- Grid gap: 16px

## 3.4 Components (base)

- **Card:** white surface, zinc-200 border, rounded-xl, optional title
- **Primary button:** full-width or inline, zinc-900, white text, 10px radius, 40px height
- **Secondary button:** white bg, zinc-300 border, zinc-700 text
- **Filter tab (pill):** inactive = transparent zinc text; active = white bg + subtle shadow
- **Badge:** rounded-full, 12px text, soft colored background
- **Progress bar:** 8px height, zinc-100 track, zinc-900 fill
- **Spinner:** 16px, zinc-300 ring, zinc-900 top segment, continuous rotation

---

# 4. ANIMATIONS & MICRO-INTERACTIONS

Keep all motion **subtle and purposeful**. Duration 150–300ms. Easing: `ease-out`. No bounce, no parallax, no particle effects.

## 4.1 Page & section entrance

- **Page load:** Main content fades in + slides up 8px (opacity 0→1, 250ms)
- **Dashboard sections:** Staggered fade-in when analysis completes — each card appears 60ms after the previous (summary → charts → barriers → root causes → opportunities). Total stagger under 400ms.
- **Section headers:** No animation — appear with their parent card

## 4.2 Upload zone

- **Default:** Dashed zinc-300 border, white background
- **Hover:** Border darkens to zinc-400, background → zinc-50 (150ms transition)
- **Drag over (active drop):** Border solid zinc-900, background zinc-100, scale 1.01 (200ms)
- **File selected:** Filename pill fades in below drop text (opacity + scale 0.95→1, 200ms)
- **Upload icon:** Static — no animation unless dragging (optional gentle 2px bob on drag-over only)

## 4.3 Buttons

- **Hover:** Background darkens one step (zinc-900 → zinc-800), 150ms
- **Active/press:** Scale 0.98, 100ms
- **Disabled:** 50% opacity, no hover effect, `not-allowed` cursor

## 4.4 Pipeline / loading states

- **Parsing CSV:** Inline text "Parsing CSV…" with subtle opacity pulse (1 → 0.6 → 1, 1.5s loop)
- **Classifying:** Progress bar fill animates smoothly width 0→N% (300ms ease per update, not jumpy)
- **Progress label:** "Classifying 120 / 612 reviews (20%)" updates live
- **Aggregating / Generating insights:** Small spinner + label, crossfade between steps (200ms fade)
- **Step transition:** When moving classify → aggregate → insights, previous step fades out, next fades in

## 4.5 Preview table

- **Rows:** Fade in together when CSV loads (150ms)
- **No row hover effects** — keep table static and readable

## 4.6 Dashboard charts

- **Bar chart (themes):** Bars grow from 0 to final width on mount (400ms ease-out, slight stagger per bar 50ms)
- **Donut chart (segments):** Segments draw in clockwise (500ms ease-out)
- **Barrier bars:** Same grow animation as theme bars (300ms)
- **Filter change:** Charts crossfade or bars re-animate to new values (250ms) — no full page reload feel

## 4.7 Cards & lists

- **Root cause cards:** Fade + slide up 4px on staggered entrance
- **Opportunity cards:** Subtle hover — shadow increases slightly, translateY -1px (150ms). No color change.
- **Filter tabs:** Background and text color transition 150ms

## 4.8 Alerts & errors

- **Error alert:** Slides down from top of card + fades in (200ms). Red border-left accent optional.
- **Demo banner:** Fades in when dashboard loads (200ms). Static after — no pulse.

## 4.9 Screen transitions

- **Upload → Processing:** Upload form fades out (150ms), loading state fades in (150ms)
- **Processing → Dashboard:** Full crossfade (300ms). Upload UI disappears entirely.
- **Re-upload:** Dashboard fades out, upload screen fades in (250ms). All state visually reset.

## 4.10 What NOT to animate

- No animated backgrounds
- No typing effects on AI text
- No confetti or success celebrations
- No skeleton loaders with shimmer (use simple spinner or progress bar)
- No chart tooltips that bounce

---

# 5. COMPLETE COMPONENT INVENTORY

Build every component below. Each must have a defined default, hover, active, loading, and error state where applicable.

## 5.1 Global / layout

| Component | Description |
|-----------|-------------|
| `AppHeader` | Page title + one-line subtitle. Always visible at top. |
| `PageContainer` | Max-width 1152px centered wrapper |
| `Card` | Reusable white bordered container with optional title |
| `ErrorAlert` | Red-tinted alert box with message text |
| `DemoBanner` | Amber warning strip for demo/mock mode |

## 5.2 Upload flow

| Component | Description |
|-----------|-------------|
| `FileUpload` | Drag-and-drop zone + hidden file input. Accepts `.csv` only. Shows upload icon, primary text, helper text. Shows selected filename pill after pick. |
| `UploadSection` | White card wrapping upload area. Title "Upload reviews" + format helper text. |
| `UploadPreview` | Table showing first 5 parsed reviews. Columns: Source (badge), Review (truncated ~120 chars). Footer: "Showing 5 of N reviews". |
| `ReviewCountBar` | "Loaded N reviews" left + "Upload different file" text link right |
| `AnalyzeButton` | Full-width primary CTA: "Analyze Reviews" |

## 5.3 Pipeline / loading

| Component | Description |
|-----------|-------------|
| `LoadingState` | Context-aware loader for current pipeline step |
| `ProgressBar` | Horizontal bar with completed/total label and percentage |
| `PipelineStepIndicator` | Optional 3-step visual: Classify → Aggregate → Insights. Active step highlighted, completed steps checkmarked. Keep minimal. |
| `ParsingLabel` | Simple "Parsing CSV…" text state |

**Pipeline steps (state machine):**
```
idle → uploaded → parsing → classifying → aggregating → insights → done
```

## 5.4 Classification preview (optional intermediate — include in prototype)

| Component | Description |
|-----------|-------------|
| `ClassifiedPreview` | Compact results table after classification. Columns: Theme, Segment, Barrier, Review (truncated). Shows "Classification complete" header. Low-confidence badge on rows where confidence < 0.5. Footer: "Showing 5 of N classified reviews". |

## 5.5 Dashboard — header & controls

| Component | Description |
|-----------|-------------|
| `DashboardHeader` | "Dashboard" title + "N reviews analyzed" subtitle |
| `DashboardActions` | Button group: Download Report (secondary) · Export JSON (secondary) · Re-upload (primary) |
| `SourceFilterTabs` | Pills: All sources · reddit · playstore · appstore |
| `ConfidenceFilterTabs` | Pills: All confidence · High ≥0.5 · Low <0.5 |
| `FilterMeta` | When filtered: "· M shown with filters" in subtitle |

## 5.6 Dashboard — data visualization

| Component | Description |
|-----------|-------------|
| `ExecutiveSummary` | Full-width card. Title "Executive summary". 2-sentence AI-generated paragraph. |
| `ThemeChart` | Horizontal bar chart — theme names on Y-axis, percentage on X-axis. Monochrome bars. Tooltip on hover: "38% (233 reviews)". |
| `SegmentBreakdown` | Donut chart + legend list below. Segment name + percentage per row. |
| `BarrierAnalysis` | Ranked list. Each row: label, percentage + count, horizontal progress bar. |
| `DiscoveryProblems` | Bulleted list of 3 problem statements. Simple dots, no icons. |
| `RootCauses` | Numbered cards in 2-column grid. Dark circle number badge + explanation text. |
| `Opportunities` | 3-column card grid. Each card: impact tag pill + title + one-sentence description. |

**Impact tags on opportunity cards:**
- 1st card: "High impact"
- 2nd card: "Medium impact"
- 3rd+: "Exploratory"

## 5.7 Empty & error states

| Component | Description |
|-----------|-------------|
| `EmptyUpload` | Upload zone with no file — default idle state |
| `EmptyChart` | "No data available" centered in chart area when filtered to zero |
| `CsvParseError` | "CSV must include source and text columns. Found: …" |
| `ApiError` | "Analysis failed. Please try again." or rate-limit message |

---

# 6. SCREEN-BY-SCREEN SPECIFICATION

## Screen A — Landing / Upload (idle)

```
┌─────────────────────────────────────────────────────────────┐
│  ReviewLens                                    │
│  Upload a CSV of Spotify, App Store, or Reddit reviews…    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Upload reviews                                      │   │
│  │  CSV with review text — supports source + text…      │   │
│  │                                                      │   │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │   │
│  │  │         ↑ upload icon                        │   │   │
│  │  │  Drop your CSV here, or click to browse      │   │   │
│  │  │  Accepts source/text, store/body…            │   │   │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen B — CSV loaded (preview)

Add below drop zone (drop zone still shows selected filename pill):

```
│  Loaded 612 reviews              Upload different file      │
│                                                             │
│  ┌──────────┬──────────────────────────────────────────┐   │
│  │ Source   │ Review                                   │   │
│  ├──────────┼──────────────────────────────────────────┤   │
│  │ reddit   │ I keep hearing the same artists every…   │   │
│  │ playstore│ The discovery tab is useless. Same…    │   │
│  │ appstore │ Love the app but I feel locked into…   │   │
│  │ reddit   │ After 5 years I feel like I've heard…  │   │
│  │ playstore│ Recommendations feel like they're…     │   │
│  └──────────┴──────────────────────────────────────────┘   │
│  Showing 5 of 612 reviews                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Analyze Reviews                         │   │
│  └─────────────────────────────────────────────────────┘   │
```

---

## Screen C — Processing (pipeline active)

Upload form hidden. Show one active loading state at a time:

**Step 1 — Classifying:**
```
│  Classifying 120 / 612 reviews (20%)                        │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
```

**Step 2 — Aggregating:**
```
│  ◌ Aggregating patterns…                                    │
```

**Step 3 — Generating insights:**
```
│  ◌ Generating insights…                                     │
```

Optional minimal step indicator above:
`● Classify  ○ Aggregate  ○ Insights` → progresses left to right

---

## Screen D — Dashboard (complete)

```
┌─────────────────────────────────────────────────────────────┐
│  ReviewLens                                    │
│  Upload a CSV of Spotify, App Store, or Reddit reviews…    │
│                                                             │
│  Dashboard                          [Download] [JSON] [↑]  │
│  612 reviews analyzed                                       │
│                                                             │
│  ⚠ Demo mode active — rule-based generation.               │
│                                                             │
│  [All sources] [reddit] [playstore] [appstore]              │
│  [All confidence] [High ≥0.5] [Low <0.5]                   │
│                                                             │
│  ┌─ Executive summary ─────────────────────────────────┐   │
│  │ 40% of reviews point to Repetition Fatigue…          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Theme distribution ──┐  ┌─ User segments ──────────┐   │
│  │ ████ Repetition  38%  │  │      [donut chart]       │   │
│  │ ███  Genre lock  22%  │  │  ● Long-term user  44%   │   │
│  │ ██   Discovery   18%  │  │  ● Explorer        25%   │   │
│  └────────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌─ Discovery barriers ────────────────────────────────┐   │
│  │ Low novelty  ████████████████  41% (251)            │   │
│  │ No control   ██████████          26% (159)            │   │
│  │ Trust issues ███████             18% (110)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Discovery problems ────────────────────────────────┐   │
│  │ • Users struggle to discover music because…         │   │
│  │ • Listeners cannot escape filter bubbles when…      │   │
│  │ • Long-term users feel the catalog shrinks…         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Root causes ────────────────────────────────────────┐   │
│  │ [1] Recommendation models reinforce past listening  │   │
│  │ [2] Discovery surfaces lack exploration controls    │   │
│  │ [3] Playlist loops shrink perceived catalog size    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Product opportunities ─────────────────────────────┐   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │   │
│  │ │High impact   │ │Medium impact │ │Exploratory   │  │   │
│  │ │Novelty slider│ │Explainable   │ │Exploration   │  │   │
│  │ │…             │ │recs …        │ │mode …        │  │   │
│  │ └──────────────┘ └──────────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. MOCK DATA (use realistic copy)

## 7.1 Sample reviews (upload preview)

| source | text |
|--------|------|
| reddit | I keep hearing the same artists on my Discover Weekly every single week. It's like the algorithm is stuck. |
| playstore | The discovery tab is useless. Same playlists recycled over and over. |
| appstore | Love the app but I feel locked into one genre. Can't break out of my bubble. |
| reddit | After 5 years of using Spotify I feel like I've heard everything they have to offer me. |
| playstore | I want more control over how adventurous the recommendations are. |

## 7.2 Aggregation data

```json
{
  "totalReviews": 612,
  "themeFrequency": {
    "Repetition Fatigue": { "count": 233, "pct": 38 },
    "Genre Lock-in": { "count": 135, "pct": 22 },
    "Discovery Failure": { "count": 110, "pct": 18 },
    "Algorithm Distrust": { "count": 86, "pct": 14 },
    "Control Gap": { "count": 48, "pct": 8 }
  },
  "segmentBreakdown": {
    "Long-term user": { "count": 269, "pct": 44 },
    "Explorer": { "count": 153, "pct": 25 },
    "Power listener": { "count": 110, "pct": 18 },
    "Casual": { "count": 80, "pct": 13 }
  },
  "barrierAnalysis": {
    "Low novelty": { "count": 251, "pct": 41 },
    "No control": { "count": 159, "pct": 26 },
    "Trust issues": { "count": 110, "pct": 18 },
    "Algorithm opacity": { "count": 92, "pct": 15 }
  }
}
```

## 7.3 Insights data

```json
{
  "summary": "40% of reviews point to Repetition Fatigue, especially among long-term users. The dominant barrier is low novelty, suggesting recommendation systems prioritize familiarity over controlled exploration.",
  "rootCauses": [
    "Recommendation models reinforce past listening by optimizing engagement signals, which reduces exposure to novel artists over time.",
    "Discovery surfaces lack explicit controls for novelty, randomness, or intent — users cannot steer the algorithm toward exploration.",
    "Playlist and radio features recycle similar audio profiles, making the catalog feel smaller than it actually is."
  ],
  "discoveryProblems": [
    "Users struggle to discover music because repetition makes every session feel predictable rather than exploratory.",
    "Listeners cannot escape filter bubbles when algorithm opacity blocks intentional discovery.",
    "Long-term users feel the product stops introducing meaningful new artists even as their tastes evolve."
  ],
  "opportunities": [
    {
      "title": "Adjustable novelty slider",
      "description": "Let users control how adventurous recommendations are, from safe favorites to high-discovery mode."
    },
    {
      "title": "Explainable recommendations",
      "description": "Show why a song was recommended to rebuild trust and help users steer the algorithm."
    },
    {
      "title": "Guided exploration mode",
      "description": "Offer a dedicated discovery session that mixes controlled randomness with genre or mood guardrails."
    }
  ]
}
```

## 7.4 Classified review sample (for ClassifiedPreview table)

| Theme | Segment | Barrier | Review | Confidence |
|-------|---------|---------|--------|------------|
| Repetition Fatigue | Long-term user | Low novelty | I keep hearing the same artists… | 0.82 |
| Discovery Failure | Explorer | No control | The discovery tab is useless… | 0.45 ⚠ Low |
| Genre Lock-in | Casual | Trust issues | Locked into one genre… | 0.71 |

---

# 8. RESPONSIVE BREAKPOINTS

## Desktop (≥1024px)
- Two-column chart grid
- Three-column opportunity cards
- Root causes in 2 columns
- Filter tabs inline, single row each

## Tablet (768px–1023px)
- Charts stack vertically
- Opportunities in 2 columns
- Root causes in 1 column

## Mobile (<768px)
- Everything single column
- Filter tabs wrap to multiple rows
- Dashboard action buttons stack or wrap
- Table horizontal scroll if needed
- Chart height reduced to 200px

---

# 9. INTERACTION FLOWS

## Flow 1 — Happy path
1. Land on upload screen (fade in)
2. Drag CSV → filename appears → preview table loads
3. Click "Analyze Reviews" → loading steps animate
4. Dashboard appears with staggered card entrance
5. Click source filter → charts update smoothly
6. Click "Download Report" → (no actual download needed in prototype, button click state is enough)
7. Click "Re-upload" → fade back to upload screen

## Flow 2 — Error path
1. Upload invalid CSV
2. Error alert slides in below upload zone
3. User can re-upload without page reload

## Flow 3 — Demo mode
1. Complete analysis
2. Amber demo banner visible at top of dashboard
3. All other UI identical to real mode

---

# 10. ACCESSIBILITY

- All buttons have visible focus rings (zinc-900 outline, 2px offset)
- Color is never the only indicator — always pair with text labels
- Progress bar has aria-label with current step and percentage
- Error alerts use `role="alert"`
- Chart data available as text in legend (not color-only)
- Minimum touch target 44px on mobile
- Contrast ratio ≥ 4.5:1 for all body text

---

# 11. DO NOT INCLUDE

- Login / signup / auth
- Sidebar navigation or multi-page routing
- Dark mode
- User profile or settings
- Notifications panel
- Chat interface
- 3D effects, gradients, glassmorphism, neumorphism
- Stock photos or decorative illustrations
- Spotify logo or trademarked branding
- Real API integration (prototype only)

---

# 12. DELIVERABLES

Generate an **interactive multi-screen prototype** containing:

1. **Upload screen** (idle + file loaded states)
2. **Processing screen** (all 3 pipeline steps)
3. **Dashboard screen** (full layout with all sections)
4. **Error state** (invalid CSV)
5. **Filtered dashboard state** (one source tab active, charts updated)

Use the mock data above. Keep the UI **simple and clear** — a PM should understand every section without explanation.

Prioritize readability over visual flair. The data is the hero.

---

## END OF PROMPT
