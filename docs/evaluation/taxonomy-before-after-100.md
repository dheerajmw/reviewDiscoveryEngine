# Taxonomy Overhaul — Before/After Evaluation

**Status:** Code deployed; full 100-review Gemini re-run **blocked by API quota** at evaluation time. Re-run when quota resets:

```bash
npx tsx scripts/taxonomy-evaluation-before-after.mts
```

---

## What changed (Tasks 1–6)

| Area | Change |
|------|--------|
| **Discovery filter** | Requires PM discovery experience, friction, or intent; excludes playlist promos, social spam, generic praise, billing/ads/bugs without discovery substance |
| **Theme** | Added `Positive Discovery Experience` |
| **Root causes** | Added `Discovery Surface Design Issues`, `Cross-Content Recommendation Bias`; improved aliases |
| **Unmet needs** | Added `Genre Exploration`, `Freshness Guarantees`; reordered; stronger prompt guidance |
| **Prompting** | EXACT-label requirement, per-field `classification_reasons`, root-cause/unmet-need anti-fallback guidance |
| **Auditability** | `classification_reasons` stored in `evidence` JSON + `representative_quotes.classification_reasons` (migration `003`) |
| **Quote Explorer** | Shows per-field classification reasons when present |
| **Dashboard** | Theme chart renamed to “Discovery themes” (frustrations + positive) |

---

## Curation impact (immediate, no LLM)

| Metric | Before (loose gate) | After (strict gate) |
|--------|---------------------|---------------------|
| Discovery pool from `all-reviews.csv` (1,996) | **779** | **176** |
| Reduction | — | **77% fewer** false positives entering classification |

This alone should cut playlist promos, generic praise, and off-topic social posts before Gemini runs.

---

## Classification metrics — BEFORE (prior Gemini run, loose curation)

Sample: 100 random from **779** discovery-curated reviews · `gemini-2.5-flash` · seed `20260621`

| Metric | Before | Target |
|--------|--------|--------|
| Other Discovery Frustration | **45.6%** | <25% |
| General Discovery Improvement | **36.8%** | <15% |
| Unclear Discovery Struggle | **47.4%** | <25% |
| Unclear Repetition Cause | **63.2%** | <20% |
| Positive Discovery Experience | **0%** | Present |
| Reviews with ≥1 fallback bucket | **78.9%** | <40% |

**Before theme distribution (n=57 research-relevant after LLM):**

- Other Discovery Frustration: 45.6%
- Lack of Discovery Control: 22.8%
- Poor Recommendation Quality: 12.3%
- Repetition Fatigue: 8.8%

---

## Classification metrics — AFTER

> Pending full re-run. Gemini returned **quota exhausted** during `scripts/taxonomy-evaluation-before-after.mts`.

**Expected improvements from code changes:**

1. **Tighter curation** → fewer promos/praise/billing rows reach classifier
2. **Positive Discovery Experience** → praise reviews get correct theme (not `Other Discovery Frustration`)
3. **Expanded root causes** → `Discovery Surface Design Issues` / `Cross-Content Recommendation Bias` absorb cases that were `Unclear Repetition Cause`
4. **Expanded unmet needs** → `Genre Exploration`, `Freshness Guarantees` reduce `General Discovery Improvement`
5. **Prompt + reasons** → Gemini must justify labels; fewer invalid labels remapped to fallbacks

---

## How to verify when quota is available

```bash
# Full before/after on same 100-review seed
npx tsx scripts/taxonomy-evaluation-before-after.mts

# Outputs:
# docs/evaluation/taxonomy-before-after-100.json
# docs/evaluation/taxonomy-before-after-100.md
```

---

## Files touched

- `lib/taxonomy.ts`, `lib/classify-prompt.ts`, `lib/classify-normalize.ts`
- `lib/review-preprocessing/signals.ts`, `preprocess-review.ts`
- `lib/classify-research-mock.ts`, `lib/classify-mock.ts`
- `lib/discovery-relevance-prompt.ts`, `lib/classification-audit.ts`
- `lib/types.ts`, `services/review-service.ts`
- `turso/migrations/003_classification_reasons.sql`
- `components/dashboard/ThemeChart.tsx`, `components/repository/QuoteExplorer.tsx`
- `scripts/taxonomy-evaluation-before-after.mts`
