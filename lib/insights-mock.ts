import type { AggregationResult, InsightResult } from "./types";

function topEntry(
  data: Record<string, { count: number; pct: number }>,
): [string, { count: number; pct: number }] | undefined {
  const sorted = Object.entries(data).sort((a, b) => b[1].count - a[1].count);
  return sorted[0];
}

export function generateInsightsMock(
  aggregation: AggregationResult,
): InsightResult {
  const topTheme = topEntry(aggregation.themeFrequency);
  const topSegment = topEntry(aggregation.segmentBreakdown);
  const topBarrier = topEntry(aggregation.barrierAnalysis);

  const themeLabel = topTheme?.[0] ?? "discovery problems";
  const themePct = topTheme?.[1].pct ?? 0;
  const segmentLabel = topSegment?.[0] ?? "users";
  const barrierLabel = topBarrier?.[0] ?? "algorithm limits";

  return {
    summary: `${themePct}% of reviews point to ${themeLabel}, especially among ${segmentLabel.toLowerCase()}. The dominant barrier is ${barrierLabel.toLowerCase()}, suggesting recommendation systems prioritize familiarity over controlled exploration.`,
    rootCauses: [
      `Recommendation models reinforce ${themeLabel.toLowerCase()} by optimizing engagement signals from past listening, which reduces exposure to novel artists.`,
      `${segmentLabel} experience ${barrierLabel.toLowerCase()} because discovery surfaces lack explicit controls for novelty, randomness, or intent.`,
      "Playlist and radio features recycle similar audio profiles, so users perceive the catalog as smaller than it actually is.",
    ],
    discoveryProblems: [
      `Users struggle to discover music because ${themeLabel.toLowerCase()} makes every session feel predictable.`,
      `Listeners cannot escape filter bubbles when ${barrierLabel.toLowerCase()} blocks intentional exploration.`,
      "Long-term users feel the product stops introducing meaningful new artists even as their tastes evolve.",
    ],
    opportunities: [
      {
        title: "Adjustable novelty slider",
        description:
          "Let users control how adventurous recommendations are, from safe favorites to high-discovery mode.",
      },
      {
        title: "Explainable recommendations",
        description:
          "Show why a song was recommended to rebuild trust and help users steer the algorithm.",
      },
      {
        title: "Guided exploration sessions",
        description:
          "Offer a dedicated discovery mode that mixes controlled randomness with genre or mood guardrails.",
      },
    ],
  };
}
