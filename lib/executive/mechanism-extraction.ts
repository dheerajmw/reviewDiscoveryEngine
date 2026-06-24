import {
  isPositiveTheme,
  POSITIVE_THEME_SET,
} from "../taxonomy";
import type { ClassifiedReview, ProductInsight } from "../types";
import {
  isFallbackDriven,
  isFallbackLabel,
  countSources,
} from "./executive-quality";
import {
  OPPORTUNITY_ACTIONS,
  ROOT_CAUSE_INSIGHT_FRAGMENTS,
  THEME_INSIGHT_FRAGMENTS,
  UNMET_NEED_NARRATIVES,
} from "./insight-narratives";

/** Research domains for diversity-constrained executive findings. */
export type ResearchDomain =
  | "recommendation_quality"
  | "repetition"
  | "discovery_control"
  | "genre_exploration"
  | "discovery_surfaces"
  | "algorithm_trust"
  | "positive_discovery";

export const RESEARCH_DOMAINS: ResearchDomain[] = [
  "recommendation_quality",
  "repetition",
  "discovery_control",
  "genre_exploration",
  "discovery_surfaces",
  "algorithm_trust",
  "positive_discovery",
];

export const DOMAIN_LABELS: Record<ResearchDomain, string> = {
  recommendation_quality: "Recommendation Quality",
  repetition: "Repetition & Familiarity Loops",
  discovery_control: "Discovery Control",
  genre_exploration: "Genre Exploration",
  discovery_surfaces: "Discovery Surface Design",
  algorithm_trust: "Algorithm Trust",
  positive_discovery: "Positive Discovery Signals",
};

export const MAX_FINDING_EVIDENCE_SHARE = 0.4;
export const MIN_EXECUTIVE_FINDINGS = 3;
export const MAX_EXECUTIVE_FINDINGS = 5;

export interface MechanismBundle {
  symptom: string;
  mechanism: string;
  product_implication: string;
  opportunity: string;
}

export function assignResearchDomain(review: ClassifiedReview): ResearchDomain {
  const theme = review.theme;

  if (
    isPositiveTheme(theme) ||
    review.discovery_outcome === "successful"
  ) {
    return "positive_discovery";
  }

  if (
    theme === "Repetition Fatigue" ||
    theme === "Discovery Fatigue" ||
    review.root_cause === "Listening History Loop" ||
    review.root_cause === "Similarity-Based Reinforcement" ||
    review.root_cause === "Playlist or Radio Loop"
  ) {
    return "repetition";
  }

  if (
    theme === "Poor Recommendation Quality" ||
    theme === "Mood-Context Mismatch" ||
    review.barrier === "Poor Personalization Context" ||
    review.barrier === "Low Novelty"
  ) {
    return "recommendation_quality";
  }

  if (
    theme === "Lack of Discovery Control" ||
    review.barrier === "Lack of Exploration Controls" ||
    review.unmet_need === "Discovery Control" ||
    review.unmet_need === "Adjustable Novelty"
  ) {
    return "discovery_control";
  }

  if (
    theme === "Genre Lock-In" ||
    review.barrier === "Genre Saturation" ||
    review.unmet_need === "Genre Exploration" ||
    review.unmet_need === "Cross-Genre Exploration"
  ) {
    return "genre_exploration";
  }

  if (
    theme === "Weak Discovery Surfaces" ||
    theme === "Trust Erosion" ||
    review.barrier === "Ineffective Discovery Surfaces" ||
    review.root_cause === "Discovery Surface Design Issues"
  ) {
    return "discovery_surfaces";
  }

  if (
    theme === "Algorithm Distrust" ||
    theme === "Algorithm Anxiety" ||
    theme === "Cross-Content Recommendation Noise" ||
    review.root_cause === "No Exploration Sandbox" ||
    review.root_cause === "Cross-Content Recommendation Bias" ||
    review.root_cause === "Engagement Optimization Bias"
  ) {
    return "algorithm_trust";
  }

  if (review.barrier === "Similar Artist Loop") return "repetition";
  if (review.barrier === "Cold Start Discovery") return "discovery_surfaces";

  return "recommendation_quality";
}

function dominantLabel(
  reviews: ClassifiedReview[],
  field: keyof Pick<
    ClassifiedReview,
    "theme" | "barrier" | "root_cause" | "unmet_need"
  >,
): string | null {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    const label = String(r[field]).trim();
    if (!label || isFallbackLabel(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

function positiveSymptom(theme: string | null): string {
  if (theme === "Strong Discovery Playlists") {
    return "Users praise algorithmic playlists as reliable engines for finding new music.";
  }
  if (theme === "Successful Artist Discovery") {
    return "Users report discovering unfamiliar artists that feel personally relevant.";
  }
  if (theme === "Recommendation Success") {
    return "Users describe recommendations as well-aligned with taste and discovery intent.";
  }
  if (theme === "Discovery Delight") {
    return "Users express delight when discovery surfaces surprise them with compelling music.";
  }
  if (theme === "Positive Discovery Experience") {
    return "Users consistently praise Spotify's ability to introduce new artists and expand taste.";
  }
  return "Users consistently praise Spotify's ability to introduce new artists and expand taste.";
}

const POSITIVE_MECHANISM_BY_THEME: Record<string, MechanismBundle> = {
  "Strong Discovery Playlists": {
    symptom: positiveSymptom("Strong Discovery Playlists"),
    mechanism:
      "Personalized playlist generation combines taste signals with controlled novelty injection so flagship surfaces feel fresh week to week.",
    product_implication:
      "When playlist surfaces deliver consistent novelty, users treat Discover Weekly and DJ as primary discovery channels.",
    opportunity:
      "Scale what works — preserve exploration weighting on Discover Weekly, DJ, and Release Radar while protecting freshness guarantees.",
  },
  "Successful Artist Discovery": {
    symptom: positiveSymptom("Successful Artist Discovery"),
    mechanism:
      "Artist-level ranking surfaces adjacent long-tail artists that match taste without repeating established favorites.",
    product_implication:
      "New artist introductions drive catalog depth engagement and expand listening libraries beyond comfort artists.",
    opportunity:
      "Increase artist-level diversity targets in flagship surfaces and measure adoption of newly surfaced artists.",
  },
  "Recommendation Success": {
    symptom: positiveSymptom("Recommendation Success"),
    mechanism:
      "Context-aware ranking aligns session intent with recommendation candidates, reducing obvious mismatches.",
    product_implication:
      "High-quality matches build recommendation trust and keep users on algorithmic surfaces instead of manual search.",
    opportunity:
      "Instrument recommendation satisfaction by surface and optimize for taste-alignment metrics alongside engagement.",
  },
  "Discovery Delight": {
    symptom: positiveSymptom("Discovery Delight"),
    mechanism:
      "Serendipity-oriented ranking occasionally breaks familiar patterns with unexpectedly strong matches.",
    product_implication:
      "Delightful surprises reinforce discovery behavior and positive word-of-mouth for algorithmic features.",
    opportunity:
      "Add controlled serendipity modes that preserve relevance while increasing pleasant surprise rate.",
  },
  "Positive Discovery Experience": {
    symptom: positiveSymptom("Positive Discovery Experience"),
    mechanism:
      "Discovery surfaces combine relevance signals with enough novelty to surface unfamiliar artists users still accept.",
    product_implication:
      "When novelty and relevance align, flagship playlists become trusted discovery channels that deepen catalog engagement.",
    opportunity:
      "Protect cross-surface discovery quality by tracking new-artist introduction rate separately from engagement.",
  },
};

function positiveMechanismBundle(theme: string | null): MechanismBundle {
  if (theme && POSITIVE_MECHANISM_BY_THEME[theme]) {
    return POSITIVE_MECHANISM_BY_THEME[theme]!;
  }
  return POSITIVE_MECHANISM_BY_THEME["Positive Discovery Experience"]!;
}

export function extractMechanism(
  reviews: ClassifiedReview[],
  domain: ResearchDomain,
): MechanismBundle {
  const theme = dominantLabel(reviews, "theme");
  const root = dominantLabel(reviews, "root_cause");
  const barrier = dominantLabel(reviews, "barrier");
  const need = dominantLabel(reviews, "unmet_need");

  if (domain === "positive_discovery") {
    return positiveMechanismBundle(theme);
  }

  const rootFragment =
    root && ROOT_CAUSE_INSIGHT_FRAGMENTS[root]
      ? ROOT_CAUSE_INSIGHT_FRAGMENTS[root]
      : null;
  const themeFragment =
    theme && THEME_INSIGHT_FRAGMENTS[theme]
      ? THEME_INSIGHT_FRAGMENTS[theme]
      : null;
  const barrierFragment = barrier
    ? `users experience ${barrier.toLowerCase()}`
    : "users struggle to discover new music";

  const symptom =
    theme === "Repetition Fatigue"
      ? "Users repeatedly hear the same songs and artists across discovery sessions."
      : theme === "Genre Lock-In"
        ? "Users feel trapped in narrow genre bubbles despite diverse listening history."
        : theme === "Algorithm Distrust"
          ? "Users question whether recommendations reflect their taste or opaque optimization."
          : themeFragment
            ? `Users report that ${themeFragment}.`
            : `Users articulate ${barrierFragment} during discovery sessions.`;

  const mechanism = rootFragment
    ? rootFragment.charAt(0).toUpperCase() + rootFragment.slice(1) + "."
    : domain === "repetition"
      ? "Listening history dominates recommendation ranking, shrinking exposure to new artists."
      : domain === "discovery_control"
        ? "The system lacks explicit signals for when users want novelty versus comfort."
        : "Recommendation ranking optimizes for familiarity over exploratory artist introduction.";

  const product_implication =
    domain === "repetition"
      ? "Discovery systems optimize for familiarity instead of exploration, undermining the promise of algorithmic playlists."
      : domain === "algorithm_trust"
        ? "Opaque recommendation logic erodes trust and pushes users back to saved content or external discovery."
        : domain === "discovery_surfaces"
          ? "Flagship discovery features underdeliver on introducing compelling new music at the moment users seek it."
          : "Users want discovery but product surfaces cannot steer recommendations away from historical patterns.";

  const opportunity =
    (need && OPPORTUNITY_ACTIONS[need]) ||
    (need && UNMET_NEED_NARRATIVES[need]) ||
    (root === "Listening History Loop"
      ? "Introduce exploration-weighted recommendation modes that decouple discovery from recent listening history."
      : root === "Similarity-Based Reinforcement"
        ? "Add artist-level diversity constraints to ranking with configurable novelty targets."
        : "Establish discovery quality metrics separate from engagement and optimize flagship surfaces against them.");

  return {
    symptom,
    mechanism,
    product_implication,
    opportunity,
  };
}

export function insightFallbackPenalty(insight: ProductInsight): number {
  let penalty = 0;
  const primaryTheme = insight.themes[0];
  if (primaryTheme && isFallbackLabel(primaryTheme)) penalty += 0.4;
  if (insight.root_causes.some((r) => isFallbackLabel(r))) penalty += 0.25;
  if (insight.unmet_needs.some((n) => isFallbackLabel(n))) penalty += 0.2;
  if (insight.barriers.some((b) => isFallbackLabel(b))) penalty += 0.15;
  if (isFallbackDriven(insight)) penalty += 0.5;
  return Math.min(0.9, penalty);
}

export function scoreInsight(insight: ProductInsight): number {
  const fallbackPenalty = insightFallbackPenalty(insight);
  const mechanismBonus = insight.mechanism ? 0.15 : 0;
  const sourceBonus = Math.min(0.1, countSources(insight.supporting_sources) * 0.03);
  const segmentBonus = Math.min(0.1, insight.supporting_segments.length * 0.02);
  const evidenceScore = Math.log10(insight.supporting_reviews + 1);
  const severityScore = insight.severity * 0.05;

  return (
    evidenceScore +
    insight.confidence +
    mechanismBonus +
    sourceBonus +
    segmentBonus +
    severityScore -
    fallbackPenalty
  );
}

export function selectDiverseInsights(
  candidates: ProductInsight[],
  totalReviews: number,
): ProductInsight[] {
  if (candidates.length === 0 || totalReviews === 0) return [];

  const maxPerFinding = Math.max(
    5,
    Math.floor(totalReviews * MAX_FINDING_EVIDENCE_SHARE),
  );
  const ranked = [...candidates].sort(
    (a, b) => scoreInsight(b) - scoreInsight(a),
  );

  const selected: ProductInsight[] = [];
  const usedDomains = new Set<ResearchDomain>();

  for (const insight of ranked) {
    if (selected.length >= MAX_EXECUTIVE_FINDINGS) break;
    if (insight.supporting_reviews > maxPerFinding && selected.length > 0) {
      continue;
    }
    const domain = insight.research_domain as ResearchDomain | undefined;
    if (domain && usedDomains.has(domain)) {
      continue;
    }
    if (insightFallbackPenalty(insight) >= 0.7) continue;

    selected.push(insight);
    if (domain) usedDomains.add(domain);
  }

  if (selected.length < MIN_EXECUTIVE_FINDINGS) {
    for (const insight of ranked) {
      if (selected.some((s) => s.id === insight.id)) continue;
      const domain = insight.research_domain as ResearchDomain | undefined;
      if (domain && usedDomains.has(domain)) continue;
      if (insight.supporting_reviews < 5) continue;
      if (insightFallbackPenalty(insight) >= 0.85) continue;
      selected.push(insight);
      if (domain) usedDomains.add(domain);
      if (selected.length >= MIN_EXECUTIVE_FINDINGS) break;
    }
  }

  return dedupeSimilarInsights(selected).slice(0, MAX_EXECUTIVE_FINDINGS);
}

export function dedupeSimilarInsights(
  insights: ProductInsight[],
): ProductInsight[] {
  const seen = new Set<string>();
  const ranked = [...insights].sort((a, b) => scoreInsight(b) - scoreInsight(a));
  const result: ProductInsight[] = [];

  for (const insight of ranked) {
    const key = [
      insight.symptom,
      insight.mechanism,
      insight.product_implication,
      insight.opportunity,
    ]
      .map((s) => s?.trim().toLowerCase() ?? "")
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(insight);
  }

  return result;
}

export function countMechanismFindings(insights: ProductInsight[]): number {
  return insights.filter(
    (i) =>
      i.mechanism &&
      i.root_causes.some((r) => !isFallbackLabel(r)),
  ).length;
}

export function partitionByPolarity(insights: ProductInsight[]): {
  positive: ProductInsight[];
  negative: ProductInsight[];
} {
  const positive: ProductInsight[] = [];
  const negative: ProductInsight[] = [];

  for (const insight of insights) {
    const primaryTheme = insight.themes[0];
    if (
      insight.is_positive ||
      (primaryTheme && POSITIVE_THEME_SET.has(primaryTheme)) ||
      insight.research_domain === "positive_discovery"
    ) {
      positive.push(insight);
    } else {
      negative.push(insight);
    }
  }

  return { positive, negative };
}
