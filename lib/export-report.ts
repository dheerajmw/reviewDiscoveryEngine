import { PLATFORM_NAME } from "./brand";
import type {
  AggregationResult,
  ClassifiedReview,
  ResearchFindings,
} from "./types";

export function buildReportJson(
  classified: ClassifiedReview[],
  evidence: AggregationResult,
  findings: ResearchFindings,
) {
  return {
    generatedAt: new Date().toISOString(),
    totalReviews: evidence.totalReviews,
    discoveryRelevantCount: evidence.discoveryRelevantCount,
    excludedCount: evidence.excludedCount,
    evidence,
    findings,
    classified,
  };
}

export function buildReportMarkdown(
  evidence: AggregationResult,
  findings: ResearchFindings,
): string {
  const formatFreq = (data: Record<string, { count: number; pct: number }>) =>
    Object.entries(data)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { pct, count }]) => `- ${name}: ${pct}% (${count})`)
      .join("\n");

  const segmentChallenges = Object.entries(findings.segment_challenges)
    .map(([seg, items]) => `- **${seg}**: ${items.join(", ")}`)
    .join("\n");

  return `# ${PLATFORM_NAME} Report

## Research Findings

### Why do users struggle to discover new music?
${findings.why_discovery_fails}

### Top frustrations
${findings.top_frustrations.map((f) => `- ${f}`).join("\n")}

### Listening behaviors
${findings.listening_behaviors.map((b) => `- ${b}`).join("\n")}

### Repetition causes
${findings.repetition_causes.map((r) => `- ${r}`).join("\n")}

### Segment challenges
${segmentChallenges}

### Unmet needs
${findings.unmet_needs.map((n) => `- ${n}`).join("\n")}

## Evidence (${evidence.discoveryRelevantCount} discovery-related)

### Themes
${formatFreq(evidence.themeFrequency)}

### Behaviors
${formatFreq(evidence.behaviorFrequency)}

### Emotions
${formatFreq(evidence.emotionFrequency)}

### Segments
${formatFreq(evidence.segmentBreakdown)}

### Barriers
${formatFreq(evidence.barrierAnalysis)}

### Root causes
${formatFreq(evidence.rootCauseFrequency)}

### Unmet needs
${formatFreq(evidence.unmetNeedFrequency)}
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
