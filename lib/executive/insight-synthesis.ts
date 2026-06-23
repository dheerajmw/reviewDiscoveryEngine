import { assignReviewIds } from "../review-ids";
import { isPositiveTheme } from "../taxonomy";
import { isFallbackLabel } from "./executive-quality";
import {
  assignResearchDomain,
  extractMechanism,
  type ResearchDomain,
} from "./mechanism-extraction";
import {
  composeInsightSentence,
  displaySegment,
} from "./insight-narratives";
import {
  averageConfidence,
  buildSourceDistribution,
  buildTopSegments,
  slugify,
} from "../finding-evidence";
import type { ClassifiedReview, ProductInsight, QuoteEvidence } from "../types";
import type { OpportunitySize } from "../types";

interface InsightCluster {
  domain: ResearchDomain;
  mechanismKey: string;
  theme: string | null;
  barrier: string | null;
  root_cause: string | null;
  unmet_need: string | null;
  reviews: ClassifiedReview[];
}

function researchReviews(reviews: ClassifiedReview[]): ClassifiedReview[] {
  return reviews.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
}

function pickPrimaryLabel(
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

function collectLabels(
  reviews: ClassifiedReview[],
  field: keyof Pick<
    ClassifiedReview,
    "theme" | "barrier" | "root_cause" | "unmet_need"
  >,
  limit = 3,
): string[] {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    const label = String(r[field]).trim();
    if (!label || isFallbackLabel(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

function mechanismClusterKey(
  review: ClassifiedReview,
  domain: ResearchDomain,
): string {
  const root = isFallbackLabel(review.root_cause) ? "_" : review.root_cause;
  const barrier = isFallbackLabel(review.barrier) ? "_" : review.barrier;
  const theme = isFallbackLabel(review.theme) ? "_" : review.theme;
  return `${domain}::${root}::${barrier}::${theme}`;
}

function buildDomainClusters(reviews: ClassifiedReview[]): InsightCluster[] {
  const map = new Map<string, InsightCluster>();

  for (const review of reviews) {
    const domain = assignResearchDomain(review);
    const key = mechanismClusterKey(review, domain);
    const existing = map.get(key);
    if (existing) {
      existing.reviews.push(review);
    } else {
      map.set(key, {
        domain,
        mechanismKey: key,
        theme: isFallbackLabel(review.theme) ? null : review.theme,
        barrier: isFallbackLabel(review.barrier) ? null : review.barrier,
        root_cause: isFallbackLabel(review.root_cause)
          ? null
          : review.root_cause,
        unmet_need: isFallbackLabel(review.unmet_need)
          ? null
          : review.unmet_need,
        reviews: [review],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.reviews.length - a.reviews.length);
}

function toQuoteEvidence(review: ClassifiedReview, index: number): QuoteEvidence {
  return {
    review_id: review.review_id ?? `review-${index + 1}`,
    source: review.source,
    text: review.text,
    segment: review.segment,
    theme: review.theme,
    confidence: review.confidence ?? 0.7,
    barrier: review.barrier,
    root_cause: review.root_cause,
    unmet_need: review.unmet_need,
  };
}

function estimateSeverity(cluster: InsightCluster): number {
  let score = 2;
  if (cluster.domain === "repetition") score += 1;
  if (cluster.domain === "algorithm_trust") score += 1;
  if (cluster.theme === "Repetition Fatigue") score += 1;
  if (cluster.root_cause === "Listening History Loop") score += 1;
  if (cluster.root_cause === "Engagement Optimization Bias") score += 1;
  if (cluster.barrier === "Lack of Exploration Controls") score += 1;
  if (cluster.reviews.length >= 30) score += 1;
  if (cluster.domain === "positive_discovery") score = Math.max(2, score - 1);
  return Math.min(5, score);
}

function estimateOpportunitySize(
  reviewCount: number,
  segmentCount: number,
  confidence: number,
  isPositive: boolean,
): OpportunitySize {
  const signal = reviewCount * segmentCount * confidence * (isPositive ? 0.85 : 1);
  if (signal >= 80) return "Large";
  if (signal >= 25) return "Medium";
  return "Small";
}

function clusterToInsight(cluster: InsightCluster): ProductInsight {
  const { reviews, domain } = cluster;
  const theme = cluster.theme ?? pickPrimaryLabel(reviews, "theme");
  const barrier = cluster.barrier ?? pickPrimaryLabel(reviews, "barrier");
  const root_cause =
    cluster.root_cause ?? pickPrimaryLabel(reviews, "root_cause");
  const unmet_need =
    cluster.unmet_need ?? pickPrimaryLabel(reviews, "unmet_need");

  const mechanismBundle = extractMechanism(reviews, domain);
  const is_positive =
    domain === "positive_discovery" ||
    Boolean(theme && isPositiveTheme(theme));

  const quotes = reviews
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 5)
    .map((r, i) => toQuoteEvidence(r, i));

  const segments = buildTopSegments(reviews, 5).map((s) => s.segment);
  const sources = Object.keys(buildSourceDistribution(reviews));
  const confidence = averageConfidence(reviews);

  const insight = is_positive
    ? mechanismBundle.symptom
    : composeInsightSentence({
        theme: theme ?? undefined,
        barrier: barrier ?? undefined,
        root_cause: root_cause ?? undefined,
      });

  const id = slugify(
    [domain, theme, root_cause].filter(Boolean).join("-") || cluster.mechanismKey,
  );

  return {
    id,
    insight,
    supporting_reviews: reviews.length,
    supporting_segments: segments,
    supporting_sources: sources,
    themes: collectLabels(reviews, "theme"),
    barriers: collectLabels(reviews, "barrier"),
    root_causes: collectLabels(reviews, "root_cause"),
    unmet_needs: collectLabels(reviews, "unmet_need"),
    representative_quotes: quotes,
    confidence,
    severity: estimateSeverity(cluster),
    opportunity_size: estimateOpportunitySize(
      reviews.length,
      segments.length,
      confidence,
      is_positive,
    ),
    symptom: mechanismBundle.symptom,
    mechanism: mechanismBundle.mechanism,
    product_implication: mechanismBundle.product_implication,
    opportunity: mechanismBundle.opportunity,
    research_domain: domain,
    is_positive,
  };
}

export function synthesizeInsights(
  classified: ClassifiedReview[],
): ProductInsight[] {
  const tagged = assignReviewIds(classified);
  const research = researchReviews(tagged);
  const clusters = buildDomainClusters(research);
  return clusters.map(clusterToInsight);
}

export function segmentLabelList(insight: ProductInsight): string[] {
  return insight.supporting_segments.map(displaySegment);
}
