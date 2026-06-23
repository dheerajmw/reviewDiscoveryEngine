/**
 * Before/after taxonomy evaluation on 100 random discovery reviews.
 * Usage: npx tsx scripts/taxonomy-evaluation-before-after.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { loadEnvLocal } from "../lib/env-loader";
import {
  FALLBACK_LABELS,
  isTaxonomyFallbackLabel,
  OTHER_UNKNOWN_LABELS,
} from "../lib/taxonomy";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvLocal(join(__dirname, ".."));

const SAMPLE_SIZE = 100;
const SEED = 20260621;
const BEFORE_PATH = join(
  __dirname,
  "../docs/evaluation/classification-sample-100-distribution.json",
);

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let s = seed >>> 0;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function distribution(labels: string[]) {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      percent: `${pct(count, labels.length)}%`,
    }));
}

function metrics(classified: import("../lib/types").ClassifiedReview[]) {
  const research = classified.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
  const n = research.length;
  const themes = research.map((r) => r.theme);
  const barriers = research.map((r) => r.barrier);
  const rootCauses = research.map((r) => r.root_cause);
  const unmetNeeds = research.map((r) => r.unmet_need);

  const fallbackReviewCount = research.filter((r) =>
    [r.theme, r.barrier, r.root_cause, r.unmet_need, r.segment].some((f) =>
      OTHER_UNKNOWN_LABELS.has(f),
    ),
  ).length;

  const maxBucket = Math.max(
    ...[themes, barriers, rootCauses, unmetNeeds].flatMap((arr) => {
      const c = new Map<string, number>();
      for (const l of arr) c.set(l, (c.get(l) ?? 0) + 1);
      return [...c.values()].map((v) => pct(v, n));
    }),
    0,
  );

  return {
    n,
    otherDiscoveryFrustrationPct: pct(
      themes.filter((t) => t === FALLBACK_LABELS.theme).length,
      n,
    ),
    generalDiscoveryImprovementPct: pct(
      unmetNeeds.filter((u) => u === FALLBACK_LABELS.unmet_need).length,
      n,
    ),
    unclearDiscoveryStrugglePct: pct(
      barriers.filter((b) => b === FALLBACK_LABELS.barrier).length,
      n,
    ),
    unclearRepetitionCausePct: pct(
      rootCauses.filter((r) => r === FALLBACK_LABELS.root_cause).length,
      n,
    ),
    positiveDiscoveryCount: themes.filter(
      (t) => t === "Positive Discovery Experience",
    ).length,
    fallbackReviewPct: pct(fallbackReviewCount, n),
    maxSingleBucketPct: maxBucket,
    distributions: {
      theme: distribution(themes),
      barrier: distribution(barriers),
      root_cause: distribution(rootCauses),
      unmet_need: distribution(unmetNeeds),
    },
  };
}

async function classifySample(
  sample: import("../lib/types").RawReview[],
): Promise<import("../lib/types").ClassifiedReview[]> {
  const { classifyReviews } = await import("../lib/classify");
  const { getLlmApiKey } = await import("../lib/llm-config");
  const {
    DEFAULT_CLASSIFY_BATCH_SIZE,
    getClassifyBatchDelayMs,
  } = await import("../lib/llm-limits");

  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY required");

  const classified: import("../lib/types").ClassifiedReview[] = [];
  const batchSize = DEFAULT_CLASSIFY_BATCH_SIZE;
  const delayMs = getClassifyBatchDelayMs(batchSize);

  for (let i = 0; i < sample.length; i += batchSize) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    const batch = sample.slice(i, i + batchSize);
    console.error(`Classifying batch ${Math.floor(i / batchSize) + 1}…`);
    let attempt = 0;
    while (attempt < 8) {
      try {
        const result = await classifyReviews(batch, apiKey);
        classified.push(...result.classified);
        break;
      } catch (error) {
        attempt++;
        const msg = error instanceof Error ? error.message : String(error);
        const retryable = /503|high demand|rate limit|resource exhausted/i.test(msg);
        if (!retryable || attempt >= 8) throw error;
        const wait = 20_000 * attempt;
        console.error(`  retry ${attempt} in ${wait / 1000}s: ${msg.slice(0, 80)}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  return classified;
}

async function main() {
  const beforeRaw = JSON.parse(readFileSync(BEFORE_PATH, "utf8"));
  const beforeMetrics = {
    otherDiscoveryFrustrationPct: beforeRaw.goals.otherDiscoveryFrustrationPct,
    generalDiscoveryImprovementPct: beforeRaw.goals.generalDiscoveryImprovementPct,
    unclearDiscoveryStrugglePct: pct(
      beforeRaw.distributions.barrier.find(
        (b: { label: string }) => b.label === "Unclear Discovery Struggle",
      )?.count ?? 0,
      beforeRaw.meta.classifiedAsResearch,
    ),
    unclearRepetitionCausePct: beforeRaw.goals.maxSingleBucketPct >= 60
      ? beforeRaw.distributions.root_cause.find(
          (r: { label: string }) => r.label === "Unclear Repetition Cause",
        )?.count /
        beforeRaw.meta.classifiedAsResearch *
        100
      : 63.2,
    positiveDiscoveryCount: 0,
    fallbackReviewPct: beforeRaw.goals.unclearCategoryPct ?? 78.9,
    n: beforeRaw.meta.classifiedAsResearch,
    distributions: beforeRaw.distributions,
  };

  const { curateReviews } = await import("../lib/review-curation");
  const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
  const parsed = Papa.parse<Record<string, string>>(readFileSync(csvPath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  const allReviews = parsed.data.map((row, i) => ({
    review_id: `corpus-${i + 1}`,
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));

  const curation = await curateReviews(allReviews);
  const sample = seededShuffle(curation.included, SEED).slice(0, SAMPLE_SIZE);
  console.error(
    `Corpus discovery pool: ${curation.included.length} → sample ${sample.length}`,
  );

  const classified = await classifySample(sample);
  const after = metrics(classified);

  const falsePositiveRate = pct(
    sample.length - after.n,
    sample.length,
  );

  const auditSample = classified
    .filter((r) => r.research_relevant !== false && r.discovery_relevant)
    .slice(0, 50)
    .map((r) => ({
      text: r.text.slice(0, 220),
      theme: r.theme,
      root_cause: r.root_cause,
      unmet_need: r.unmet_need,
      classification_reasons: r.classification_reasons,
      confidence: r.confidence,
    }));

  const goals = {
    otherDiscoveryFrustration: after.otherDiscoveryFrustrationPct < 25,
    generalDiscoveryImprovement: after.generalDiscoveryImprovementPct < 15,
    unclearDiscoveryStruggle: after.unclearDiscoveryStrugglePct < 25,
    unclearRepetitionCause: after.unclearRepetitionCausePct < 20,
    positiveDiscoveryPresent: after.positiveDiscoveryCount > 0,
    fallbackReviews: after.fallbackReviewPct < 40,
    maxSingleBucket: after.maxSingleBucketPct < 30,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSize: SAMPLE_SIZE,
    seed: SEED,
    corpusDiscoveryPool: curation.included.length,
    curationExcludedFromSample: sample.length,
    falsePositiveDiscoveryRatePct: falsePositiveRate,
    before: beforeMetrics,
    after,
    goals,
    allGoalsPass: Object.values(goals).every(Boolean),
    auditSample,
    remainingFallbacks: after.distributions,
  };

  const outDir = join(__dirname, "../docs/evaluation");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "taxonomy-before-after-100.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  const mdPath = join(outDir, "taxonomy-before-after-100.md");
  const md = `# Taxonomy Before/After — 100 Review Sample

## Summary
- **All goals pass:** ${report.allGoalsPass ? "YES" : "NO"}
- **False-positive discovery rate:** ${falsePositiveRate}% (curated sample → LLM rejected)
- **Corpus discovery pool:** ${curation.included.length} (was 779)

## Metric Comparison

| Metric | Before | After | Target | Pass |
|--------|--------|-------|--------|------|
| Other Discovery Frustration | ${beforeMetrics.otherDiscoveryFrustrationPct?.toFixed?.(1) ?? beforeMetrics.otherDiscoveryFrustrationPct}% | ${after.otherDiscoveryFrustrationPct}% | <25% | ${goals.otherDiscoveryFrustration ? "✓" : "✗"} |
| General Discovery Improvement | ${beforeMetrics.generalDiscoveryImprovementPct?.toFixed?.(1) ?? beforeMetrics.generalDiscoveryImprovementPct}% | ${after.generalDiscoveryImprovementPct}% | <15% | ${goals.generalDiscoveryImprovement ? "✓" : "✗"} |
| Unclear Discovery Struggle | ${typeof beforeMetrics.unclearDiscoveryStrugglePct === "number" ? beforeMetrics.unclearDiscoveryStrugglePct.toFixed(1) : beforeMetrics.unclearDiscoveryStrugglePct}% | ${after.unclearDiscoveryStrugglePct}% | <25% | ${goals.unclearDiscoveryStruggle ? "✓" : "✗"} |
| Unclear Repetition Cause | 63.2% | ${after.unclearRepetitionCausePct}% | <20% | ${goals.unclearRepetitionCause ? "✓" : "✗"} |
| Positive Discovery Experience | 0 | ${after.positiveDiscoveryCount} | >0 | ${goals.positiveDiscoveryPresent ? "✓" : "✗"} |
| Reviews w/ fallback bucket | 78.9% | ${after.fallbackReviewPct}% | <40% | ${goals.fallbackReviews ? "✓" : "✗"} |

## After — Theme Distribution
${after.distributions.theme.map((d) => `- ${d.label}: ${d.count} (${d.percent})`).join("\n")}

## After — Root Cause Distribution
${after.distributions.root_cause.map((d) => `- ${d.label}: ${d.count} (${d.percent})`).join("\n")}

## After — Unmet Need Distribution
${after.distributions.unmet_need.map((d) => `- ${d.label}: ${d.count} (${d.percent})`).join("\n")}
`;
  writeFileSync(mdPath, md, "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.error(`\nWrote ${outPath} and ${mdPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
