import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { classifyReviewsMockWithReport } from "../lib/classify-mock";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
const raw = readFileSync(csvPath, "utf8");
const parsed = Papa.parse<Record<string, string>>(raw, {
  header: true,
  skipEmptyLines: true,
});

const reviews = parsed.data.slice(0, 20).map((row, i) => ({
  row: i + 2,
  source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
  text: row.text?.replace(/^"|"$/g, "") ?? "",
}));

const { classified, taxonomyReport } = classifyReviewsMockWithReport(reviews);

console.log(
  JSON.stringify(
    {
      dataset: "First 20 rows, docs/review-corpus/all-reviews.csv",
      taxonomyReport: {
        distributionPct: taxonomyReport.distributionPct,
        fallbackRate: taxonomyReport.fallbackRate,
        otherUnknownRate: taxonomyReport.otherUnknownRate,
        fallbacksByField: taxonomyReport.fallbacksByField,
        violationCount: taxonomyReport.violations.length,
      },
      classifications: classified.map((r, i) => ({
        row: reviews[i].row,
        source: r.source,
        discovery_relevant: r.discovery_relevant,
        theme: r.theme,
        behavior: r.behavior,
        emotion: r.emotion,
        segment: r.segment,
        barrier: r.barrier,
        root_cause: r.root_cause,
        unmet_need: r.unmet_need,
        confidence: r.confidence,
        textPreview: r.text.slice(0, 100) + (r.text.length > 100 ? "…" : ""),
      })),
    },
    null,
    2,
  ),
);
