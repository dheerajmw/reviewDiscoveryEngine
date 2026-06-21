/**
 * Before/after classification evaluation on a 100-review sample.
 *
 * Usage:
 *   npx tsx scripts/classification-evaluation.ts
 *   npx tsx scripts/classification-evaluation.ts --sample-size 100
 *   npx tsx scripts/classification-evaluation.ts --mock-after   # skip LLM, use new mock only
 */
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { classifyReviewsBaseline } from "../lib/classify-baseline";
import { classifyReviewsMockWithReport } from "../lib/classify-mock";
import { classifyReviews } from "../lib/classify";
import {
  buildClassificationAuditRecords,
  buildConfidenceHistogram,
  buildFieldConfidenceHistogram,
} from "../lib/classification-audit";
import { loadEnvLocal } from "../lib/env-loader";
import { getGeminiApiKey, GEMINI_MODEL } from "../lib/gemini-config";
import { measureAllBucketPrecision } from "../lib/evaluation-ground-truth";
import type { RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnvLocal(join(__dirname, ".."));

const SAMPLE_SIZE = Number(process.argv.find((a) => a.startsWith("--sample-size="))?.split("=")[1] ?? 100);
const USE_MOCK_AFTER = process.argv.includes("--mock-after");
import {
  DEFAULT_CLASSIFY_BATCH_SIZE,
  estimateLlmClassification,
  getClassifyBatchDelayMs,
} from "../lib/llm-limits";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadSampleReviews(size: number): RawReview[] {
  const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
  const raw = readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.slice(0, size).map((row) => ({
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));
}

async function classifyWithLlm(reviews: RawReview[]): Promise<Awaited<ReturnType<typeof classifyReviews>>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY required. Set in .env.local or use --mock-after.");
  }

  const allClassified: Awaited<ReturnType<typeof classifyReviews>>["classified"] = [];
  const allViolations: Awaited<ReturnType<typeof classifyReviews>>["taxonomyReport"]["violations"] = [];

  for (let i = 0; i < reviews.length; i += DEFAULT_CLASSIFY_BATCH_SIZE) {
    if (i > 0) await sleep(getClassifyBatchDelayMs(DEFAULT_CLASSIFY_BATCH_SIZE));
    const batch = reviews.slice(i, i + DEFAULT_CLASSIFY_BATCH_SIZE);
    process.stderr.write(
      `Classifying batch ${i / DEFAULT_CLASSIFY_BATCH_SIZE + 1}/${Math.ceil(reviews.length / DEFAULT_CLASSIFY_BATCH_SIZE)}…\n`,
    );
    const result = await classifyReviews(batch, apiKey);
    allClassified.push(...result.classified);
    allViolations.push(...result.taxonomyReport.violations);
  }

  const { buildTaxonomyReport } = await import("../lib/taxonomy");
  return {
    classified: allClassified,
    taxonomyReport: buildTaxonomyReport(allClassified, allViolations),
  };
}

function summarizePrecision(label: string, results: ReturnType<typeof measureAllBucketPrecision>) {
  const avgStrict =
    results.filter((r) => r.precisionStrict !== null).reduce((a, r) => a + (r.precisionStrict ?? 0), 0) /
    (results.filter((r) => r.precisionStrict !== null).length || 1);

  return {
    label,
    buckets: results,
    averageStrictPrecision: Math.round(avgStrict * 1000) / 1000,
    bucketsMeeting70Target: results.filter((r) => r.meetsTarget70).length,
  };
}

async function main() {
  const reviews = loadSampleReviews(SAMPLE_SIZE);

  process.stderr.write(`Evaluating ${reviews.length} reviews…\n`);

  const beforeClassified = classifyReviewsBaseline(reviews);
  const beforePrecision = measureAllBucketPrecision(beforeClassified, {
    discoveryRelevantOnly: true,
  });

  let afterClassified;
  let afterMode: string;

  if (USE_MOCK_AFTER) {
    afterClassified = classifyReviewsMockWithReport(reviews).classified;
    afterMode = "new mock (independent fields, no inheritance)";
  } else {
    afterMode = `LLM (${GEMINI_MODEL} via Gemini)`;
    const llmResult = await classifyWithLlm(reviews);
    afterClassified = llmResult.classified;
  }

  const afterPrecision = measureAllBucketPrecision(afterClassified, {
    discoveryRelevantOnly: true,
  });
  const confidenceHistogram = buildConfidenceHistogram(afterClassified);
  const fieldConfidenceHistogram = buildFieldConfidenceHistogram(afterClassified);
  const auditRecords = buildClassificationAuditRecords(afterClassified);

  const output = {
    sampleSize: reviews.length,
    discoveryRelevantInSample: afterClassified.filter((r) => r.discovery_relevant).length,
    precisionScope: "discovery_relevant reviews only",
    before: {
      classifier: "baseline (keyword theme + inheritance chains + keyword discovery filter)",
      ...summarizePrecision("before", beforePrecision),
    },
    after: {
      classifier: afterMode,
      ...summarizePrecision("after", afterPrecision),
      confidenceHistogram,
      fieldConfidenceHistogram,
      flatConfidenceWarning:
        confidenceHistogram.high === 0 &&
        confidenceHistogram.medium === 0 &&
        confidenceHistogram.low === reviews.length
          ? "All confidences are identical — distribution is flat."
          : confidenceHistogram.high + confidenceHistogram.medium === 0
            ? "No high/medium confidence scores — review calibration."
            : null,
    },
    delta: beforePrecision.map((before, i) => ({
      bucket: before.bucket,
      beforeStrict: before.precisionStrict,
      afterStrict: afterPrecision[i].precisionStrict,
      improvement:
        before.precisionStrict !== null && afterPrecision[i].precisionStrict !== null
          ? Math.round((afterPrecision[i].precisionStrict! - before.precisionStrict) * 1000) / 1000
          : null,
    })),
    targetMet: afterPrecision.every((r) => r.precisionStrict === null || r.precisionStrict >= 0.7),
  };

  const outDir = join(__dirname, "../docs/evaluation");
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(outDir, `classification-eval-${timestamp}.json`);
  const auditPath = join(outDir, `classification-audit-${timestamp}.json`);

  writeFileSync(reportPath, JSON.stringify(output, null, 2));
  writeFileSync(auditPath, JSON.stringify(auditRecords, null, 2));

  console.log(JSON.stringify({ ...output, reportPath, auditPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
