import type { AnalysisContext } from "./types";

export const CHAT_ASSISTANT_NAME = "Discovery Insight Assistant";

export const CHAT_SYSTEM_PROMPT = `You are the ${CHAT_ASSISTANT_NAME}.

STRICT RULES — follow without exception:
1. Use ONLY the analysis context below (findings summary, top themes/barriers, and sample quotes). No outside knowledge.
2. Every claim must cite evidence: percentages, counts, or representative review quotes.
3. When answering, include at least one supporting review quote when quotes are available for the topic.
4. If the question cannot be answered from the context, set insufficient_data to true and reply with exactly: "No relevant data found in the analyzed reviews for this question. Try asking about themes, barriers, segments, behaviors, emotions, root causes, unmet needs, or opportunities from this dataset."
5. Do not guess or extrapolate beyond the evidence.
6. Keep answers concise (1-3 short paragraphs max).

Respond with JSON only:
{
  "insufficient_data": false,
  "reply": "your grounded answer with evidence",
  "citations": [
    { "label": "Theme or barrier name", "count": 123, "sources": ["reddit", "playstore"], "quote": "optional short quote" }
  ]
}

When insufficient_data is true: citations must be [] or omitted.`;

const REVIEW_TEXT_LIMIT = 200;
const MAX_QUOTES = 10;

function truncate(text: string, max = REVIEW_TEXT_LIMIT): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function topFrequencyEntries(
  data: Record<string, { count: number; pct: number }>,
  limit: number,
): string {
  return Object.entries(data)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, { count, pct }]) => `- ${name}: ${pct}% (${count})`)
    .join("\n");
}

function collectSampleQuotes(context: AnalysisContext): string {
  const clusters = [
    ...context.evidence.themeEvidence.slice(0, 4),
    ...context.evidence.rootCauseEvidence.slice(0, 2),
    ...context.evidence.unmetNeedEvidence.slice(0, 2),
    ...context.evidence.repetitionEvidence.slice(0, 2),
  ];

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const cluster of clusters) {
    for (const q of cluster.quotes) {
      if (lines.length >= MAX_QUOTES) break;
      const key = `${q.source}:${q.text.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(
        `- [${q.source}] ${cluster.label}: "${truncate(q.text)}"`,
      );
    }
    if (lines.length >= MAX_QUOTES) break;
  }

  return lines.join("\n") || "(none)";
}

export function buildChatContextBlock(context: AnalysisContext): string {
  const { evidence, findings } = context;
  const report = findings.report;

  const opportunityLines = report
    ? report.unmet_needs
        .slice(0, 3)
        .map((f) => `- ${f.title}: ${f.summary}`)
        .join("\n")
    : findings.unmet_needs.slice(0, 3).map((n) => `- ${n}`).join("\n");

  return `
BOUNDARY: This is the ONLY data you may use. Do not use any information outside this block.

TOTAL REVIEWS: ${context.totalReviews}
DISCOVERY-RELATED: ${context.discoveryRelevantCount} (${evidence.excludedCount} non-discovery excluded)
${context.filterNote ? `FILTER NOTE: ${context.filterNote}\n` : ""}

=== RESEARCH FINDINGS ===
Why discovery fails: ${findings.why_discovery_fails}
Top frustrations: ${findings.top_frustrations.slice(0, 5).join("; ")}
Listening behaviors: ${findings.listening_behaviors.slice(0, 5).join("; ")}
Repetition causes: ${findings.repetition_causes.slice(0, 3).join("; ")}
Unmet needs: ${findings.unmet_needs.slice(0, 5).join("; ")}
Segment challenges: ${Object.entries(findings.segment_challenges)
    .slice(0, 4)
    .map(([seg, items]) => `${seg}: ${items.slice(0, 2).join(", ")}`)
    .join(" | ")}

=== TOP THEMES (by frequency) ===
${topFrequencyEntries(evidence.themeFrequency, 3)}

=== TOP BARRIERS (by frequency) ===
${topFrequencyEntries(evidence.barrierAnalysis, 3)}

=== SAMPLE QUOTES (max ${MAX_QUOTES}) ===
${collectSampleQuotes(context)}

=== PRODUCT OPPORTUNITIES ===
${opportunityLines}
`.trim();
}
