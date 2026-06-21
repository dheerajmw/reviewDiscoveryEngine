import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { classifyReviewsMock } from "../lib/classify-mock";
import { aggregateReviews } from "../lib/aggregation";
import { buildResearchFindings } from "../lib/findings";
import type { RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
const raw = readFileSync(csvPath, "utf8");
const parsed = Papa.parse<Record<string, string>>(raw, {
  header: true,
  skipEmptyLines: true,
});

const reviews: RawReview[] = parsed.data.slice(0, 20).map((row) => ({
  source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
  text: row.text?.replace(/^"|"$/g, "") ?? "",
}));

const classified = classifyReviewsMock(reviews);
const aggregation = aggregateReviews(classified);
const findings = buildResearchFindings(aggregation);

console.log(
  JSON.stringify(
    {
      note: "First 20 data rows from docs/review-corpus/all-reviews.csv; classified with USE_MOCK_CLASSIFIER=true (same as demo mode). POST /api/aggregate returns the aggregation object directly; POST /api/findings wraps findings.",
      reviewCount: reviews.length,
      "POST /api/aggregate": aggregation,
      "POST /api/findings": { findings },
    },
    null,
    2,
  ),
);
