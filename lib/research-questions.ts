import {
  RESEARCH_QUESTION_IDS,
  RESEARCH_QUESTION_LABELS,
  type ResearchQuestionId,
} from "./classify-research";
import { topLabels } from "./evidence";
import {
  mergeQuotes,
  mergeSourceDistributions,
} from "./finding-evidence";
import {
  BEHAVIOR_NARRATIVES,
  BARRIER_INSIGHT_FRAGMENTS,
  ROOT_CAUSE_INSIGHT_FRAGMENTS,
  THEME_INSIGHT_FRAGMENTS,
  UNMET_NEED_NARRATIVES,
  composeInsightSentence,
  displaySegment,
} from "./executive/insight-narratives";
import type {
  AggregationResult,
  EvidenceBackedFinding,
  QuoteEvidence,
  ResearchFindingsReport,
  ResearchQuestionAnswer,
  SegmentChallengeFinding,
} from "./types";

function joinSentences(sentences: string[]): string {
  return sentences.filter(Boolean).slice(0, 3).join(" ");
}

function weightedConfidence(findings: EvidenceBackedFinding[]): number {
  if (findings.length === 0) return 0;
  const totalEvidence = findings.reduce((sum, f) => sum + f.evidence_count, 0);
  if (totalEvidence === 0) {
    return (
      Math.round(
        (findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length) *
          100,
      ) / 100
    );
  }
  const weighted =
    findings.reduce((sum, f) => sum + f.confidence * f.evidence_count, 0) /
    totalEvidence;
  return Math.round(weighted * 100) / 100;
}

function collectEvidence(findings: EvidenceBackedFinding[]): {
  quotes: QuoteEvidence[];
  source_distribution: Record<string, number>;
  confidence: number;
  evidence_count: number;
} {
  const quotes = mergeQuotes(...findings.map((f) => f.quotes))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  return {
    quotes,
    source_distribution: mergeSourceDistributions(
      findings.map((f) => f.source_distribution),
    ),
    confidence: weightedConfidence(findings),
    evidence_count: findings.reduce((sum, f) => sum + f.evidence_count, 0),
  };
}

function segmentChallengesAsFindings(
  items: SegmentChallengeFinding[],
): EvidenceBackedFinding[] {
  return items.map((item) => ({
    id: item.id,
    title: `${displaySegment(item.segment)}: ${item.challenge}`,
    summary: `${displaySegment(item.segment)} users face ${item.challenge} in ${item.pct}% of segment reviews.`,
    pct: item.pct,
    evidence_count: item.evidence_count,
    confidence: item.confidence,
    quotes: item.quotes,
    source_distribution: item.source_distribution,
    top_segments: [{ segment: item.segment, count: item.evidence_count, pct: item.pct }],
    related_review_ids: item.related_review_ids,
  }));
}

function topEmotionLabels(
  evidence: AggregationResult,
  limit = 2,
): { label: string; pct: number }[] {
  return Object.entries(evidence.emotionFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([label, entry]) => ({ label, pct: entry.pct }));
}

function synthesizeWhyDiscoveryFails(
  report: ResearchFindingsReport,
  evidence: AggregationResult,
): string {
  const themes = evidence.themeEvidence.slice(0, 2);
  const barriers = topLabels(evidence.barrierAnalysis, 1);
  const root = report.repetition_causes[0]?.title;

  const lead = composeInsightSentence({
    theme: themes[0]?.label,
    barrier: barriers[0],
    root_cause: root,
  });

  const themeDetail =
    themes.length > 0
      ? `Across ${evidence.discoveryRelevantCount} discovery-related reviews, ${themes[0]!.label} leads at ${themes[0]!.pct}%${themes[1] ? `, with ${themes[1].label} at ${themes[1].pct}%` : ""}.`
      : report.why_discovery_fails.summary;

  const barrierDetail =
    barriers[0] && BARRIER_INSIGHT_FRAGMENTS[barriers[0]]
      ? `A recurring blocker is ${barriers[0].toLowerCase()}: ${BARRIER_INSIGHT_FRAGMENTS[barriers[0]]}.`
      : "";

  return joinSentences([lead, themeDetail, barrierDetail]);
}

function synthesizeFrustrations(
  report: ResearchFindingsReport,
  evidence: AggregationResult,
): string {
  const top = report.top_frustrations.slice(0, 3);
  const emotions = topEmotionLabels(evidence, 2);

  const themeList = top
    .map((finding) => `${finding.title} (${finding.pct ?? 0}%)`)
    .join(", ");

  const lead = themeList
    ? `Users most often criticize recommendations through ${themeList}.`
    : "Users report recurring frustration when algorithmic recommendations miss their discovery intent.";

  const emotionSentence =
    emotions.length > 0
      ? `The dominant emotional tone is ${emotions[0]!.label.toLowerCase()} (${emotions[0]!.pct}% of reviews)${emotions[1] ? `, followed by ${emotions[1].label.toLowerCase()} (${emotions[1].pct}%)` : ""}.`
      : "";

  const fragment =
    top[0] && THEME_INSIGHT_FRAGMENTS[top[0].title]
      ? `In practice, ${THEME_INSIGHT_FRAGMENTS[top[0].title]}.`
      : top[0]?.summary ?? "";

  return joinSentences([lead, emotionSentence, fragment]);
}

function synthesizeListeningBehaviors(
  report: ResearchFindingsReport,
): string {
  const top = report.listening_behaviors.slice(0, 3);
  if (top.length === 0) {
    return "Users describe a mix of discovery-oriented and comfort-listening behaviors, but explicit behavioral signals are limited in this corpus.";
  }

  const lead = `Users are primarily trying to ${top
    .map((finding) => `${finding.title.toLowerCase()} (${finding.pct ?? 0}%)`)
    .join(", ")}.`;

  const narrative =
    BEHAVIOR_NARRATIVES[top[0]!.title] ??
    top[0]!.summary;

  const followUp =
    top[1] && BEHAVIOR_NARRATIVES[top[1].title]
      ? BEHAVIOR_NARRATIVES[top[1].title]
      : "";

  return joinSentences([lead, narrative, followUp]);
}

function synthesizeRepetitionCauses(report: ResearchFindingsReport): string {
  const top = report.repetition_causes.slice(0, 2);
  if (top.length === 0) {
    return "The corpus contains limited explicit attribution for why users repeatedly hear the same content.";
  }

  const lead = `Repeated listening most often traces to ${top
    .map((finding) => `${finding.title} (${finding.pct ?? 0}%)`)
    .join(" and ")}.`;

  const mechanism =
    top[0]?.mechanism ??
    (top[0] && ROOT_CAUSE_INSIGHT_FRAGMENTS[top[0].title]
      ? `This happens because ${ROOT_CAUSE_INSIGHT_FRAGMENTS[top[0].title]}.`
      : top[0]?.summary ?? "");

  const second =
    top[1]?.mechanism ??
    (top[1] && ROOT_CAUSE_INSIGHT_FRAGMENTS[top[1].title]
      ? `${top[1].title} also contributes: ${ROOT_CAUSE_INSIGHT_FRAGMENTS[top[1].title]}.`
      : "");

  return joinSentences([lead, mechanism, second]);
}

function synthesizeSegmentChallenges(
  report: ResearchFindingsReport,
): string {
  const top = report.segment_challenges.slice(0, 3);
  if (top.length === 0) {
    return "Segment-level discovery challenges are not strongly differentiated in this corpus — pain points appear broadly distributed across listener types.";
  }

  const comparisons = top.map(
    (item) =>
      `${displaySegment(item.segment)} users most often struggle with ${item.challenge} (${item.pct}% of segment reviews)`,
  );

  const lead =
    comparisons.length === 1
      ? `${comparisons[0]}.`
      : `${comparisons.slice(0, -1).join("; ")}, while ${comparisons[comparisons.length - 1]}.`;

  const detail =
    top.length >= 2
      ? "Discovery friction is segment-specific — the same product surface creates different failure modes depending on how users listen."
      : "This pattern suggests discovery interventions may need segment-aware tuning rather than one-size-fits-all ranking.";

  const themeFragment =
    top[0] && THEME_INSIGHT_FRAGMENTS[top[0].challenge]
      ? `For these listeners, ${THEME_INSIGHT_FRAGMENTS[top[0].challenge]}.`
      : "";

  return joinSentences([lead, detail, themeFragment]);
}

function synthesizeUnmetNeeds(report: ResearchFindingsReport): string {
  const top = report.unmet_needs.slice(0, 3);
  if (top.length === 0) {
    return "Users express diffuse discovery improvement wishes without converging on a single unmet need in this corpus.";
  }

  const lead = `The most consistent unmet needs are ${top
    .map((finding) => `${finding.title.toLowerCase()} (${finding.pct ?? 0}%)`)
    .join(", ")}.`;

  const narrative =
    UNMET_NEED_NARRATIVES[top[0]!.title] ?? top[0]!.summary;

  const second =
    top[1] && UNMET_NEED_NARRATIVES[top[1].title]
      ? UNMET_NEED_NARRATIVES[top[1].title]
      : "";

  return joinSentences([lead, narrative, second]);
}

const ANSWER_BUILDERS: Record<
  ResearchQuestionId,
  (report: ResearchFindingsReport, evidence: AggregationResult) => string
> = {
  why_discovery_fails: synthesizeWhyDiscoveryFails,
  top_frustrations: synthesizeFrustrations,
  listening_behaviors: (report) => synthesizeListeningBehaviors(report),
  repetition_causes: (report) => synthesizeRepetitionCauses(report),
  segment_challenges: (report) => synthesizeSegmentChallenges(report),
  unmet_needs: (report) => synthesizeUnmetNeeds(report),
};

function findingsForQuestion(
  id: ResearchQuestionId,
  report: ResearchFindingsReport,
): EvidenceBackedFinding[] {
  switch (id) {
    case "why_discovery_fails":
      return [report.why_discovery_fails];
    case "top_frustrations":
      return report.top_frustrations.slice(0, 3);
    case "listening_behaviors":
      return report.listening_behaviors.slice(0, 3);
    case "repetition_causes":
      return report.repetition_causes.slice(0, 3);
    case "segment_challenges":
      return segmentChallengesAsFindings(report.segment_challenges.slice(0, 3));
    case "unmet_needs":
      return report.unmet_needs.slice(0, 3);
  }
}

export function buildResearchQuestionAnswers(
  report: ResearchFindingsReport,
  evidence: AggregationResult,
): ResearchQuestionAnswer[] {
  return RESEARCH_QUESTION_IDS.map((id) => {
    const findings = findingsForQuestion(id, report);
    const evidenceBundle = collectEvidence(findings);
    return {
      id,
      question: RESEARCH_QUESTION_LABELS[id],
      answer: ANSWER_BUILDERS[id](report, evidence),
      quotes: evidenceBundle.quotes,
      source_distribution: evidenceBundle.source_distribution,
      confidence: evidenceBundle.confidence,
      evidence_count: evidenceBundle.evidence_count,
    };
  });
}
