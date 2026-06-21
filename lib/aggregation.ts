import {
  buildCrossTab,
  countByField,
  countSources,
  extractClusterEvidence,
  extractRepetitionEvidence,
} from "./evidence";
import { assignReviewIds } from "./review-ids";
import type { AggregationResult, ClassifiedReview } from "./types";

export { countByField } from "./evidence";

export function emptyAggregation(): AggregationResult {
  const emptyCrossTab = {
    rowLabel: "",
    segments: [],
    columns: [],
    matrix: {},
  };

  return {
    totalReviews: 0,
    discoveryRelevantCount: 0,
    excludedCount: 0,
    themeFrequency: {},
    behaviorFrequency: {},
    emotionFrequency: {},
    segmentBreakdown: {},
    barrierAnalysis: {},
    rootCauseFrequency: {},
    unmetNeedFrequency: {},
    sourceBreakdown: {},
    segmentThemeCrossTab: { ...emptyCrossTab, rowLabel: "segment × theme" },
    segmentBarrierCrossTab: { ...emptyCrossTab, rowLabel: "segment × barrier" },
    segmentUnmetNeedCrossTab: {
      ...emptyCrossTab,
      rowLabel: "segment × unmet_need",
    },
    themeEvidence: [],
    behaviorEvidence: [],
    rootCauseEvidence: [],
    unmetNeedEvidence: [],
    repetitionEvidence: [],
  };
}

export function aggregateReviews(
  classified: ClassifiedReview[],
): AggregationResult {
  classified = assignReviewIds(classified);
  if (classified.length === 0) {
    return emptyAggregation();
  }

  const discovery = classified.filter((r) => r.discovery_relevant !== false);
  const reviews = discovery.length > 0 ? discovery : classified;

  const themeFrequency = countByField(reviews, "theme");
  const behaviorFrequency = countByField(reviews, "behavior");
  const emotionFrequency = countByField(reviews, "emotion");
  const segmentBreakdown = countByField(reviews, "segment");
  const barrierAnalysis = countByField(reviews, "barrier");
  const rootCauseFrequency = countByField(reviews, "root_cause");
  const unmetNeedFrequency = countByField(reviews, "unmet_need");

  return {
    totalReviews: classified.length,
    discoveryRelevantCount: reviews.length,
    excludedCount: classified.length - reviews.length,
    themeFrequency,
    behaviorFrequency,
    emotionFrequency,
    segmentBreakdown,
    barrierAnalysis,
    rootCauseFrequency,
    unmetNeedFrequency,
    sourceBreakdown: countSources(reviews),
    segmentThemeCrossTab: buildCrossTab(reviews, "segment", "theme", "segment × theme"),
    segmentBarrierCrossTab: buildCrossTab(
      reviews,
      "segment",
      "barrier",
      "segment × barrier",
    ),
    segmentUnmetNeedCrossTab: buildCrossTab(
      reviews,
      "segment",
      "unmet_need",
      "segment × unmet_need",
    ),
    themeEvidence: extractClusterEvidence(reviews, "theme", themeFrequency),
    behaviorEvidence: extractClusterEvidence(
      reviews,
      "behavior",
      behaviorFrequency,
    ),
    rootCauseEvidence: extractClusterEvidence(
      reviews,
      "root_cause",
      rootCauseFrequency,
    ),
    unmetNeedEvidence: extractClusterEvidence(
      reviews,
      "unmet_need",
      unmetNeedFrequency,
    ),
    repetitionEvidence: extractRepetitionEvidence(reviews),
  };
}

/** Aggregate from a pre-filtered review subset (used by dashboard source/confidence filters). */
export function aggregateReviewSubset(
  allClassified: ClassifiedReview[],
  subset: ClassifiedReview[],
): AggregationResult {
  allClassified = assignReviewIds(allClassified);
  subset = assignReviewIds(subset);
  if (subset.length === 0) {
    return {
      ...emptyAggregation(),
      totalReviews: allClassified.length,
      excludedCount: allClassified.length,
    };
  }

  const themeFrequency = countByField(subset, "theme");
  const behaviorFrequency = countByField(subset, "behavior");
  const emotionFrequency = countByField(subset, "emotion");
  const segmentBreakdown = countByField(subset, "segment");
  const barrierAnalysis = countByField(subset, "barrier");
  const rootCauseFrequency = countByField(subset, "root_cause");
  const unmetNeedFrequency = countByField(subset, "unmet_need");

  return {
    totalReviews: allClassified.length,
    discoveryRelevantCount: subset.length,
    excludedCount: allClassified.length - subset.length,
    themeFrequency,
    behaviorFrequency,
    emotionFrequency,
    segmentBreakdown,
    barrierAnalysis,
    rootCauseFrequency,
    unmetNeedFrequency,
    sourceBreakdown: countSources(subset),
    segmentThemeCrossTab: buildCrossTab(subset, "segment", "theme", "segment × theme"),
    segmentBarrierCrossTab: buildCrossTab(
      subset,
      "segment",
      "barrier",
      "segment × barrier",
    ),
    segmentUnmetNeedCrossTab: buildCrossTab(
      subset,
      "segment",
      "unmet_need",
      "segment × unmet_need",
    ),
    themeEvidence: extractClusterEvidence(subset, "theme", themeFrequency),
    behaviorEvidence: extractClusterEvidence(
      subset,
      "behavior",
      behaviorFrequency,
    ),
    rootCauseEvidence: extractClusterEvidence(
      subset,
      "root_cause",
      rootCauseFrequency,
    ),
    unmetNeedEvidence: extractClusterEvidence(
      subset,
      "unmet_need",
      unmetNeedFrequency,
    ),
    repetitionEvidence: extractRepetitionEvidence(subset),
  };
}
