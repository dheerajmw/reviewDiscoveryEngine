/**
 * TEMPORARY — Classify 100 random discovery-relevant reviews and report taxonomy distributions.
 * Usage: npx tsx scripts/sample-classification-distribution.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { loadEnvLocal } from "../lib/env-loader";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvLocal(join(__dirname, ".."));

const SAMPLE_SIZE = 100;
const SEED = 20260621;

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

function pct(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function distribution(
  labels: string[],
): { label: string; count: number; percent: string }[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = labels.length;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percent: pct(count, total) }));
}

const OTHER_UNKNOWN = new Set([
  "Other Discovery Frustration",
  "Unclear Discovery Struggle",
  "Unspecified Segment",
  "Unclear Repetition Cause",
  "General Discovery Improvement",
]);

async function main() {
  const { curateReviews } = await import("../lib/review-curation");
  const { classifyReviews } = await import("../lib/classify");
  const { getLlmApiKey, LLM_MODEL } = await import("../lib/llm-config");
  const {
    DEFAULT_CLASSIFY_BATCH_SIZE,
    getClassifyBatchDelayMs,
  } = await import("../lib/llm-limits");
  type RawReview = import("../lib/types").RawReview;
  type ClassifiedReview = import("../lib/types").ClassifiedReview;

  const model = LLM_MODEL;
  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY required");

  const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
  const raw = readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  const allReviews: RawReview[] = parsed.data.map((row, i) => ({
    review_id: `corpus-${i + 1}`,
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));

  const curation = await curateReviews(allReviews);
  const discoveryPool = curation.included;
  console.error(
    `Corpus: ${allReviews.length} loaded, ${discoveryPool.length} discovery-relevant after curation`,
  );

  const sample = seededShuffle(discoveryPool, SEED).slice(0, SAMPLE_SIZE);
  console.error(`Sampled ${sample.length} reviews (seed=${SEED})`);

  const classified: ClassifiedReview[] = [];
  const batchSize = DEFAULT_CLASSIFY_BATCH_SIZE;
  const delayMs = getClassifyBatchDelayMs(batchSize);

  async function classifyBatchWithRetry(batch: RawReview[], attempt = 0): Promise<ClassifiedReview[]> {
    const maxAttempts = 6;
    try {
      const result = await classifyReviews(batch, apiKey!);
      return result.classified;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("503") ||
        message.includes("high demand") ||
        message.includes("rate limit") ||
        message.includes("resource exhausted");
      if (!retryable || attempt >= maxAttempts - 1) throw error;
      const wait = 15_000 * (attempt + 1);
      console.error(`  Batch failed (${message.slice(0, 80)}…), retry in ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
      return classifyBatchWithRetry(batch, attempt + 1);
    }
  }

  for (let i = 0; i < sample.length; i += batchSize) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    const batch = sample.slice(i, i + batchSize);
    console.error(
      `Classifying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sample.length / batchSize)}…`,
    );
    const result = await classifyBatchWithRetry(batch);
    classified.push(...result);
  }

  const research = classified.filter((r) => r.research_relevant !== false && r.discovery_relevant);
  const n = research.length;

  const themes = research.map((r) => r.theme);
  const barriers = research.map((r) => r.barrier);
  const rootCauses = research.map((r) => r.root_cause);
  const unmetNeeds = research.map((r) => r.unmet_need);

  const otherFrustration = themes.filter((t) => t === "Other Discovery Frustration").length;
  const generalImprovement = unmetNeeds.filter((u) => u === "General Discovery Improvement").length;
  const unclearAny = research.filter((r) =>
    [r.theme, r.barrier, r.root_cause, r.unmet_need, r.segment].some((f) =>
      OTHER_UNKNOWN.has(f),
    ),
  ).length;

  const positiveRaw = classified.filter((r) =>
    /positive|praise|strong discovery|satisfaction/i.test(
      [r.observation, r.discovery_reason, r.theme].filter(Boolean).join(" "),
    ) || (r.discovery_outcome === "successful" && r.discovery_relevant),
  );

  const report = {
    meta: {
      model,
      sampleSize: sample.length,
      classifiedAsResearch: n,
      excludedByClassifier: classified.length - n,
      seed: SEED,
      corpusDiscoveryPool: discoveryPool.length,
      generatedAt: new Date().toISOString(),
    },
    goals: {
      otherDiscoveryFrustrationPct: (otherFrustration / n) * 100,
      otherDiscoveryFrustrationPass: otherFrustration / n < 0.25,
      generalDiscoveryImprovementPct: (generalImprovement / n) * 100,
      generalDiscoveryImprovementPass: generalImprovement / n < 0.25,
      maxSingleBucketPct: Math.max(
        ...[themes, barriers, rootCauses, unmetNeeds].flatMap((arr) => {
          const counts = new Map<string, number>();
          for (const l of arr) counts.set(l, (counts.get(l) ?? 0) + 1);
          return [...counts.values()].map((c) => (c / n) * 100);
        }),
      ),
      maxSingleBucketPass:
        Math.max(
          ...[themes, barriers, rootCauses, unmetNeeds].flatMap((arr) => {
            const counts = new Map<string, number>();
            for (const l of arr) counts.set(l, (counts.get(l) ?? 0) + 1);
            return [...counts.values()].map((c) => (c / n) * 100);
          }),
        ) < 30,
      positiveDiscoverySignals: positiveRaw.length,
      unclearCategoryPct: (unclearAny / n) * 100,
    },
    distributions: {
      theme: distribution(themes),
      barrier: distribution(barriers),
      root_cause: distribution(rootCauses),
      unmet_need: distribution(unmetNeeds),
    },
    fallbackRates: {
      otherDiscoveryFrustration: { count: otherFrustration, percent: pct(otherFrustration, n) },
      generalDiscoveryImprovement: { count: generalImprovement, percent: pct(generalImprovement, n) },
      anyUnclearOrUnknown: { count: unclearAny, percent: pct(unclearAny, n) },
    },
    evidenceByTheme: Object.fromEntries(
      distribution(themes)
        .filter((d) => d.count >= 3)
        .map(({ label }) => {
          const matches = research
            .filter((r) => r.theme === label)
            .slice(0, 10)
            .map((r) => ({
              source: r.source,
              text: r.text.slice(0, 280),
              barrier: r.barrier,
              root_cause: r.root_cause,
              unmet_need: r.unmet_need,
              confidence: r.confidence,
            }));
          return [label, matches];
        }),
    ),
    classified,
  };

  const outDir = join(__dirname, "../docs/evaluation");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "classification-sample-100-distribution.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.error(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
