# Google Stitch Prompt — Fetch & Analyze Page (Home)

> Paste the entire **PROMPT** section below into [Google Stitch](https://stitch.withgoogle.com).
> This spec covers **only the home / upload / live-fetch page** — all states and components currently implemented.

---

## PROMPT (copy from here)

Design the complete **Fetch & Analyze** page for **ReviewLens** — a research tool that scrapes live reviews from app stores and forums, or imports CSV / saved corpus data, then classifies them with AI and saves analysis runs to a repository.

The UI must feel **professional, calm, and modern** — Material-inspired surfaces with a soft indigo primary (`#4648d4`). Not zinc-minimal like the old spec; use the token palette below. White space and clear hierarchy matter. Subtle motion only — no heavy gradients, glassmorphism, or decorative illustrations.

Think: **Linear + Material 3 light theme + a focused research workflow**.

---

# 1. PAGE PURPOSE & FLOW

**Primary path (live fetch):**
1. User lands on split hero + form layout
2. Selects sources, sets filters, clicks **Fetch N reviews**
3. Reviews load → preview table appears in same card area
4. User clicks **Analyze & Save to Repository**
5. Processing screen → redirects to dashboard (out of scope — show processing state only)

**Alternate paths:**
- **Upload CSV** — drag-and-drop compact card
- **Saved corpus** — one-click load of pre-fetched datasets (full or by source)

**Pipeline states on this page:**
```
idle → fetching | parsing → uploaded (preview) → classifying → aggregating → saving
```

---

# 2. DESIGN SYSTEM (current app tokens)

## 2.1 Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#4648d4` | CTAs, active chips, links, icon accents |
| On primary | `#ffffff` | Text on primary buttons/chips |
| Primary container | `#6063ee` | Slider fill gradient end |
| Primary fixed | `#e1e0ff` | Upload hover tint |
| Secondary container | `#bdbefe` | Corpus loader icon bg |
| Tertiary | `#904900` | Secondary fetch button (non-priority) |
| Background | `#fcf8ff` | Page background |
| Surface container lowest | `#ffffff` | Cards, form fields |
| Surface container low | `#f5f2fe` | Nested panels, table header |
| Surface container high | `#e9e6f3` | Hover states |
| On surface | `#1b1b23` | Headings, primary text |
| On surface variant | `#464554` | Helper text, captions |
| Outline variant | `#c7c4d7` | Borders |
| Error container | `#ffdad6` | Error alerts bg |
| On error container | `#93000a` | Error text |
| Warning container | `#fffbeb` | Groq limit warning bg |
| On warning container | `#92400e` | Warning text |

**Source badges (pills in preview table):**
- `reddit` → soft orange
- `playstore` → soft green
- `appstore` → soft blue
- `spotify-community` → soft purple
- `social-media` → soft teal

## 2.2 Typography

- Font: **Geist Sans** (or Inter fallback)
- Hero title: 32px / semibold / on-surface — optional slow primary shimmer on headline
- Section title: 14px / semibold
- Body: 14px / regular / line-height 1.6
- Caption/meta: 11–12px / on-surface-variant
- Uppercase labels: 10px / medium / tracking-widest

## 2.3 Spacing & layout

- Page max width: **1152px** (`max-w-6xl`) for hero layout; **768px** (`max-w-3xl`) for preview/processing
- Gutter: 16px horizontal
- Card radius: 12px (`rounded-xl`)
- Card border: 1px outline-variant, subtle shadow
- Icon set: **Material Symbols Outlined** (24px default)

---

# 3. PAGE LAYOUT — DESKTOP (≥1024px)

## 3.1 Split hero layout

Two-column layout. **Left column is fixed** in the viewport while the right column scrolls.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Logo] ReviewLens     [New Analysis] [Repository] [Compare]  │  ← sticky top nav (56px)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─ FIXED HERO (left, ~42%) ─┐    ┌─ SCROLLABLE FORM (right, ~58%) ─┐ │
│   │                             │    │                                  │ │
│   │   [floating icon badge]     │    │  ┌─ Fetch live reviews card ──┐  │ │
│   │                             │    │  │ Sources · slider · filters │  │ │
│   │   Fetch & analyze reviews   │    │  │ [Fetch N reviews]          │  │ │
│   │   (shimmer title)           │    │  ├────────────────────────────┤  │ │
│   │                             │    │  │ Or import existing data    │  │ │
│   │   Subtitle paragraph…       │    │  │ [Upload CSV] [Saved corpus]│  │ │
│   │                             │    │  └────────────────────────────┘  │ │
│   │   • Live scrape…            │    │                                  │ │
│   │   • AI classification…      │    │  [Step indicator: 1·2·3]       │ │
│   │   • Persist runs…           │    │                                  │ │
│   │                             │    │  (footer scrolls below)          │ │
│   │   (ambient glow orbs)       │    │                                  │ │
│   └─────────────────────────────┘    └──────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Hero panel behavior:**
- `position: fixed` below nav (`top: 56px`)
- Vertically centered content in viewport band
- Center-aligned text and bullet list
- Soft blurred primary/secondary glow orbs behind text (subtle pulse)
- Floating icon badge (travel_explore) with gentle bob animation
- Title has slow horizontal shimmer sweep (primary highlight)

**Right column:**
- Form card scrolls independently
- Step indicator below form card, scrolls with form
- Footer at page bottom scrolls normally

## 3.2 Mobile / tablet (<1024px)

- Single column: hero stacks on top (not fixed), form below
- Nav labels collapse to icons on small screens
- Import cards stack vertically (not side-by-side)

---

# 4. GLOBAL COMPONENTS ON THIS PAGE

## 4.1 `AppHeader` (sticky top)

| Element | Spec |
|---------|------|
| Height | 56px |
| Background | White surface, bottom border outline-variant |
| Left | Logo square (indigo bg, insights icon) + "ReviewLens" + subtitle "New analysis" |
| Right | `AppNav` — 3 links with icons |

**Nav items:**
| Label | Icon | State |
|-------|------|-------|
| New Analysis | upload_file | **Active** (primary/10 bg, primary text) |
| Research Repository | history | Inactive |
| Compare Runs | compare | Inactive |

## 4.2 `AppFooter`

- Border-top, copyright line, Documentation / Privacy / Support links
- Scrolls with page content

## 4.3 `StepIndicator`

Horizontal 3-step progress below form (hero state) or below preview card:

| Step | Label |
|------|-------|
| 1 | Upload |
| 2 | Preview |
| 3 | Process |

- Active step: primary filled circle, ring glow, primary label
- Complete: primary circle with checkmark
- Pending: gray circle, 40% opacity

---

# 5. HERO COLUMN COMPONENTS

## 5.1 `HeroIntro` (fixed left panel)

| Element | Content |
|---------|---------|
| Icon badge | 48×48px rounded-2xl, primary/10 bg, travel_explore icon, float animation |
| Title | **Fetch & analyze reviews** |
| Subtitle | Scrape live from Play Store, Reddit, and more — or import a CSV / saved corpus, then classify and save to Turso. |
| Feature bullets (sm+ only) | travel_explore — Live scrape across multiple sources · psychology — AI classification with evidence quotes · database — Persist runs to your research repository |

**Entrance animation:** Staggered fade-in-up (icon → title → subtitle → bullets, 60ms stagger)

---

# 6. FORM CARD COMPONENTS (right column)

White card (`rounded-xl`, border, shadow). Contains all input methods.

## 6.1 `LiveFetchPanel` (priority mode — primary workflow)

### Panel header
| Element | Spec |
|---------|------|
| Icon box | 36×36px, primary bg, white travel_explore icon |
| Title | **Fetch live reviews** |

### Inner form panel
Light primary tint border (`primary/25`), very subtle primary/3% background.

#### A. Source selector (`SourceChipToggle`)

**Label row:** layers icon + "Sources"

**5 toggle chips** (multi-select, min 1, max 5):

| ID | Label | Icon |
|----|-------|------|
| playstore | Play Store | shop_two |
| appstore | App Store | shop_two |
| reddit | Reddit | forum |
| spotify-community | Spotify Community | groups |
| social-media | Social media | share |

- **Active:** primary border + primary fill + white text + shadow
- **Inactive:** outline border, hover primary/5 tint
- Tooltip on hover: source description

**Estimate bar** (below chips):
`50 reviews estimated · 1 source · max 5` — muted pill on surface-container-low

#### B. `FetchRangeControl` — Reviews per source

| Element | Spec |
|---------|------|
| Label | numbers icon + "Reviews per source" |
| Value badge | Primary pill showing current value + "REVIEWS" |
| Control row | [−] button · range slider · [+] button |
| Slider track | Gray track, primary gradient fill to current % |
| Slider thumb | 18px circle, primary border, white fill |
| Min/max labels | 10 and 1000 below slider ends |
| Default | 50 |
| Hint (dynamic) | When >200: warn about long fetch + Groq limits |

#### C. `FetchFiltersSection` (collapsible visual group)

Bordered sub-panel, filter_list icon + **FILTERS** uppercase label.
2-column grid on sm+.

**Conditional fields** (show only when relevant source selected):

| Field | Type | Options / spec |
|-------|------|----------------|
| Region | Select + hint below | All regions (default), United States, United Kingdom, Germany, India, Australia, Canada |
| Play Store sort | Select | Newest first, Highest rating, Most helpful |
| App Store sort | Select | Most recent, Most helpful |
| Minimum star rating | Chip row | Any, 1+, 2+, 3+, 4+, 5★ |
| Reddit keyword filter | Text input + clear | Placeholder: discover weekly, algorithm, radio… |

**Field shell:** rounded-lg border, focus ring primary/15
**Select:** custom chevron (expand_more) right-aligned
**Hints:** 11px text below field (not inside select)

#### D. Primary CTA

Full-width button, primary bg:
- Idle: travel_explore icon + **Fetch 50 reviews** (dynamic count)
- Loading: spinner + **Fetching live reviews…**
- Disabled: 60% opacity when no sources or busy

**Loading helper text below button:**
Scraping public APIs — large counts (500+) can take several minutes

## 6.2 Import divider

Horizontal rule + uppercase label: **OR IMPORT EXISTING DATA**

## 6.3 `FileUpload` (compact mode)

Dashed-border card, min-height 88px, horizontal layout:

| Zone | Content |
|------|---------|
| Icon box | upload_file, primary/10 or primary when dragging |
| Text | **Upload CSV** + "Drop file or click to browse" (or filename when selected) |
| Trailing | chevron_right |

States: default, hover (primary border tint), drag-over (primary border + primary/5 bg), disabled, parsing

## 6.4 `CorpusLoader` (compact mode)

Bordered card, min-height 88px:

| Row | Content |
|-----|---------|
| Header | **Saved corpus** + primary pill button **All (1,996)** with dataset icon |
| Chip row | Play Store · App Store · Reddit · Spotify Community · Social media |

Each chip shows review count. Loading state: inline spinner on active chip.

**Corpus files (mock data):**

| Label | Reviews |
|-------|---------|
| Full corpus (All) | 1,996 |
| Play Store | 600 |
| App Store | 441 |
| Reddit | 499 |
| Spotify Community | 265 |
| Social media | 191 |

## 6.5 `ErrorAlert`

Red-tinted rounded box below form when fetch/parse fails. `role="alert"`.

---

# 7. PREVIEW STATE (reviews loaded, not analyzing)

Replaces hero split with centered narrow layout (`max-w-3xl`). Form card shows:

## 7.1 `ReviewCountBar`

| Left | check_circle icon + **Loaded N reviews** · filename |
| Right | **Start over** text link |

## 7.2 `UploadPreview` table

| Column | Content |
|--------|---------|
| Source | SourceBadge pill |
| Review | Truncated text (~120 chars) |

- Shows 5 rows default
- Expand toggle: "Showing 5 of N reviews" / "Showing all N reviews"
- Row hover: surface-container-low

**Sample preview rows:**

| source | text |
|--------|------|
| playstore | The discovery tab is useless. Same playlists recycled over and over. |
| reddit | I keep hearing the same artists on my Discover Weekly every single week. |
| appstore | Love the app but I feel locked into one genre. Can't break out of my bubble. |
| reddit | After 5 years of using Spotify I feel like I've heard everything they have to offer me. |
| playstore | I want more control over how adventurous the recommendations are. |

## 7.3 `GroqEstimateBanner` (conditional)

**Warning variant** (exceeds free tier):
- Title: Groq free-tier limit
- Body: N reviews needs ~X tokens/day (limit 100K). Split into repository batches, USE_MOCK_CLASSIFIER=true, or reduce review count.

**Info variant** (within limit):
- Live LLM run: ~N Groq requests, ~M min (throttled for 12K tok/min).

## 7.4 `AnalyzeButton`

Full-width primary CTA: analytics icon + **Analyze & Save to Repository**

---

# 8. PROCESSING STATE

Form hidden. `LoadingState` component centered in card:

**Header:** Processing reviews / Classifying reviews and building research findings

**4 pipeline step cards** (vertical list):

| Step | Icon | Label |
|------|------|-------|
| 1 | table_view | Parsing CSV |
| 2 | psychology | Classifying reviews (+ progress bar when active) |
| 3 | hub | Aggregating patterns |
| 4 | cloud_upload | Saving to repository |

Step states: pending (faded), active (primary border/bg, pulsing icon), done (checkmark)

**Classifying progress bar:**
`Classifying 120 / 612 reviews (20%)` with shimmer fill animation

---

# 9. ANIMATIONS & MICRO-INTERACTIONS

| Element | Animation |
|---------|-----------|
| Hero content | Staggered fade-in-up on load |
| Hero icon badge | Gentle float (5s loop) |
| Hero glow orbs | Slow opacity/scale pulse |
| Hero title | Slow primary shimmer sweep (7s) |
| Form card | Fade-in-up with 120ms delay; hover: subtle primary shadow |
| Source/rating chips | 150ms border/bg transition |
| Fetch button | active:scale 0.99 |
| Upload drop zone | scale 1.01 on drag-over |
| Step indicator | 300ms opacity/ring transition |
| Loading steps | Staggered fade-in-up |

**Respect `prefers-reduced-motion`:** disable continuous loops (float, shimmer, glow).

---

# 10. SCREEN STATES TO PROTOTYPE

Generate interactive frames for all of these:

1. **A — Idle / hero + fetch form** (desktop split, Play Store selected, 50 reviews, All regions)
2. **B — Idle mobile** (stacked hero + form)
3. **C — Fetch loading** (spinner on Fetch button, helper text visible)
4. **D — Multi-source selected** (Play Store + Reddit + App Store, filters expanded, 200 on slider)
5. **E — Reviews loaded / preview** (612 reviews, table, Groq info line, Analyze CTA)
6. **F — Groq warning** (preview with amber warning banner)
7. **G — Processing / classifying** (step 2 active, progress bar at 35%)
8. **H — Error** (red alert: "CSV must include source and text columns")
9. **I — CSV parsing** (compact upload card in loading state)

---

# 11. RESPONSIVE RULES

| Breakpoint | Layout |
|------------|--------|
| ≥1280px | Wider column gap (64px), hero fixed width recalculated |
| ≥1024px | Split layout, fixed hero, 5/12 + 7/12 columns |
| 640–1023px | Single column, centered hero, 2-col import grid |
| <640px | Single column, nav icons only, import cards stack |

---

# 12. ACCESSIBILITY

- All icon buttons have `aria-label`
- Range slider: `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`
- Error alerts: `role="alert"`
- Focus rings: primary/18 ring on form controls
- Min touch target 44px on mobile
- Color + text for all states (never color-only)

---

# 13. DO NOT INCLUDE ON THIS PAGE

- Dashboard charts / findings (separate page)
- Login / auth
- Chat panel
- Dark mode toggle
- Spotify trademark logo
- Real API wiring (prototype interactions only)

---

# 14. DELIVERABLE

An **interactive multi-state prototype** of the Fetch & Analyze home page with:

- Sticky app header + footer
- Desktop fixed hero with animations
- Full live fetch form with all 5 sources and conditional filters
- Compact CSV upload + corpus loader
- Step indicator
- Preview + analyze state
- Processing pipeline UI
- Error state

Use the mock data and copy above verbatim. Prioritize **pixel-faithful structure** to the component inventory — every labeled field and chip should appear in the correct state.

---

## END OF PROMPT
