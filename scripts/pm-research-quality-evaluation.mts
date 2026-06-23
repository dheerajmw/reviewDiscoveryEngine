/**
 * PM Research Quality Validation — full evaluation pipeline.
 *
 * Classifies:
 *   - 100 random discovery reviews (curation included)
 *   - 50 random non-discovery reviews (curation excluded)
 *   - 50 manual edge cases
 *
 * Usage:
 *   npx tsx scripts/pm-research-quality-evaluation.mts
 *   npx tsx scripts/pm-research-quality-evaluation.mts --mock
 *   npx tsx scripts/pm-research-quality-evaluation.mts --discovery-only 20
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { loadEnvLocal } from "../lib/env-loader";
import {
  buildPmResearchQualityReport,
  enrichWithCuration,
  formatPmResearchQualityMarkdown,
  type EvaluatedReview,
} from "../lib/pm-research-quality";
import { POSITIVE_DISCOVERY_CORPUS } from "../lib/quality/positive-discovery-corpus";
import { PM_RESEARCH_EDGE_CASES } from "./pm-research-edge-cases";
import type { ClassifiedReview, RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvLocal(join(__dirname, ".."));

const SEED = 20260621;
const DISCOVERY_SAMPLE = 100;
const NON_DISCOVERY_SAMPLE = 50;
const EDGE_CASE_COUNT = 50;

const OUT_JSON = join(
  __dirname,
  "../docs/evaluation/pm-research-quality-report.json",
);
const OUT_MD = join(
  __dirname,
  "../docs/evaluation/pm-research-quality-report.md",
);

function parseArgs() {
  const args = process.argv.slice(2);
  const mock = args.includes("--mock");
  const discoveryOnlyIdx = args.indexOf("--discovery-only");
  const discoveryOnly =
    discoveryOnlyIdx >= 0 ? Number(args[discoveryOnlyIdx + 1]) : null;
  return { mock, discoveryOnly };
}

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

async function classifyBatch(
  reviews: RawReview[],
  mode: "gemini" | "mock",
): Promise<ClassifiedReview[]> {
  if (mode === "mock") {
    const { classifyReviewsMockWithReport } = await import("../lib/classify-mock");
    return classifyReviewsMockWithReport(reviews).classified;
  }

  const { classifyReviews } = await import("../lib/classify");
  const { getLlmApiKey } = await import("../lib/llm-config");
  const {
    DEFAULT_CLASSIFY_BATCH_SIZE,
    getClassifyBatchDelayMs,
  } = await import("../lib/llm-limits");

  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY required (or use --mock)");

  const classified: ClassifiedReview[] = [];
  const batchSize = DEFAULT_CLASSIFY_BATCH_SIZE;
  const delayMs = getClassifyBatchDelayMs(batchSize);

  for (let i = 0; i < reviews.length; i += batchSize) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
    const batch = reviews.slice(i, i + batchSize);
    console.error(
      `Classifying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(reviews.length / batchSize)} (${batch.length} reviews)…`,
    );
    let attempt = 0;
    while (attempt < 8) {
      try {
        const result = await classifyReviews(batch, apiKey);
        classified.push(...result.classified);
        break;
      } catch (error) {
        attempt++;
        const msg = error instanceof Error ? error.message : String(error);
        const retryable = /503|high demand|rate limit|resource exhausted|429/i.test(
          msg,
        );
        if (!retryable || attempt >= 8) throw error;
        const wait = 20_000 * attempt;
        console.error(`  retry ${attempt} in ${wait / 1000}s: ${msg.slice(0, 100)}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  return classified;
}

function toRawReview(
  item: EvaluatedReview,
): RawReview {
  return {
    review_id: item.eval_id,
    source: item.source,
    text: item.text,
    cleaned_text: item.cleaned_text,
    primary_category: item.primary_category,
    discovery_outcome: item.discovery_outcome,
    user_goal: item.user_goal,
  };
}

async function main() {
  const { mock, discoveryOnly } = parseArgs();
  const classifierMode: "gemini" | "mock" = mock ? "mock" : "gemini";
  const warnings: string[] = [];

  const discoveryN = discoveryOnly ?? DISCOVERY_SAMPLE;
  const nonDiscoveryN = discoveryOnly != null ? 0 : NON_DISCOVERY_SAMPLE;
  const edgeN = discoveryOnly != null ? 0 : EDGE_CASE_COUNT;

  if (discoveryOnly != null) {
    warnings.push(
      `--discovery-only ${discoveryOnly}: partial run (no non-discovery or edge cases).`,
    );
  }

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

  const { curateReviews } = await import("../lib/review-curation");
  const curation = await curateReviews(allReviews);

  const discoverySample = seededShuffle(curation.included, SEED).slice(
    0,
    discoveryN,
  );
  const nonDiscoverySample = seededShuffle(curation.excluded, SEED + 1).slice(
    0,
    nonDiscoveryN,
  );
  const edgeCases = PM_RESEARCH_EDGE_CASES.slice(0, edgeN);

  console.error(
    `Corpus: ${allReviews.length} total, ${curation.included.length} discovery, ${curation.excluded.length} excluded`,
  );
  console.error(
    `Sample: ${discoverySample.length} discovery + ${nonDiscoverySample.length} non-discovery + ${edgeCases.length} edge cases`,
  );

  const evaluatedBase: Omit<
    EvaluatedReview,
    "curation_discovery_relevant" | "curation_reason"
  >[] = [
    ...discoverySample.map((r, i) => ({
      eval_id: `disc-${i + 1}`,
      cohort: "discovery_sample" as const,
      source: r.source,
      text: r.text,
      expected_discovery_relevant: true,
      review_id: `disc-${i + 1}`,
    })),
    ...nonDiscoverySample.map((r, i) => ({
      eval_id: `nondisc-${i + 1}`,
      cohort: "non_discovery_sample" as const,
      source: r.source,
      text: r.text,
      expected_discovery_relevant: false,
      review_id: `nondisc-${i + 1}`,
    })),
    ...edgeCases.map((e) => ({
      eval_id: e.id,
      cohort: "edge_case" as const,
      source: e.source,
      text: e.text,
      expected_discovery_relevant: e.expected_discovery_relevant,
      edge_category: e.category,
      expected_theme: e.expected_theme,
      review_id: e.id,
    })),
  ];

  const evaluated = enrichWithCuration(evaluatedBase);
  const rawForClassify = evaluated.map(toRawReview);

  const classified = await classifyBatch(rawForClassify, classifierMode);

  console.error(`Classifying ${POSITIVE_DISCOVERY_CORPUS.length} positive-discovery validation reviews…`);
  const positiveDiscoveryClassified = await classifyBatch(
    POSITIVE_DISCOVERY_CORPUS.map((review) => ({
      review_id: review.id,
      source: review.source,
      text: review.text,
    })),
    classifierMode,
  );

  if (classified.length !== evaluated.length) {
    warnings.push(
      `Classification count mismatch: expected ${evaluated.length}, got ${classified.length}`,
    );
  }

  const model =
    classifierMode === "mock"
      ? "mock-classifier"
      : (process.env.GROQ_MODEL ?? process.env.LLM_MODEL ?? "llama-3.3-70b-versatile");

  const report = buildPmResearchQualityReport({
    evaluated,
    classified,
    positiveDiscoveryClassified,
    model,
    classifierMode,
    seed: SEED,
    corpusStats: {
      totalLoaded: allReviews.length,
      curationIncluded: curation.included.length,
      curationExcluded: curation.excluded.length,
    },
    warnings,
  });

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, formatPmResearchQualityMarkdown(report), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.error(`\nWrote ${OUT_JSON}`);
  console.error(`Wrote ${OUT_MD}`);
  console.error(
    `\nPM Readiness Score: ${report.pmReadinessScore.score}/10 — ${report.pmReadinessScore.rationale}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
