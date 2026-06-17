import type { AggregationResult, ClassifiedReview } from "./types";

export const INSIGHTS_SYSTEM_PROMPT = `You are a senior product manager analyzing music streaming app reviews.

Given aggregated review patterns and representative user quotes, produce decision-grade insights about music discovery problems.

Rules:
- Reference the actual top themes, segments, and barriers from the data
- Root causes must explain WHY (mechanism), not restate WHAT users said
- Discovery problems should be complete sentences starting with why users struggle
- Opportunities must be specific, actionable product ideas for a music app
- Write for a PM audience reviewing a discovery engine prototype

Return ONLY valid JSON in this exact shape:
{
  "summary": "Two sentences executive summary.",
  "rootCauses": ["3-5 root cause explanations"],
  "discoveryProblems": ["3 discovery problem statements"],
  "opportunities": [
    { "title": "Product idea title", "description": "One sentence description" }
  ]
}`;

function formatFrequency(
  data: Record<string, { count: number; pct: number }>,
): string {
  return Object.entries(data)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([label, { count, pct }]) => `${label}: ${pct}% (${count} reviews)`)
    .join("\n");
}

export function buildInsightsUserPrompt(
  aggregation: AggregationResult,
  samples: ClassifiedReview[],
): string {
  const samplePayload = samples.map((review) => ({
    source: review.source,
    theme: review.theme,
    segment: review.segment,
    barrier: review.barrier,
    text: review.text,
    root_cause: review.root_cause,
    unmet_need: review.unmet_need,
  }));

  return `Aggregated patterns (${aggregation.totalReviews} total reviews):

Top themes:
${formatFrequency(aggregation.themeFrequency)}

User segments:
${formatFrequency(aggregation.segmentBreakdown)}

Discovery barriers:
${formatFrequency(aggregation.barrierAnalysis)}

Representative reviews:
${JSON.stringify(samplePayload, null, 2)}

Generate the insight JSON.`;
}
