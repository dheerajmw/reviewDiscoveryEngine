# Taxonomy Refactor — Closed PM Research Taxonomy

## A. Current taxonomy (before)

| Dimension | Old values | Problems |
|-----------|------------|----------|
| **Theme** | Repetition Fatigue, Genre Lock-in, Discovery Failure, Algorithm Distrust, Control Gap, Playlist Stagnation, Exploration Limits, **Other** | Free-form; mock defaulted to "Exploration Limits"; "Other" unactionable |
| **Barrier** | Low novelty, No control, Trust issues, Algorithm opacity, Content overload, **Other** | Inconsistent casing; no closed enum |
| **Behavior** | Free-form phrases ("Listening and evaluating recommendations") | Not aggregatable |
| **Emotion** | Lowercase free-form (frustration, disappointment) | Not standardized |
| **Segment** | Long-term user, Explorer, Power listener, Casual | Missing discovery-focused segments |
| **Root cause** | **One-sentence hypothesis** (free text) | Cannot aggregate; duplicates barrier/theme |
| **Unmet need** | **Free-form sentence** | Cannot compare across corpus |

**Additional issues:** No validation layer; LLM could invent labels; no fallback logging; no taxonomy distribution report.

---

## B. Proposed taxonomy (implemented)

All dimensions are **closed enums** — classifier must choose exactly one value per field.

### Theme (8)
`Repetition Fatigue` · `Genre Lock-In` · `Lack of Discovery Control` · `Poor Recommendation Quality` · `Trust Gap` · `Discovery Outside Platform` · `Positive Discovery Experience` · `Other Discovery Issue`

### Barrier (8)
`Low Novelty` · `Similar Artist Loop` · `Genre Saturation` · `Lack of Exploration Controls` · `Poor Context Awareness` · `Discovery Surface Ineffectiveness` · `Cold Start Discovery` · `Unknown Barrier`

### Behavior (7)
`Active Exploration` · `Passive Listening` · `Mood Listening` · `Familiarity Seeking` · `Social Discovery` · `Recommendation Evaluation` · `Playlist Consumption`

### Emotion (8)
`Frustration` · `Disappointment` · `Boredom` · `Confusion` · `Delight` · `Satisfaction` · `Curiosity` · `Neutral`

### Segment (7)
`Long-Term Power Listener` · `Music Explorer` · `Casual Listener` · `Playlist Listener` · `Discovery-Focused Listener` · `New User` · `Unknown Segment`

### Unmet need (8)
`Adjustable Novelty` · `Discovery Control` · `Explainable Recommendations` · `Better Artist Discovery` · `Cross-Genre Exploration` · `Human-Like Curation` · `Context-Aware Discovery` · `Better Discovery Surfaces`

### Root cause (8)
`Similarity-Based Reinforcement` · `Engagement Optimization Bias` · `Lack of User Steering Signals` · `Limited Exploration Strategy` · `Weak Context Understanding` · `Insufficient Novelty Injection` · `Discovery Surface Design Issues` · `Unknown Root Cause`

**Fallback buckets (target <10% combined on discovery-relevant reviews):**
- Theme: `Other Discovery Issue`
- Barrier: `Unknown Barrier`
- Segment: `Unknown Segment`
- Root cause: `Unknown Root Cause`

---

## C. Classification prompt changes

**File:** `lib/classify-prompt.ts`

| Before | After |
|--------|-------|
| "Use this taxonomy where possible" | "MUST output exact enum labels — no free-form" |
| root_cause / unmet_need as sentences | Enum labels only |
| 4 themes + Other | Full 8-value theme taxonomy injected via `formatTaxonomyForPrompt()` |
| No validation instructions | "Prefer specific themes over Other Discovery Issue" |

The system prompt now embeds the complete closed taxonomy and an example JSON with canonical labels.

---

## D. Validation layer changes

**New file:** `lib/taxonomy.ts`

```
Raw LLM/mock output
  → validateTaxonomyLabel(field, raw, reviewText)
      1. Exact match (valid enum)
      2. Alias map (legacy labels → canonical)
      3. Keyword scoring on review text → closest valid label
      4. Field-specific fallback enum
  → logTaxonomyViolation() on any remap
  → buildTaxonomyReport() for distribution + fallback metrics
```

**Integrated in:**
- `lib/classify.ts` — normalizes every LLM classification batch
- `lib/classify-mock.ts` — keyword rules output canonical enums only
- `app/api/classify/route.ts` — returns `{ classified, taxonomyReport, mock }`

**TaxonomyReport fields:**
- `distribution` / `distributionPct` — % per category per dimension
- `fallbackRate` — % of labels remapped via alias/keyword/fallback
- `otherUnknownRate` — % in Other/Unknown buckets (computed on **discovery-relevant** reviews only)
- `violations[]` — audit log of every remap

---

## E. Example outputs — 20 real corpus reviews

Dataset: first 20 rows of `docs/review-corpus/all-reviews.csv` (mock classifier).

### Taxonomy report (discovery-relevant subset)

| Dimension | Top labels |
|-----------|------------|
| Theme | Other Discovery Issue (50%), Repetition Fatigue (17%), Poor Recommendation Quality (17%) |
| Barrier | Unknown Barrier (50%), Similar Artist Loop (17%) |
| Behavior | Recommendation Evaluation (83%), Familiarity Seeking (17%) |
| Segment | Casual Listener (83%), Playlist Listener (17%) |
| Root cause | Unknown Root Cause (50%), Similarity-Based Reinforcement (17%) |
| Unmet need | Better Discovery Surfaces (50%), Adjustable Novelty (17%) |

**Metrics:** `fallbackRate: 0%` · `otherUnknownRate: ~35%` on discovery-relevant slice (above 10% target — see improvements)

### Sample classifications

**Row 20 — TRUE discovery signal**
```json
{
  "discovery_relevant": true,
  "theme": "Repetition Fatigue",
  "behavior": "Familiarity Seeking",
  "emotion": "Neutral",
  "segment": "Playlist Listener",
  "barrier": "Similar Artist Loop",
  "root_cause": "Similarity-Based Reinforcement",
  "unmet_need": "Adjustable Novelty",
  "confidence": 0.55
}
```

**Row 6 — Ads + recommendation keyword collision**
```json
{
  "discovery_relevant": true,
  "theme": "Poor Recommendation Quality",
  "behavior": "Recommendation Evaluation",
  "emotion": "Frustration",
  "barrier": "Unknown Barrier",
  "root_cause": "Limited Exploration Strategy",
  "unmet_need": "Better Discovery Surfaces"
}
```

**Row 2 — Non-discovery (correctly excluded from aggregation)**
```json
{
  "discovery_relevant": false,
  "theme": "Lack of Discovery Control",
  "behavior": "Recommendation Evaluation",
  "barrier": "Lack of Exploration Controls",
  "root_cause": "Lack of User Steering Signals",
  "unmet_need": "Discovery Control"
}
```

Reproduce:
```bash
USE_MOCK_CLASSIFIER=true npx tsx scripts/taxonomy-sample-output.ts
```

---

## Remaining improvements (to hit <10% Other/Unknown)

1. **Strict discovery relevance filter** — stop classifying non-discovery reviews into discovery themes (pair with taxonomy refactor)
2. **Non-discovery skip** — when `discovery_relevant: false`, skip theme/barrier inference or use sentinel excluded from aggregation
3. **Richer mock keyword rules** — map ads/billing/crash reviews before theme inference
4. **LLM mode** — with OpenRouter, enum-only prompt + validation should outperform mock on full corpus
5. **Review-level confidence** — separate `discovery_relevance_confidence` from classification confidence
