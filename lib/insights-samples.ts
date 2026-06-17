import type { AggregationResult, ClassifiedReview } from "./types";

const DEFAULT_PER_THEME = 10;
const MAX_THEMES = 3;

export function selectSampleReviews(
  classified: ClassifiedReview[],
  aggregation: AggregationResult,
  perTheme = DEFAULT_PER_THEME,
): ClassifiedReview[] {
  const topThemes = Object.entries(aggregation.themeFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_THEMES)
    .map(([theme]) => theme);

  const samples: ClassifiedReview[] = [];
  const seen = new Set<string>();

  for (const theme of topThemes) {
    const themeReviews = classified.filter((review) => review.theme === theme);
    for (const review of themeReviews.slice(0, perTheme)) {
      const key = `${review.source}:${review.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        samples.push(review);
      }
    }
  }

  if (samples.length === 0) {
    return classified.slice(0, 30);
  }

  return samples;
}
