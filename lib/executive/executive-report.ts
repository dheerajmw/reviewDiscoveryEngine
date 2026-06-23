import type {
  AggregationResult,
  ClassifiedReview,
  DiscoveryBehaviorNarrative,
  ExecutiveFinding,
  ExecutiveResearchReport,
  QuoteEvidence,
  ResearchFindingsReport,
  SlideFinding,
  StrategicOpportunity,
  UnmetNeedNarrative,
} from "../types";
import { isFallbackLabel } from "./executive-quality";
import {
  BEHAVIOR_NARRATIVES,
  BUSINESS_IMPLICATIONS,
  OPPORTUNITY_ACTIONS,
  UNMET_NEED_NARRATIVES,
  composeDashboardHeadline,
  composeFindingTitle,
} from "./insight-narratives";
import type { ProductInsight } from "../types";

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function buildDiscoveryBehaviorNarratives(
  classified: ClassifiedReview[],
): DiscoveryBehaviorNarrative[] {
  const research = classified.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
  const counts = new Map<string, ClassifiedReview[]>();

  for (const r of research) {
    const behavior = r.behavior?.trim();
    if (!behavior) continue;
    const list = counts.get(behavior) ?? [];
    list.push(r);
    counts.set(behavior, list);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([behavior, reviews]) => {
      const best = [...reviews].sort(
        (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
      )[0]!;
      return {
        behavior,
        narrative:
          BEHAVIOR_NARRATIVES[behavior] ??
          `Users in this behavior pattern describe ${behavior.toLowerCase()} as a primary discovery goal.`,
        evidence_count: reviews.length,
        quote: truncate(best.text),
      };
    });
}

export function buildUnmetNeedNarratives(
  classified: ClassifiedReview[],
): UnmetNeedNarrative[] {
  const research = classified.filter(
    (r) => r.research_relevant !== false && r.discovery_relevant,
  );
  const counts = new Map<string, number>();

  for (const r of research) {
    const need = r.unmet_need?.trim();
    if (!need || isFallbackLabel(need)) continue;
    counts.set(need, (counts.get(need) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([need, count]) => ({
      need,
      narrative:
        UNMET_NEED_NARRATIVES[need] ??
        `Users consistently express a need for ${need.toLowerCase()}.`,
      evidence_count: count,
    }));
}

export function buildSlideFindings(
  findings: ExecutiveFinding[],
  opportunities: StrategicOpportunity[],
  insights: ProductInsight[],
): SlideFinding[] {
  const insightMap = new Map(insights.map((i) => [i.id, i]));

  return findings.slice(0, 6).map((finding) => {
    const insight = insightMap.get(finding.related_insight_id);
    const opp = opportunities.find((o) => o.related_finding_id === finding.id);
    const theme = insight?.themes[0];
    const quote =
      finding.representative_quotes[0]?.text ??
      "Users describe discovery as predictable rather than exploratory.";

    return {
      headline: finding.title,
      evidence_count: finding.evidence_count,
      supporting_quote: truncate(quote, 120),
      business_implication:
        (theme && BUSINESS_IMPLICATIONS[theme]) ??
        "Discovery engagement and recommendation trust are at risk.",
      recommended_action:
        opp?.spotify_opportunity ??
        (insight?.unmet_needs[0] && OPPORTUNITY_ACTIONS[insight.unmet_needs[0]]) ??
        "Increase exploration weighting in recommendation ranking.",
    };
  });
}

export function buildExecutiveSummary(input: {
  discoveryProblems: ExecutiveFinding[];
  recommendationFrustrations: ExecutiveFinding[];
  opportunities: StrategicOpportunity[];
  aggregation: AggregationResult;
  positiveSignals?: ExecutiveFinding[];
}): string {
  const { discoveryProblems, recommendationFrustrations, opportunities, aggregation } =
    input;
  const n = aggregation.discoveryRelevantCount;

  const positiveLine = input.positiveSignals?.[0]?.title;
  const problemLine =
    discoveryProblems[0]?.title ??
    "Users struggle to discover new music on Spotify.";
  const frustrationLine =
    recommendationFrustrations[0]?.title ??
    "Recommendation quality is a recurring frustration.";
  const opportunityLine =
    opportunities[0]?.spotify_opportunity ??
    "Discovery surfaces need exploration-first redesign.";

  const paragraphs = [
    `Across ${n} discovery-related reviews, a consistent pattern emerges: ${problemLine}`,
    `${frustrationLine} Users want discovery, but recommendation systems often optimize for familiarity over artist exploration.`,
    `The highest-impact opportunity: ${opportunityLine}`,
  ];

  if (positiveLine) {
    paragraphs.splice(
      1,
      0,
      `Positive signal: ${positiveLine}`,
    );
  }

  return paragraphs.join(" ");
}

export function buildDashboardHeadline(input: {
  positiveSignals: ExecutiveFinding[];
  discoveryProblems: ExecutiveFinding[];
  recommendationFrustrations: ExecutiveFinding[];
  aggregation: AggregationResult;
}): string {
  return composeDashboardHeadline(input);
}

export function buildDirectorReadiness(input: {
  findings: ExecutiveFinding[];
  opportunities: StrategicOpportunity[];
  mechanismCount: number;
  researchCount: number;
  rejectedCount: number;
}): { score: number; maxScore: number; rationale: string } {
  let score = 0;
  const notes: string[] = [];

  if (input.findings.length >= 3) {
    score += 2;
  } else {
    notes.push("Fewer than 3 executive findings");
  }
  if (input.mechanismCount >= 3) {
    score += 2;
  } else {
    notes.push("Insufficient mechanism-level findings");
  }
  if (input.opportunities.length >= 3) {
    score += 1.5;
  } else {
    notes.push("Fewer than 3 strategic opportunities");
  }
  if (input.researchCount >= 100) {
    score += 1.5;
  } else {
    notes.push("Limited discovery corpus depth");
  }
  if (input.rejectedCount <= input.findings.length) {
    score += 1;
  }

  const rounded = Math.min(10, Math.round(score * 10) / 10);
  return {
    score: rounded,
    maxScore: 10,
    rationale:
      rounded >= 7
        ? "Findings are mechanism-backed, diverse, and suitable for director-level strategy review."
        : notes.length > 0
          ? `Gaps: ${notes.join("; ")}.`
          : "Additional corpus depth or classification specificity needed.",
  };
}

export function buildConfidenceAssessment(
  insights: ProductInsight[],
  findings: ExecutiveFinding[],
): string {
  const strong = findings.filter((f) => f.evidence_strength === "Strong").length;
  const medium = findings.filter((f) => f.evidence_strength === "Medium").length;
  const weak = findings.filter((f) => f.evidence_strength === "Weak").length;
  const totalReviews = insights.reduce((s, i) => s + i.supporting_reviews, 0);

  return [
    `Evidence base: ${totalReviews} reviews across ${findings.length} executive findings.`,
    `Evidence strength: ${strong} Strong, ${medium} Medium, ${weak} Weak.`,
    strong >= 1
      ? "Top findings are suitable for director-level strategy review with cited user evidence."
      : "Findings are directionally sound but need broader multi-source evidence before executive presentation.",
  ].join(" ");
}

export function collectKeyQuotes(findings: ExecutiveFinding[]): QuoteEvidence[] {
  const seen = new Set<string>();
  const quotes: QuoteEvidence[] = [];
  for (const finding of findings) {
    for (const q of finding.representative_quotes) {
      if (seen.has(q.review_id)) continue;
      seen.add(q.review_id);
      quotes.push(q);
      if (quotes.length >= 10) return quotes;
    }
  }
  return quotes;
}

export function formatExecutiveReportMarkdown(
  report: ExecutiveResearchReport,
): string {
  const lines: string[] = [];

  lines.push("# Spotify Discovery — Executive Research Report");
  lines.push("");
  lines.push(`*Generated ${report.generated_at}*`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(report.executive_summary);
  lines.push("");

  lines.push("## Top 3 Discovery Problems");
  lines.push("");
  for (const [i, f] of report.top_discovery_problems.entries()) {
    lines.push(`### ${i + 1}. ${f.title}`);
    lines.push("");
    lines.push(f.description);
    lines.push("");
    lines.push(`**Evidence:** ${f.evidence_count} reviews · **Confidence:** ${f.confidence}`);
    lines.push(`**Impact:** ${f.business_impact.join(", ")}`);
    lines.push(`**Segments:** ${f.affected_segments.join(", ")}`);
    for (const q of f.representative_quotes.slice(0, 2)) {
      lines.push(`> "${truncate(q.text)}" — ${q.source}`);
    }
    lines.push("");
  }

  lines.push("## Top 3 Recommendation Frustrations");
  lines.push("");
  for (const [i, f] of report.top_recommendation_frustrations.entries()) {
    lines.push(`### ${i + 1}. ${f.title}`);
    lines.push(f.description);
    lines.push(`**Evidence:** ${f.evidence_count} · **Confidence:** ${f.confidence}`);
    lines.push("");
  }

  lines.push("## Discovery Behaviors");
  lines.push("");
  for (const b of report.discovery_behaviors) {
    lines.push(`**${b.behavior}** (${b.evidence_count} reviews)`);
    lines.push(b.narrative);
    lines.push(`> "${b.quote}"`);
    lines.push("");
  }

  lines.push("## Segment Differences");
  lines.push("");
  for (const s of report.segment_differences) {
    lines.push(`### ${s.display_name}`);
    lines.push(`- **Challenge:** ${s.primary_challenge}`);
    lines.push(`- **Behavior:** ${s.discovery_behavior}`);
    lines.push(`- **Unmet need:** ${s.primary_unmet_need}`);
    if (s.representative_quote) {
      lines.push(`> "${truncate(s.representative_quote.text)}"`);
    }
    lines.push("");
  }

  lines.push("## Unmet Needs");
  lines.push("");
  for (const u of report.unmet_needs) {
    lines.push(`**${u.need}** (${u.evidence_count} reviews)`);
    lines.push(u.narrative);
    lines.push("");
  }

  lines.push("## Strategic Opportunities");
  lines.push("");
  for (const [i, o] of report.strategic_opportunities.entries()) {
    lines.push(`### Opportunity ${i + 1} — ${o.size} (${o.opportunity_score} score)`);
    lines.push(`**Problem:** ${o.problem}`);
    lines.push(`**Current behavior:** ${o.current_user_behavior}`);
    lines.push(`**Root cause:** ${o.root_cause}`);
    lines.push(`**Opportunity:** ${o.spotify_opportunity}`);
    lines.push("");
  }

  lines.push("## Key Quotes");
  lines.push("");
  for (const q of report.key_quotes.slice(0, 8)) {
    lines.push(`> "${truncate(q.text)}" — *${q.source}*, ${q.segment}`);
  }
  lines.push("");

  lines.push("## Confidence Assessment");
  lines.push("");
  lines.push(report.confidence_assessment);
  lines.push("");

  lines.push("## Slide-Ready Findings");
  lines.push("");
  for (const [i, s] of report.slides.entries()) {
    lines.push(`### Slide ${i + 1}`);
    lines.push(`**Headline:** ${s.headline}`);
    lines.push(`**Evidence:** ${s.evidence_count} reviews`);
    lines.push(`**Quote:** "${s.supporting_quote}"`);
    lines.push(`**Implication:** ${s.business_implication}`);
    lines.push(`**Action:** ${s.recommended_action}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Fallback executive summary when quality gate rejects all insights */
export function buildFallbackSummary(
  report: ResearchFindingsReport | undefined,
  aggregation: AggregationResult,
): string {
  const n = aggregation.discoveryRelevantCount;
  const title =
    report?.why_discovery_fails?.title ??
    composeFindingTitle({});
  return `Across ${n} discovery-related reviews, users articulate discovery friction centered on familiarity over exploration. ${title} Additional corpus depth or classification specificity is needed before high-confidence executive findings can be generated.`;
}
