import type {
  AggregationResult,
  ClassifiedReview,
  InsightResult,
} from "./types";

export function buildReportJson(
  classified: ClassifiedReview[],
  aggregation: AggregationResult,
  insights: InsightResult,
) {
  return {
    generatedAt: new Date().toISOString(),
    totalReviews: aggregation.totalReviews,
    aggregation,
    insights,
    classified,
  };
}

export function buildReportMarkdown(
  aggregation: AggregationResult,
  insights: InsightResult,
): string {
  const themes = Object.entries(aggregation.themeFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { pct }]) => `- ${name}: ${pct}%`)
    .join("\n");

  const segments = Object.entries(aggregation.segmentBreakdown)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { pct }]) => `- ${name}: ${pct}%`)
    .join("\n");

  const barriers = Object.entries(aggregation.barrierAnalysis)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { pct }]) => `- ${name}: ${pct}%`)
    .join("\n");

  const rootCauses = insights.rootCauses
    .map((cause, i) => `${i + 1}. ${cause}`)
    .join("\n");

  const problems = insights.discoveryProblems
    .map((problem) => `- ${problem}`)
    .join("\n");

  const opportunities = insights.opportunities
    .map((opp) => `- **${opp.title}**: ${opp.description}`)
    .join("\n");

  return `# Review Discovery Report

## Executive Summary
${insights.summary}

## Theme Distribution
${themes}

## User Segments
${segments}

## Discovery Barriers
${barriers}

## Root Causes
${rootCauses}

## Discovery Problems
${problems}

## Product Opportunities
${opportunities}
`;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
