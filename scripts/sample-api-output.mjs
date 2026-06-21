/**
 * Runs 20 corpus reviews through classify → aggregate → findings
 * (same logic as POST /api/aggregate and POST /api/findings)
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Dynamic import of TS modules via tsx-compatible path — use compiled approach
const csvPath = join(root, "docs/review-corpus/all-reviews.csv");
const raw = readFileSync(csvPath, "utf8");
const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
const reviews = parsed.data.slice(0, 20).map((row) => ({
  source: String(row.source ?? "unknown").replace(/^"|"$/g, ""),
  text: String(row.text ?? "").replace(/^"|"$/g, ""),
}));

console.error(`Loaded ${reviews.length} reviews from corpus\n`);

// Inline minimal pipeline using same modules — invoke via child tsx on a .ts runner
import { spawnSync } from "child_process";
const runner = join(__dirname, "sample-api-output-runner.ts");
const result = spawnSync("npx", ["tsx", runner], {
  cwd: root,
  input: JSON.stringify(reviews),
  encoding: "utf8",
  env: { ...process.env, USE_MOCK_CLASSIFIER: "true" },
});
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(1);
}
console.log(result.stdout);
