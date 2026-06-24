import {
  formatFrequencyList,
  topLabels,
} from "./evidence";
import {
  buildSegmentChallengeFindings,
  buildSourceDistribution,
  buildTopSegments,
  clusterToFinding,
  mergeQuotes,
  mergeSourceDistributions,
  resolveFindingConfidence,
  reviewsMatchingLabel,
  slugify,
} from "./finding-evidence";
import { enrichRootCauseFinding } from "./root-cause-narratives";
import { assignReviewIds } from "./review-ids";
import type {
  AggregationResult,
  ClassifiedReview,
  EvidenceBackedFinding,
  ResearchFindings,
  ResearchFindingsReport,
} from "./types";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function buildWhyDiscoveryFails(
  evidence: AggregationResult,
  reviews: ClassifiedReview[],
): EvidenceBackedFinding {
  const topThemes = evidence.themeEvidence.slice(0, 3);
  const topBarrierLabels = topLabels(evidence.barrierAnalysis, 2);

  const summaryParts = [
    `Across ${evidence.discoveryRelevantCount} discovery-related reviews (${evidence.excludedCount} non-discovery excluded):`,
    topThemes.length
      ? `Dominant themes: ${formatFrequencyList(evidence.themeFrequency, 3).join(", ")}.`
      : "",
    topBarrierLabels.length
      ? `Primary barriers: ${formatFrequencyList(evidence.barrierAnalysis, 3).join(", ")}.`
      : "",
    evidence.rootCauseEvidence[0]
      ? `Leading root cause: ${evidence.rootCauseEvidence[0].label} (${evidence.rootCauseEvidence[0].pct}%).`
      : "",
  ].filter(Boolean);

  const themeReviewSets = topThemes.map((c) =>
    reviewsMatchingLabel(reviews, "theme", c.label),
  );
  const barrierReviewSets = topBarrierLabels.map((label) =>
    reviewsMatchingLabel(reviews, "barrier", label),
  );

  const barrierQuotes = topBarrierLabels.flatMap((label) =>
    reviewsMatchingLabel(reviews, "barrier", label)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)
      .map((r, i) => ({
        review_id: r.review_id ?? `review-${i + 1}`,
        source: r.source,
        text: r.text,
        segment: r.segment,
        theme: r.theme,
        confidence: r.confidence,
        barrier: r.barrier,
        root_cause: r.root_cause,
        unmet_need: r.unmet_need,
      })),
  );

  const combinedQuotes = mergeQuotes(
    ...topThemes.map((c) => c.quotes),
    barrierQuotes,
  ).slice(0, 5);

  const allMatching = [...themeReviewSets, ...barrierReviewSets].flat();

  return {
    id: "why-discovery-fails",
    title: "Why users struggle to discover new music",
    summary: summaryParts.join(" "),
    evidence_count: evidence.discoveryRelevantCount,
    confidence: resolveFindingConfidence(
      allMatching.length ? allMatching : reviews,
      combinedQuotes,
    ),
    quotes: combinedQuotes,
    source_distribution:
      Object.keys(evidence.sourceBreakdown).length > 0
        ? evidence.sourceBreakdown
        : buildSourceDistribution(reviews),
    top_segments: buildTopSegments(reviews),
    related_review_ids: combinedQuotes.map((q) => q.review_id),
  };
}

function buildFrustrationFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[],
): EvidenceBackedFinding[] {
  const themeFindings = evidence.themeEvidence
    .slice(0, 5)
    .map((c) =>
      clusterToFinding(
        c,
        reviews,
        "theme",
        `${c.label} cited in ${c.pct}% of discovery-related reviews.`,
      ),
    );

  const emotionFindings = Object.entries(evidence.emotionFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2)
    .map(([label, entry]) => {
      const matching = reviewsMatchingLabel(reviews, "emotion", label);
      const quotes = matching
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((r, i) => ({
          review_id: r.review_id ?? `review-${i + 1}`,
          source: r.source,
          text: r.text,
          segment: r.segment,
          theme: r.theme,
          confidence: r.confidence,
          barrier: r.barrier,
          root_cause: r.root_cause,
          unmet_need: r.unmet_need,
        }));
      return {
        id: slugify(`emotion-${label}`),
        title: label,
        summary: `${label} expressed in ${entry.pct}% of discovery-related reviews.`,
        pct: entry.pct,
        evidence_count: entry.count,
        confidence: resolveFindingConfidence(matching, quotes),
        quotes,
        source_distribution: buildSourceDistribution(matching),
        top_segments: buildTopSegments(matching),
        related_review_ids: quotes.map((q) => q.review_id),
      } satisfies EvidenceBackedFinding;
    });

  const barrierFindings = Object.entries(evidence.barrierAnalysis)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2)
    .map(([label, entry]) => {
      const matching = reviewsMatchingLabel(reviews, "barrier", label);
      const quotes = matching
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((r, i) => ({
          review_id: r.review_id ?? `review-${i + 1}`,
          source: r.source,
          text: r.text,
          segment: r.segment,
          theme: r.theme,
          confidence: r.confidence,
          barrier: r.barrier,
          root_cause: r.root_cause,
          unmet_need: r.unmet_need,
        }));
      return {
        id: slugify(`barrier-${label}`),
        title: label,
        summary: `${label} blocks discovery for ${entry.pct}% of reviews.`,
        pct: entry.pct,
        evidence_count: entry.count,
        confidence: resolveFindingConfidence(matching, quotes),
        quotes,
        source_distribution: buildSourceDistribution(matching),
        top_segments: buildTopSegments(matching),
        related_review_ids: quotes.map((q) => q.review_id),
      } satisfies EvidenceBackedFinding;
    });

  const seen = new Set<string>();
  return [...themeFindings, ...emotionFindings, ...barrierFindings]
    .filter((f) => {
      if (seen.has(f.title)) return false;
      seen.add(f.title);
      return true;
    })
    .slice(0, 8);
}

function buildBehaviorFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[],
): EvidenceBackedFinding[] {
  return evidence.behaviorEvidence
    .slice(0, 6)
    .map((c) =>
      clusterToFinding(
        c,
        reviews,
        "behavior",
        `Users report ${c.label.toLowerCase()} in ${c.pct}% of discovery-related reviews.`,
      ),
    );
}

function buildRepetitionFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[],
): EvidenceBackedFinding[] {
  if (evidence.repetitionEvidence.length > 0) {
    return evidence.repetitionEvidence.map((c) =>
      clusterToFinding(
        c,
        reviews,
        "root_cause",
        `Repetitive listening linked to ${c.label} (${c.pct}% of repetition-related reviews).`,
      ),
    );
  }

  return Object.entries(evidence.rootCauseFrequency)
    .filter(([k]) => k.toLowerCase().includes("repeat"))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([label, entry]) => {
      const matching = reviewsMatchingLabel(reviews, "root_cause", label);
      const quotes = matching
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((r, i) => ({
          review_id: r.review_id ?? `review-${i + 1}`,
          source: r.source,
          text: r.text,
          segment: r.segment,
          theme: r.theme,
          confidence: r.confidence,
          root_cause: r.root_cause,
        }));
      return enrichRootCauseFinding({
        id: slugify(`repetition-${label}`),
        title: label,
        summary: `${label} contributes to repetitive listening (${entry.pct}%).`,
        pct: entry.pct,
        evidence_count: entry.count,
        confidence: resolveFindingConfidence(matching, quotes),
        quotes,
        source_distribution: buildSourceDistribution(matching),
        top_segments: buildTopSegments(matching),
        related_review_ids: quotes.map((q) => q.review_id),
      });
    });
}

function buildUnmetNeedFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[],
): EvidenceBackedFinding[] {
  return evidence.unmetNeedEvidence
    .slice(0, 6)
    .map((c) =>
      clusterToFinding(
        c,
        reviews,
        "unmet_need",
        `Users express need for ${c.label.toLowerCase()} (${c.pct}% of reviews).`,
      ),
    );
}

function buildLegacySegmentChallenges(
  report: ResearchFindingsReport,
): Record<string, string[]> {
  const legacy: Record<string, string[]> = {};
  for (const item of report.segment_challenges) {
    if (!legacy[item.segment]) legacy[item.segment] = [];
    legacy[item.segment].push(`${item.challenge} (${item.pct}%)`);
  }
  return legacy;
}

export function buildResearchFindingsReport(
  evidence: AggregationResult,
  reviews: ClassifiedReview[] = [],
): ResearchFindingsReport {
  const tagged = assignReviewIds(reviews);

  return {
    why_discovery_fails: buildWhyDiscoveryFails(evidence, tagged),
    top_frustrations: buildFrustrationFindings(evidence, tagged),
    listening_behaviors: buildBehaviorFindings(evidence, tagged),
    repetition_causes: buildRepetitionFindings(evidence, tagged),
    segment_challenges: buildSegmentChallengeFindings(
      tagged,
      evidence.segmentThemeCrossTab,
    ),
    unmet_needs: buildUnmetNeedFindings(evidence, tagged),
  };
}

export function buildResearchFindings(
  evidence: AggregationResult,
  reviews: ClassifiedReview[] = [],
): ResearchFindings {
  const report = buildResearchFindingsReport(evidence, reviews);

  return {
    why_discovery_fails: report.why_discovery_fails.summary,
    top_frustrations: report.top_frustrations.map(
      (f) => `${f.title} (${f.pct ?? 0}%)`,
    ),
    listening_behaviors: report.listening_behaviors.map(
      (f) => `${f.title} (${f.pct ?? 0}%)`,
    ),
    repetition_causes: report.repetition_causes.map((f) => {
      const quote = f.quotes[0]?.text;
      const base = `${f.title} (${f.pct ?? 0}%)`;
      return quote ? `${base} — e.g. "${truncate(quote, 100)}"` : base;
    }),
    segment_challenges: buildLegacySegmentChallenges(report),
    unmet_needs: report.unmet_needs.map(
      (f) => `${f.title} (${f.pct ?? 0}%)`,
    ),
    report,
  };
}

export function ensureFindingsReport(
  findings: ResearchFindings,
  evidence: AggregationResult,
  reviews: ClassifiedReview[] = [],
): ResearchFindings {
  if (findings.report) return findings;
  return buildResearchFindings(evidence, reviews);
}
