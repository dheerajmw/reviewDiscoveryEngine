/**
 * Taxonomy bucket audit — top 20 per category with precision estimates.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { classifyReviewsMockWithReport } from "../lib/classify-mock";
import type { ClassifiedReview, RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

type BucketKey =
  | "Repetition Fatigue"
  | "Genre Lock-In"
  | "Lack of Discovery Control"
  | "Similarity-Based Reinforcement"
  | "Adjustable Novelty"
  | "Discovery Control";

const BUCKET_FIELD: Record<
  BucketKey,
  "theme" | "root_cause" | "unmet_need"
> = {
  "Repetition Fatigue": "theme",
  "Genre Lock-In": "theme",
  "Lack of Discovery Control": "theme",
  "Similarity-Based Reinforcement": "root_cause",
  "Adjustable Novelty": "unmet_need",
  "Discovery Control": "unmet_need",
};

/** Strict ground-truth patterns per bucket (PM intent) */
const GROUND_TRUTH: Record<
  BucketKey,
  { strong: RegExp[]; weak: RegExp[]; anti: RegExp[] }
> = {
  "Repetition Fatigue": {
    strong: [
      /\bsame (song|artist|music|things?|playlist)\b/i,
      /\brepeat(ing|s|ed)?\b/i,
      /\bregurgitat/i,
      /\bheard (it|everything|them) (all|before|again)\b/i,
      /\brecycled?\b/i,
      /\bon repeat\b/i,
      /\bshuffle.*same\b/i,
      /\bplays? the same \d+/i,
    ],
    weak: [/\bstuck\b/i, /\bover and over\b/i, /\bagain and again\b/i],
    anti: [/^(?!.*\b(same|repeat|regurgitat|recycled|shuffle)\b).*/i],
  },
  "Genre Lock-In": {
    strong: [
      /\bgenre\b.*\b(bubble|locked|lock-in|same|one type|stuck)\b/i,
      /\bfilter bubble\b/i,
      /\b(one|same) genre\b/i,
      /\bbreak out of\b/i,
      /\bonly (plays?|recommend|suggest).*genre\b/i,
    ],
    weak: [/\bgenre\b/i, /\bbubble\b/i],
    anti: [],
  },
  "Lack of Discovery Control": {
    strong: [
      /\b(no|lack|want|need|wish).{0,30}\bcontrol\b/i,
      /\bsteer (the )?(algorithm|recommendations?)\b/i,
      /\bnovelty slider\b/i,
      /\badjust.{0,20}(novelty|adventurous|exploration)\b/i,
      /\bchoose.{0,30}(recommend|discover|explore)\b/i,
      /\bdon't let (me|you) choose\b/i,
      /\bcan't (choose|pick|select|control)\b/i,
    ],
    weak: [/\bcontrol\b/i, /\bslider\b/i, /\bdial\b/i],
    anti: [],
  },
  "Similarity-Based Reinforcement": {
    strong: [
      /\bsame (artist|song|music|things?)\b/i,
      /\bregurgitat/i,
      /\bsimilar (artist|song|music)\b/i,
      /\bfilter bubble\b/i,
      /\bcollaborative filter/i,
      /\bhistory.{0,30}(recommend|suggest)/i,
      /\b(listen|played).{0,40}same\b/i,
    ],
    weak: [/\brepeat/i, /\brecycled/i, /\bfamiliar\b/i],
    anti: [],
  },
  "Adjustable Novelty": {
    strong: [
      /\bnovelty slider\b/i,
      /\badjust.{0,20}novelty\b/i,
      /\bmore (new|fresh|novel)\b/i,
      /\bfresh artist/i,
      /\bnew artist/i,
      /\bintroduce.{0,20}new\b/i,
      /\bvariety\b/i,
      /\bdiscover new\b/i,
    ],
    weak: [/\bnovelty\b/i, /\bexploration\b/i, /\badventurous\b/i],
    anti: [],
  },
  "Discovery Control": {
    strong: [
      /\bcontrol.{0,30}(recommend|discover|explore|algorithm)/i,
      /\bsteer.{0,30}(recommend|discover|algorithm)/i,
      /\bchoose.{0,30}(song|artist|recommend)/i,
      /\bdon't let (me|you) choose\b/i,
      /\bcan't choose\b/i,
      /\buser control\b/i,
      /\black of control\b/i,
    ],
    weak: [/\bcontrol\b/i, /\bchoose\b/i, /\bsteer\b/i],
    anti: [],
  },
};

function groundTruthLabel(
  text: string,
  bucket: BucketKey,
): "true_positive" | "weak_match" | "false_positive" | "ambiguous" {
  const gt = GROUND_TRUTH[bucket];
  const hasStrong = gt.strong.some((p) => p.test(text));
  const hasWeak = gt.weak.some((p) => p.test(text));

  if (hasStrong) return "true_positive";
  if (hasWeak) return "weak_match";
  return "false_positive";
}

function suggestBucket(text: string, current: BucketKey): string | null {
  const scores: { bucket: BucketKey; score: number }[] = [];
  for (const bucket of Object.keys(GROUND_TRUTH) as BucketKey[]) {
    if (bucket === current) continue;
    const gt = GROUND_TRUTH[bucket];
    const score =
      gt.strong.filter((p) => p.test(text)).length * 2 +
      gt.weak.filter((p) => p.test(text)).length;
    if (score > 0) scores.push({ bucket, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score >= 2 ? scores[0].bucket : null;
}

function formatReview(r: ClassifiedReview, row: number) {
  return {
    row,
    source: r.source,
    discovery_relevant: r.discovery_relevant,
    text: r.text,
    labels: {
      theme: r.theme,
      behavior: r.behavior,
      emotion: r.emotion,
      segment: r.segment,
      barrier: r.barrier,
      root_cause: r.root_cause,
      unmet_need: r.unmet_need,
    },
    confidence: r.confidence,
  };
}

const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
const raw = readFileSync(csvPath, "utf8");
const parsed = Papa.parse<Record<string, string>>(raw, {
  header: true,
  skipEmptyLines: true,
});

const reviews: (RawReview & { row: number })[] = parsed.data.map((row, i) => ({
  row: i + 2,
  source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
  text: row.text?.replace(/^"|"$/g, "") ?? "",
}));

const { classified, taxonomyReport } = classifyReviewsMockWithReport(reviews);

const indexed = classified.map((r, i) => ({ review: r, row: reviews[i].row }));

const output: Record<string, unknown> = {
  corpusSize: reviews.length,
  classifier: "USE_MOCK_CLASSIFIER=true (keyword mock + taxonomy validation)",
  taxonomyReportSummary: {
    otherUnknownRate: taxonomyReport.otherUnknownRate,
    fallbackRate: taxonomyReport.fallbackRate,
  },
  buckets: {} as Record<string, unknown>,
};

for (const bucket of Object.keys(BUCKET_FIELD) as BucketKey[]) {
  const field = BUCKET_FIELD[bucket];
  const matches = indexed
    .filter(({ review }) => review[field] === bucket)
    .sort((a, b) => b.review.confidence - a.review.confidence);

  const top20 = matches.slice(0, 20).map(({ review, row }) => {
    const gt = groundTruthLabel(review.text, bucket);
    const alt = gt !== "true_positive" ? suggestBucket(review.text, bucket) : null;
    return {
      ...formatReview(review, row),
      groundTruthAssessment: gt,
      suggestedBucket: alt,
      auditNote:
        gt === "false_positive"
          ? `Likely misclassified — no strong ${bucket} signal in text`
          : gt === "weak_match"
            ? "Ambiguous — partial keyword overlap only"
            : gt === "ambiguous"
              ? "Ambiguous classification"
              : null,
    };
  });

  const tp = matches.filter(({ review }) =>
    groundTruthLabel(review.text, bucket) === "true_positive",
  ).length;
  const weak = matches.filter(({ review }) =>
    groundTruthLabel(review.text, bucket) === "weak_match",
  ).length;
  const fp = matches.filter(({ review }) =>
    groundTruthLabel(review.text, bucket) === "false_positive",
  ).length;
  const amb = matches.filter(({ review }) =>
    groundTruthLabel(review.text, bucket) === "ambiguous",
  ).length;

  const precisionStrict = matches.length ? tp / matches.length : null;
  const precisionLenient = matches.length ? (tp + weak) / matches.length : null;

  const misclassified = top20.filter((r) => r.groundTruthAssessment === "false_positive");
  const ambiguous = top20.filter(
    (r) =>
      r.groundTruthAssessment === "weak_match" ||
      r.groundTruthAssessment === "ambiguous",
  );
  const shouldMove = top20.filter((r) => r.suggestedBucket !== null);

  (output.buckets as Record<string, unknown>)[bucket] = {
    field,
    totalInCorpus: matches.length,
    top20,
    audit: {
      misclassifications: misclassified.map((r) => ({
        row: r.row,
        text: r.text.slice(0, 120) + (r.text.length > 120 ? "…" : ""),
        reason: r.auditNote,
        suggestedBucket: r.suggestedBucket,
      })),
      ambiguous: ambiguous.map((r) => ({
        row: r.row,
        text: r.text.slice(0, 120) + (r.text.length > 120 ? "…" : ""),
        assessment: r.groundTruthAssessment,
      })),
      shouldMoveToDifferentBucket: shouldMove.map((r) => ({
        row: r.row,
        current: bucket,
        suggested: r.suggestedBucket,
        text: r.text.slice(0, 100) + (r.text.length > 100 ? "…" : ""),
      })),
    },
    precisionEstimate: {
      strict: precisionStrict !== null ? Math.round(precisionStrict * 1000) / 1000 : null,
      lenient_including_weak: precisionLenient !== null ? Math.round(precisionLenient * 1000) / 1000 : null,
      counts: { true_positive: tp, weak_match: weak, false_positive: fp, ambiguous: amb, total: matches.length },
      methodology:
        "Regex ground-truth patterns on review text; strict = strong signal only; lenient = strong + weak",
    },
  };
}

console.log(JSON.stringify(output, null, 2));
