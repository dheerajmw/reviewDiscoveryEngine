import type { ClassifiedReview } from "./types";

export type EvalBucketKey =
  | "Repetition Fatigue"
  | "Genre Lock-In"
  | "Discovery Control"
  | "Similarity-Based Reinforcement"
  | "Adjustable Novelty";

export const EVAL_BUCKET_FIELD: Record<
  EvalBucketKey,
  "theme" | "root_cause" | "unmet_need"
> = {
  "Repetition Fatigue": "theme",
  "Genre Lock-In": "theme",
  "Discovery Control": "unmet_need",
  "Similarity-Based Reinforcement": "root_cause",
  "Adjustable Novelty": "unmet_need",
};

/** Note: "Discovery Control" maps to unmet_need; theme equivalent is "Lack of Discovery Control" */
export const DISCOVERY_CONTROL_THEME = "Lack of Discovery Control";

const GROUND_TRUTH: Record<
  EvalBucketKey,
  { strong: RegExp[]; weak: RegExp[] }
> = {
  "Repetition Fatigue": {
    strong: [
      /\bsame (song|artist|music|things?|playlist)\b/i,
      /\brepeat(ing|s|ed)?\b/i,
      /\bregurgitat/i,
      /\bheard (it|everything|them) (all|before|again)\b/i,
      /\brecycled?\b/i,
      /\bon repeat\b/i,
      /\bover and over\b/i,
    ],
    weak: [/\bstuck\b/i, /\bagain and again\b/i],
  },
  "Genre Lock-In": {
    strong: [
      /\bgenre\b.*\b(bubble|locked|lock-in|same|one type|stuck)\b/i,
      /\bfilter bubble\b/i,
      /\b(one|same) genre\b/i,
      /\bbreak out of\b/i,
      /\bonly (plays?|recommend|suggest).*genre\b/i,
    ],
    weak: [/\bgenre bubble\b/i, /\bsame genre\b/i],
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
      /\bnovelty slider\b/i,
    ],
    weak: [/\bcontrol\b/i, /\bchoose\b/i, /\bsteer\b/i, /\bslider\b/i],
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
  },
};

export type GroundTruthLabel =
  | "true_positive"
  | "weak_match"
  | "false_positive";

export function groundTruthLabel(
  text: string,
  bucket: EvalBucketKey,
): GroundTruthLabel {
  const gt = GROUND_TRUTH[bucket];
  if (gt.strong.some((p) => p.test(text))) return "true_positive";
  if (gt.weak.some((p) => p.test(text))) return "weak_match";
  return "false_positive";
}

export interface BucketPrecisionResult {
  bucket: EvalBucketKey;
  field: "theme" | "root_cause" | "unmet_need";
  assignedCount: number;
  truePositive: number;
  weakMatch: number;
  falsePositive: number;
  precisionStrict: number | null;
  precisionLenient: number | null;
  meetsTarget70: boolean;
}

function reviewMatchesBucket(review: ClassifiedReview, bucket: EvalBucketKey): boolean {
  const field = EVAL_BUCKET_FIELD[bucket];
  if (bucket === "Discovery Control") {
    return review.unmet_need === "Discovery Control" || review.theme === DISCOVERY_CONTROL_THEME;
  }
  return review[field] === bucket;
}

export function measureBucketPrecision(
  classified: ClassifiedReview[],
  bucket: EvalBucketKey,
  options?: { discoveryRelevantOnly?: boolean },
): BucketPrecisionResult {
  const field = EVAL_BUCKET_FIELD[bucket];
  const pool =
    options?.discoveryRelevantOnly === false
      ? classified
      : classified.filter((r) => r.discovery_relevant);
  const matches = pool.filter((r) => reviewMatchesBucket(r, bucket));

  let tp = 0;
  let weak = 0;
  let fp = 0;

  for (const review of matches) {
    const gt = groundTruthLabel(review.text, bucket);
    if (gt === "true_positive") tp++;
    else if (gt === "weak_match") weak++;
    else fp++;
  }

  const precisionStrict = matches.length ? tp / matches.length : null;
  const precisionLenient = matches.length ? (tp + weak) / matches.length : null;

  return {
    bucket,
    field,
    assignedCount: matches.length,
    truePositive: tp,
    weakMatch: weak,
    falsePositive: fp,
    precisionStrict:
      precisionStrict !== null ? Math.round(precisionStrict * 1000) / 1000 : null,
    precisionLenient:
      precisionLenient !== null ? Math.round(precisionLenient * 1000) / 1000 : null,
    meetsTarget70: precisionStrict !== null && precisionStrict >= 0.7,
  };
}

export function measureAllBucketPrecision(
  classified: ClassifiedReview[],
  options?: { discoveryRelevantOnly?: boolean },
): BucketPrecisionResult[] {
  const buckets: EvalBucketKey[] = [
    "Repetition Fatigue",
    "Genre Lock-In",
    "Discovery Control",
    "Similarity-Based Reinforcement",
    "Adjustable Novelty",
  ];
  return buckets.map((bucket) => measureBucketPrecision(classified, bucket, options));
}
