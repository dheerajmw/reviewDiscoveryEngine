import {
  isQuestionAnswerableFromContext,
  NO_RELEVANT_DATA_REPLY,
  noRelevantDataResponse,
} from "./chat-guard";
import type { AnalysisContext, ChatResponse } from "./types";

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function topEntry(
  data: Record<string, { count: number; pct: number }>,
): [string, { count: number; pct: number }] | undefined {
  return Object.entries(data).sort((a, b) => b[1].count - a[1].count)[0];
}

function topSources(context: AnalysisContext, n = 2): string[] {
  return Object.entries(context.evidence.sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([source]) => source);
}

function quoteForLabel(
  context: AnalysisContext,
  label: string,
): string | undefined {
  const cluster = context.evidence.themeEvidence.find((c) => c.label === label);
  return cluster?.quotes[0]?.text;
}

export function generateChatMock(
  question: string,
  context: AnalysisContext,
): ChatResponse {
  if (!isQuestionAnswerableFromContext(question, context)) {
    return noRelevantDataResponse();
  }

  const q = question.toLowerCase();
  const { evidence, findings } = context;
  const topTheme = topEntry(evidence.themeFrequency);
  const topBarrier = topEntry(evidence.barrierAnalysis);
  const topSegment = topEntry(evidence.segmentBreakdown);
  const topBehavior = topEntry(evidence.behaviorFrequency);
  const topUnmet = topEntry(evidence.unmetNeedFrequency);

  const themeLabel = topTheme?.[0];
  const themePct = topTheme?.[1].pct ?? 0;
  const themeCount = topTheme?.[1].count ?? 0;
  const barrierLabel = topBarrier?.[0];
  const barrierPct = topBarrier?.[1].pct ?? 0;
  const segmentLabel = topSegment?.[0];

  if (!themeLabel && !barrierLabel) {
    return noRelevantDataResponse();
  }

  if (
    q.includes("struggle") ||
    q.includes("discover") ||
    q.includes("why do users") ||
    q.includes("why discovery")
  ) {
    const quote = quoteForLabel(context, themeLabel ?? "");
    return {
      reply: `${findings.why_discovery_fails}${quote ? `\n\nSupporting quote: "${truncate(quote)}"` : ""}`.trim(),
      citations: themeLabel
        ? [
            {
              label: themeLabel,
              count: themeCount,
              sources: topSources(context),
              quote: quote ? truncate(quote) : undefined,
            },
          ]
        : undefined,
    };
  }

  if (q.includes("frustrat") || q.includes("recommendation")) {
    const lines = findings.top_frustrations
      .slice(0, 5)
      .map((item) => `• ${item}`)
      .join("\n");
    return {
      reply: `Top frustrations from ${context.discoveryRelevantCount} discovery-related reviews:\n\n${lines}`,
      citations: barrierLabel
        ? [{ label: barrierLabel, count: topBarrier?.[1].count }]
        : undefined,
    };
  }

  if (q.includes("behavior") || q.includes("listening")) {
    const lines = findings.listening_behaviors
      .map((item) => `• ${item}`)
      .join("\n");
    const quote = evidence.behaviorEvidence[0]?.quotes[0]?.text;
    return {
      reply: `Listening behaviors users are trying to achieve:\n\n${lines}${quote ? `\n\nExample: "${truncate(quote)}"` : ""}`,
      citations: topBehavior
        ? [{ label: topBehavior[0], count: topBehavior[1].count }]
        : undefined,
    };
  }

  if (q.includes("repeat") || q.includes("same content") || q.includes("repetition")) {
    const lines = findings.repetition_causes.map((item) => `• ${item}`).join("\n");
    const quote = evidence.repetitionEvidence[0]?.quotes[0]?.text;
    return {
      reply: `Causes of repeated listening:\n\n${lines}${quote ? `\n\nSupporting quote: "${truncate(quote)}"` : ""}`,
      citations: evidence.repetitionEvidence[0]
        ? [
            {
              label: evidence.repetitionEvidence[0].label,
              count: evidence.repetitionEvidence[0].count,
              quote: quote ? truncate(quote) : undefined,
            },
          ]
        : undefined,
    };
  }

  if (q.includes("segment") || q.includes("challenge")) {
    const lines = Object.entries(findings.segment_challenges)
      .map(([seg, items]) => `• ${seg}: ${items.join(", ")}`)
      .join("\n");
    return {
      reply: `Segment-specific discovery challenges:\n\n${lines || "No segment cross-tab data available."}`,
      citations: segmentLabel
        ? [{ label: segmentLabel, count: topSegment?.[1].count }]
        : undefined,
    };
  }

  if (q.includes("unmet") || q.includes("need")) {
    const lines = findings.unmet_needs.map((item) => `• ${item}`).join("\n");
    const quote = evidence.unmetNeedEvidence[0]?.quotes[0]?.text;
    return {
      reply: `Consistent unmet needs:\n\n${lines}${quote ? `\n\nExample: "${truncate(quote)}"` : ""}`,
      citations: topUnmet
        ? [
            {
              label: topUnmet[0],
              count: topUnmet[1].count,
              quote: quote ? truncate(quote) : undefined,
            },
          ]
        : undefined,
    };
  }

  if (q.includes("barrier") || q.includes("friction")) {
    const entries = Object.entries(evidence.barrierAnalysis);
    if (entries.length === 0) return noRelevantDataResponse();
    const lines = entries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([name, { pct, count }]) => `• ${name}: ${pct}% (${count} reviews)`)
      .join("\n");
    return {
      reply: `The top discovery barriers across ${context.discoveryRelevantCount} discovery-related reviews:\n\n${lines}`,
      citations: barrierLabel
        ? [{ label: barrierLabel, count: topBarrier?.[1].count, sources: topSources(context) }]
        : undefined,
    };
  }

  if (
    q.includes("reddit") ||
    q.includes("play store") ||
    q.includes("playstore") ||
    q.includes("app store") ||
    q.includes("differ") ||
    q.includes("source")
  ) {
    const entries = Object.entries(evidence.sourceBreakdown);
    if (entries.length === 0) return noRelevantDataResponse();
    const lines = entries
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => {
        const pct = Math.round((count / context.discoveryRelevantCount) * 100);
        return `• ${source}: ${count} reviews (${pct}%)`;
      })
      .join("\n");
    const sample = evidence.themeEvidence[0]?.quotes
      .slice(0, 2)
      .map((r) => `[${r.source}] ${truncate(r.text)}`)
      .join("\n");
    return {
      reply: `Source mix in discovery-related reviews:\n\n${lines}${sample ? `\n\nSample quotes:\n${sample}` : ""}`,
      citations: topSources(context, 3).map((source) => ({
        label: source,
        count: evidence.sourceBreakdown[source],
      })),
    };
  }

  if (q.includes("opportunit") || q.includes("novelty") || q.includes("product")) {
    if (findings.unmet_needs.length === 0) return noRelevantDataResponse();
    const opps = findings.unmet_needs.map((n) => `• ${n}`).join("\n");
    return {
      reply: `Product opportunities from this analysis:\n\n${opps}`,
      citations: barrierLabel
        ? [{ label: barrierLabel, count: topBarrier?.[1].count }]
        : undefined,
    };
  }

  if (q.includes("evidence") || q.includes("support") || q.includes("theme")) {
    if (!themeLabel) return noRelevantDataResponse();
    const cluster = evidence.themeEvidence.find((c) => c.label === themeLabel);
    const samples = (cluster?.quotes ?? [])
      .slice(0, 3)
      .map((r) => `• [${r.source}] "${truncate(r.text)}"`)
      .join("\n");
    if (!samples) return noRelevantDataResponse();
    return {
      reply: `Evidence for ${themeLabel} (${themePct}%, ${themeCount} reviews):\n\n${samples}`,
      citations: [{ label: themeLabel, count: themeCount, sources: topSources(context) }],
    };
  }

  if (q.includes("emotion")) {
    const entries = Object.entries(evidence.emotionFrequency);
    const lines = entries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, { pct, count }]) => `• ${name}: ${pct}% (${count})`)
      .join("\n");
    return { reply: `Emotional patterns:\n\n${lines}` };
  }

  if (q.includes("root cause")) {
    const lines = Object.entries(evidence.rootCauseFrequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, { pct, count }]) => `• ${name}: ${pct}% (${count})`)
      .join("\n");
    const quote = evidence.rootCauseEvidence[0]?.quotes[0]?.text;
    return {
      reply: `Root causes from evidence:\n\n${lines}${quote ? `\n\nQuote: "${truncate(quote)}"` : ""}`,
    };
  }

  if (q.includes("summary") || q.includes("overview") || q.includes("insight")) {
    return {
      reply: findings.why_discovery_fails,
      citations: themeLabel ? [{ label: themeLabel, count: themeCount }] : undefined,
    };
  }

  if (q.includes("why")) {
    return {
      reply: findings.repetition_causes.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      citations: themeLabel ? [{ label: themeLabel, count: themeCount }] : undefined,
    };
  }

  if (q.includes("problem")) {
    return {
      reply: findings.top_frustrations.map((p, i) => `${i + 1}. ${p}`).join("\n"),
      citations: themeLabel ? [{ label: themeLabel, count: themeCount }] : undefined,
    };
  }

  return noRelevantDataResponse();
}

export { NO_RELEVANT_DATA_REPLY };
