/**
 * TEMPORARY — Gemini classification validation (safe to delete after review).
 *
 * Usage: npx tsx scripts/validate-gemini-classification.mts
 */
import { join } from "path";
import { fileURLToPath } from "url";
import type { ClassificationItemInput } from "../lib/classify-normalize";
import { loadEnvLocal } from "../lib/env-loader";
import type { ClassifiedReview, RawReview } from "../lib/types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
loadEnvLocal(join(__dirname, ".."));

const {
  buildClassifyUserPrompt,
  CLASSIFY_SYSTEM_PROMPT,
} = await import("../lib/classify-prompt");
const { mergeClassificationItem } = await import("../lib/classify-normalize");
const { isMockClassifierEnabled } = await import("../lib/classify-mock");
const { createGeminiClient, generateJsonCompletion } = await import("../lib/gemini-client");
const { getGeminiApiKey, GEMINI_MODEL } = await import("../lib/gemini-config");
const { formatLlmError, shouldFallbackToMockOnLlmError } = await import("../lib/llm-errors");
const { normalizeTaxonomyFields } = await import("../lib/taxonomy");

const GEMINI_MODEL_NAME = GEMINI_MODEL;

const TAXONOMY_FIELDS = [
  "theme",
  "behavior",
  "segment",
  "barrier",
  "root_cause",
  "unmet_need",
] as const;

const FALLBACK_SIGNATURE = {
  theme: "Other Discovery Frustration",
  root_cause: "Unclear Repetition Cause",
  unmet_need: "General Discovery Improvement",
  barrier: "Unclear Discovery Struggle",
};

interface TestCase {
  id: string;
  title: string;
  text: string;
  expected: Partial<{
    discovery_relevant: boolean;
    theme: string;
    behavior: string;
    segment: string;
    barrier: string;
    root_cause: string;
    unmet_need: string;
  }>;
}

const TEST_CASES: TestCase[] = [
  {
    id: "1",
    title: "REPETITION FATIGUE",
    text: "Spotify keeps recommending the same artists and songs I've already listened to hundreds of times. Discover Weekly feels repetitive and rarely introduces genuinely new music.",
    expected: {
      discovery_relevant: true,
      theme: "Repetition Fatigue",
      barrier: "Low Novelty",
      root_cause: "Similarity-Based Reinforcement",
      unmet_need: "Better Artist Discovery",
    },
  },
  {
    id: "2",
    title: "POSITIVE DISCOVERY",
    text: "Discover Weekly has introduced me to dozens of artists I now listen to every day. It's one of Spotify's best features.",
    expected: {
      discovery_relevant: true,
      theme: "Positive Discovery Experience",
    },
  },
  {
    id: "3",
    title: "PREMIUM COMPLAINT",
    text: "Spotify is unusable without Premium. Too many ads and I can't choose songs freely.",
    expected: { discovery_relevant: false },
  },
  {
    id: "4",
    title: "BUG REPORT",
    text: "Search is broken. Every time I open an artist page Spotify says something went wrong.",
    expected: { discovery_relevant: false },
  },
  {
    id: "5",
    title: "GENRE LOCK-IN",
    text: "Spotify only recommends mainstream pop. No matter what I do, it never helps me discover music outside that genre.",
    expected: {
      discovery_relevant: true,
      theme: "Genre Lock-In",
      barrier: "Genre Saturation",
      root_cause: "Limited Exploration Strategy",
    },
  },
  {
    id: "6",
    title: "POOR RECOMMENDATION QUALITY",
    text: "Smart Shuffle keeps inserting completely unrelated tracks into my playlist.",
    expected: {
      discovery_relevant: true,
      theme: "Poor Recommendation Quality",
      barrier: "Poor Context Awareness",
      unmet_need: "Discovery Control",
    },
  },
];

function extractJson(content: string): { classifications?: ClassificationItemInput[] } {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as { classifications?: ClassificationItemInput[] };
}

function toRawReviews(cases: TestCase[]): RawReview[] {
  return cases.map((tc) => ({
    review_id: `validate-${tc.id}`,
    source: "validation",
    text: tc.text,
  }));
}

function printRow(label: string, value: unknown) {
  console.log(`  ${label.padEnd(22)} ${value}`);
}

function compareField(
  field: string,
  actual: unknown,
  expected: unknown,
): { match: boolean; note?: string } {
  if (expected === undefined) return { match: true };
  const a = String(actual ?? "");
  const e = String(expected);
  if (a === e) return { match: true };
  // Known taxonomy remap: positive praise theme is not in closed enum
  if (field === "theme" && e === "Positive Discovery Experience") {
    return {
      match: a === e,
      note:
        a !== e
          ? `expected canonical theme Positive Discovery Experience, got ${a}`
          : undefined,
    };
  }
  if (field === "barrier" && e === "Poor Context Awareness" && a === "Poor Personalization Context") {
    return { match: true, note: "canonical alias: Poor Context Awareness → Poor Personalization Context" };
  }
  return { match: false };
}

function isMockLikeOutput(review: ClassifiedReview): boolean {
  if (!review.discovery_relevant) return false;
  return (
    review.theme === FALLBACK_SIGNATURE.theme &&
    review.root_cause === FALLBACK_SIGNATURE.root_cause &&
    review.unmet_need === FALLBACK_SIGNATURE.unmet_need &&
    (review.confidence ?? 1) <= 0.55
  );
}

function countFallbackDominance(classified: ClassifiedReview[]): number {
  const discovery = classified.filter((r) => r.discovery_relevant);
  if (discovery.length === 0) return 0;
  let hits = 0;
  for (const r of discovery) {
    for (const field of TAXONOMY_FIELDS) {
      const val = r[field];
      if (val === FALLBACK_SIGNATURE[field as keyof typeof FALLBACK_SIGNATURE]) hits++;
    }
  }
  return hits;
}

async function main() {
  console.log("=".repeat(72));
  console.log("GEMINI CLASSIFICATION VALIDATION");
  console.log("=".repeat(72));
  console.log(`Model:                ${GEMINI_MODEL_NAME}`);
  console.log(`USE_MOCK_CLASSIFIER:  ${process.env.USE_MOCK_CLASSIFIER ?? "(unset)"}`);
  console.log(`Mock env enabled:     ${isMockClassifierEnabled()}`);
  console.log(`API key present:      ${Boolean(getGeminiApiKey())}`);
  console.log("");

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error("FAIL: GEMINI_API_KEY not set in .env.local");
    process.exit(1);
  }
  if (isMockClassifierEnabled()) {
    console.error("FAIL: USE_MOCK_CLASSIFIER=true — would bypass Gemini in production routes.");
    process.exit(1);
  }

  const reviews = toRawReviews(TEST_CASES);
  const client = createGeminiClient(apiKey);

  let rawContent = "";
  let geminiReachable = false;
  let structuredJson = false;
  let mockFallbackTriggered = false;
  let geminiError: string | undefined;

  try {
    console.log("Calling Gemini (single batch, same path as lib/classify.ts)...\n");
    rawContent = await generateJsonCompletion(
      client,
      CLASSIFY_SYSTEM_PROMPT,
      buildClassifyUserPrompt(reviews),
      0.2,
    );
    geminiReachable = true;
    console.log("--- RAW GEMINI RESPONSE (before post-processing) ---");
    console.log(rawContent);
    console.log("--- END RAW RESPONSE ---\n");
  } catch (error) {
    geminiError = formatLlmError(error);
    mockFallbackTriggered = shouldFallbackToMockOnLlmError(error);
    console.error(`Gemini call failed: ${geminiError}`);
    console.error(`Would production fallback to mock? ${mockFallbackTriggered}`);
    printReport({
      geminiReachable,
      structuredJson,
      mockFallbackTriggered,
      classified: [],
      mismatches: TEST_CASES.length,
      geminiError,
    });
    process.exit(1);
  }

  let parsed: { classifications?: ClassificationItemInput[] };
  try {
    parsed = extractJson(rawContent);
    structuredJson = Array.isArray(parsed.classifications) && parsed.classifications.length === reviews.length;
  } catch (error) {
    console.error("FAIL: Could not parse Gemini JSON:", error);
    printReport({
      geminiReachable,
      structuredJson: false,
      mockFallbackTriggered: false,
      classified: [],
      mismatches: TEST_CASES.length,
      geminiError: String(error),
    });
    process.exit(1);
  }

  if (!structuredJson) {
    console.error(
      `FAIL: Expected ${reviews.length} classifications, got ${parsed.classifications?.length ?? 0}`,
    );
    process.exit(1);
  }

  const classified: ClassifiedReview[] = [];
  let totalMismatches = 0;
  const perCaseResults: {
    caseId: string;
    mismatches: string[];
    mockLike: boolean;
  }[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const rawItem = parsed.classifications![i]!;
    const review = reviews[i]!;

    console.log("=".repeat(72));
    console.log(`TEST REVIEW ${tc.id} — ${tc.title}`);
    console.log("=".repeat(72));
    console.log(`Text: ${tc.text}\n`);

    console.log("--- Raw classification item from Gemini ---");
    console.log(JSON.stringify(rawItem, null, 2));

    const taxonomyInput = {
      theme: rawItem.theme,
      behavior: rawItem.behavior,
      emotion: rawItem.emotion,
      segment: rawItem.segment,
      barrier: rawItem.barrier,
      root_cause: rawItem.root_cause,
      unmet_need: rawItem.unmet_need,
    };
    const { fields: normalizedFields, violations } = normalizeTaxonomyFields(taxonomyInput, i);

    if (violations.length === 0) {
      console.log("\n--- Taxonomy normalization ---");
      console.log("  (no remapping — all labels already canonical)");
    } else {
      console.log("\n--- Taxonomy normalization / remapping ---");
      for (const v of violations) {
        console.log(
          `  ${v.field}: "${v.rawValue}" → "${v.mappedTo}" (${v.reason})`,
        );
      }
    }

    const { review: finalReview } = mergeClassificationItem(review, rawItem, i);
    classified.push(finalReview);

    const output = {
      discovery_relevant: finalReview.discovery_relevant,
      theme: finalReview.theme,
      behavior: finalReview.behavior,
      segment: finalReview.segment,
      barrier: finalReview.barrier,
      root_cause: finalReview.root_cause,
      unmet_need: finalReview.unmet_need,
      confidence: finalReview.confidence,
      model_used: GEMINI_MODEL_NAME,
      fallback_used: false,
    };

    console.log("\n--- Final classified output ---");
    for (const [k, v] of Object.entries(output)) {
      printRow(k, v);
    }

    console.log("\n--- Expected vs actual ---");
    const mismatches: string[] = [];
    for (const [field, expected] of Object.entries(tc.expected)) {
      const actual = (finalReview as unknown as Record<string, unknown>)[field];
      const { match, note } = compareField(field, actual, expected);
      const status = match ? "✓" : "✗";
      const line = `${status} ${field}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`;
      console.log(`  ${line}${note ? ` — ${note}` : ""}`);
      if (!match) mismatches.push(`${field}: expected ${expected}, got ${actual}`);
    }

    const mockLike = isMockLikeOutput(finalReview);
    if (mockLike) {
      mismatches.push("output matches mock fallback signature (Other Discovery Frustration + low confidence)");
    }
    perCaseResults.push({ caseId: tc.id, mismatches, mockLike });
    totalMismatches += mismatches.length;

    if (mismatches.length > 0) {
      console.log("\n  MISMATCHES:");
      for (const m of mismatches) console.log(`    - ${m}`);
    } else {
      console.log("\n  All checked fields match expectations.");
    }
    console.log("");
  }

  printReport({
    geminiReachable,
    structuredJson,
    mockFallbackTriggered,
    classified,
    mismatches: totalMismatches,
    perCaseResults,
  });
}

interface ReportInput {
  geminiReachable: boolean;
  structuredJson: boolean;
  mockFallbackTriggered: boolean;
  classified: ClassifiedReview[];
  mismatches: number;
  perCaseResults?: { caseId: string; mismatches: string[]; mockLike: boolean }[];
  geminiError?: string;
}

function printReport(input: ReportInput) {
  const {
    geminiReachable,
    structuredJson,
    mockFallbackTriggered,
    classified,
    mismatches,
    perCaseResults = [],
    geminiError,
  } = input;

  const discoveryRelevant = classified.filter((r) => r.discovery_relevant);
  const excluded = classified.filter((r) => !r.discovery_relevant);

  const review1 = classified[0];
  const review2 = classified[1];
  const review3 = classified[2];
  const review4 = classified[3];
  const review5 = classified[4];
  const review6 = classified[5];

  const positiveDiscoveryOk =
    review2?.discovery_relevant === true &&
    (review2.theme !== FALLBACK_SIGNATURE.theme || (review2.confidence ?? 0) > 0.55);

  const premiumExcluded = review3?.discovery_relevant === false;
  const bugExcluded = review4?.discovery_relevant === false;

  const taxonomyReasonable =
    discoveryRelevant.length > 0 &&
    discoveryRelevant.filter((r) => r.theme === FALLBACK_SIGNATURE.theme).length <
      discoveryRelevant.length;

  const fallbackDominated = countFallbackDominance(classified);
  const mockLikeAny = perCaseResults.some((r) => r.mockLike);

  const checks: { label: string; pass: boolean; detail?: string }[] = [
    { label: "Gemini reachable?", pass: geminiReachable, detail: geminiError },
    { label: "Gemini returned structured JSON?", pass: structuredJson },
    { label: "Mock fallback triggered?", pass: !mockFallbackTriggered && !mockLikeAny },
    { label: "Discovery filter working?", pass: review1?.discovery_relevant === true && review5?.discovery_relevant === true },
    { label: "Positive discovery detected?", pass: positiveDiscoveryOk },
    { label: "Premium reviews excluded?", pass: premiumExcluded },
    { label: "Bug reviews excluded?", pass: bugExcluded },
    { label: "Taxonomy labels reasonable?", pass: taxonomyReasonable },
    {
      label: "Any field dominated by fallback categories?",
      pass: fallbackDominated < discoveryRelevant.length * 2,
      detail: `${fallbackDominated} fallback-label field hits across ${discoveryRelevant.length} discovery reviews`,
    },
  ];

  const allPass = checks.every((c) => c.pass) && mismatches === 0;

  console.log("=".repeat(72));
  console.log(`VALIDATION REPORT: ${allPass ? "PASS" : "FAIL"}`);
  console.log("=".repeat(72));
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"} — ${c.label}${c.detail ? ` (${c.detail})` : ""}`);
  }
  console.log(`\nTotal field mismatches vs expectations: ${mismatches}`);
  console.log(`Model used: ${GEMINI_MODEL_NAME}`);
  console.log(`fallback_used: false (script calls Gemini directly; mock classifier not invoked)`);
  if (excluded.length > 0) {
    console.log(`\nExcluded (discovery_relevant=false): reviews ${excluded.map((r) => r.review_id).join(", ")}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
