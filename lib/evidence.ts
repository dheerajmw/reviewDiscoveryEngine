import type {
  ClassifiedReview,
  ClusterEvidence,
  CrossTabCell,
  CrossTabResult,
  FrequencyEntry,
  QuoteEvidence,
} from "./types";

type FrequencyField =
  | "theme"
  | "behavior"
  | "emotion"
  | "segment"
  | "barrier"
  | "root_cause"
  | "unmet_need";

const QUOTES_PER_CLUSTER = 5;
const TOP_CLUSTERS = 8;

export function countByField(
  reviews: ClassifiedReview[],
  field: FrequencyField,
): Record<string, FrequencyEntry> {
  if (reviews.length === 0) return {};

  const counts = new Map<string, number>();

  for (const review of reviews) {
    const value = String(review[field] ?? "").trim() || "Unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const total = reviews.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const result: Record<string, FrequencyEntry> = {};
  let assignedPct = 0;

  sorted.forEach(([key, count], index) => {
    const pct =
      index === sorted.length - 1
        ? 100 - assignedPct
        : Math.round((count / total) * 100);
    assignedPct += pct;
    result[key] = { count, pct };
  });

  return result;
}

export function countSources(
  reviews: ClassifiedReview[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const review of reviews) {
    counts[review.source] = (counts[review.source] ?? 0) + 1;
  }
  return counts;
}

function toQuote(review: ClassifiedReview, index: number): QuoteEvidence {
  return {
    review_id: review.review_id ?? `review-${index + 1}`,
    source: review.source,
    text: review.text,
    segment: review.segment,
    theme: review.theme,
    confidence: review.confidence,
    barrier: review.barrier,
    root_cause: review.root_cause,
    unmet_need: review.unmet_need,
  };
}

export function extractClusterEvidence(
  reviews: ClassifiedReview[],
  field: FrequencyField,
  frequency: Record<string, FrequencyEntry>,
  maxClusters = TOP_CLUSTERS,
): ClusterEvidence[] {
  const topLabels = Object.entries(frequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxClusters)
    .map(([label]) => label);

  return topLabels.map((label) => {
    const matching = reviews
      .filter((r) => (String(r[field]).trim() || "Unknown") === label)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, QUOTES_PER_CLUSTER);

    const entry = frequency[label] ?? { count: 0, pct: 0 };
    return {
      label,
      count: entry.count,
      pct: entry.pct,
      quotes: matching.map((r, i) => toQuote(r, i)),
    };
  });
}

export function buildCrossTab(
  reviews: ClassifiedReview[],
  rowField: "segment",
  colField: "theme" | "barrier" | "unmet_need",
  rowLabel: string,
): CrossTabResult {
  const segmentTotals = new Map<string, number>();
  const matrix: Record<string, Record<string, CrossTabCell>> = {};
  const columnCounts = new Map<string, number>();

  for (const review of reviews) {
    const segment = (review[rowField]?.trim() || "Unknown") as string;
    const column = (review[colField]?.trim() || "Unknown") as string;
    segmentTotals.set(segment, (segmentTotals.get(segment) ?? 0) + 1);
    columnCounts.set(column, (columnCounts.get(column) ?? 0) + 1);

    if (!matrix[segment]) matrix[segment] = {};
    const cell = matrix[segment][column] ?? { count: 0, pct: 0 };
    cell.count += 1;
    matrix[segment][column] = cell;
  }

  const segments = [...segmentTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const columns = [...columnCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  for (const segment of segments) {
    const total = segmentTotals.get(segment) ?? 1;
    for (const column of columns) {
      const cell = matrix[segment]?.[column] ?? { count: 0, pct: 0 };
      cell.pct = total > 0 ? Math.round((cell.count / total) * 100) : 0;
      if (!matrix[segment]) matrix[segment] = {};
      matrix[segment][column] = cell;
    }
  }

  return { rowLabel, segments, columns, matrix };
}

export function formatSegmentChallenges(
  crossTab: CrossTabResult,
  topN = 3,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const segment of crossTab.segments) {
    const row = crossTab.matrix[segment] ?? {};
    const ranked = crossTab.columns
      .map((col) => ({ col, cell: row[col] ?? { count: 0, pct: 0 } }))
      .filter((item) => item.cell.count > 0)
      .sort((a, b) => b.cell.pct - a.cell.pct)
      .slice(0, topN)
      .map((item) => `${item.col} (${item.cell.pct}%)`);

    if (ranked.length > 0) {
      result[segment] = ranked;
    }
  }

  return result;
}

const REPETITION_KEYWORDS = [
  "repeat",
  "same artist",
  "same song",
  "recycled",
  "stuck",
  "heard everything",
  "discover weekly",
  "repetition",
];

export function extractRepetitionEvidence(
  reviews: ClassifiedReview[],
): ClusterEvidence[] {
  const repetitionReviews = reviews.filter((r) => {
    const lower = r.text.toLowerCase();
    const themeMatch =
      r.theme.toLowerCase().includes("repetition") ||
      r.theme.toLowerCase().includes("stagnation");
    const textMatch = REPETITION_KEYWORDS.some((kw) => lower.includes(kw));
    const causeMatch = r.root_cause.toLowerCase().includes("repeat");
    return themeMatch || textMatch || causeMatch;
  });

  if (repetitionReviews.length === 0) return [];

  const rootCauses = countByField(repetitionReviews, "root_cause");
  return extractClusterEvidence(
    repetitionReviews,
    "root_cause",
    rootCauses,
    5,
  );
}

export function topLabels(
  frequency: Record<string, FrequencyEntry>,
  n: number,
): string[] {
  return Object.entries(frequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, n)
    .map(([label]) => label);
}

export function formatFrequencyList(
  frequency: Record<string, FrequencyEntry>,
  n = 5,
): string[] {
  return topLabels(frequency, n).map(
    (label) => `${label} (${frequency[label]?.pct ?? 0}%)`,
  );
}
