/**
 * Fetch N reviews per store, apply discovery keyword filter, export rejected rows.
 *
 * Usage:
 *   npx tsx scripts/export-rejected-discovery-filter.mts
 *   npx tsx scripts/export-rejected-discovery-filter.mts --limit 100 --output docs/evaluation/rejected.csv
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { matchesDiscoveryCollectionSignal } from "../lib/fetch/discovery-collection";
import { fetchAppStoreReviews, fetchPlayStoreReviews } from "../lib/fetch/fetchers";
import type { FetchedReviewRow } from "../lib/fetch/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 100;
  let output = join(
    ROOT,
    "docs/evaluation/rejected-discovery-keyword-filter-live-100each.csv",
  );

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = Math.max(1, Number(args[++i]) || limit);
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[++i]!;
    }
  }

  return { limit, output };
}

function rejectedRows(rows: FetchedReviewRow[]): FetchedReviewRow[] {
  return rows.filter((row) => !matchesDiscoveryCollectionSignal(row.text));
}

function toCsv(rows: FetchedReviewRow[]): string {
  return Papa.unparse(
    rows.map((row) => ({
      source: row.source,
      text: row.text,
      rating: row.rating ?? "",
      date: row.date ?? "",
      url: row.url ?? "",
    })),
    { quotes: true },
  );
}

async function main() {
  const { limit, output } = parseArgs();

  console.log(`Fetching ${limit} Play Store + ${limit} App Store reviews…`);

  const [playRows, appRows] = await Promise.all([
    fetchPlayStoreReviews({
      limit,
      sort: "newest",
      region: "global",
      minRating: 0,
    }),
    fetchAppStoreReviews({
      limit,
      sort: "recent",
      region: "global",
      minRating: 0,
    }),
  ]);

  const all = [...playRows, ...appRows];
  const rejected = rejectedRows(all);
  const kept = all.length - rejected.length;

  const summary = {
    fetchedAt: new Date().toISOString(),
    limitPerSource: limit,
    playstore: {
      raw: playRows.length,
      rejected: rejectedRows(playRows).length,
      kept: playRows.length - rejectedRows(playRows).length,
    },
    appstore: {
      raw: appRows.length,
      rejected: rejectedRows(appRows).length,
      kept: appRows.length - rejectedRows(appRows).length,
    },
    combined: {
      raw: all.length,
      rejected: rejected.length,
      kept,
      rejectionRatePct:
        all.length > 0
          ? Math.round((rejected.length / all.length) * 1000) / 10
          : 0,
    },
    outputCsv: output,
  };

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, toCsv(rejected), "utf8");

  const summaryPath = output.replace(/\.csv$/i, ".json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${rejected.length} rejected reviews → ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
