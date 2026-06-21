import type { AnalysisContext } from "./types";

export const NO_RELEVANT_DATA_REPLY =
  "No relevant data found in the analyzed reviews for this question. Try asking about themes, barriers, segments, behaviors, emotions, root causes, unmet needs, or opportunities from this dataset.";

const IN_SCOPE_TOPIC_KEYWORDS = [
  "review",
  "reviews",
  "user",
  "users",
  "discover",
  "discovery",
  "music",
  "recommend",
  "recommendation",
  "algorithm",
  "playlist",
  "barrier",
  "barriers",
  "segment",
  "segments",
  "theme",
  "themes",
  "source",
  "sources",
  "reddit",
  "play store",
  "playstore",
  "app store",
  "appstore",
  "spotify",
  "repetition",
  "novelty",
  "opportunity",
  "opportunities",
  "problem",
  "problems",
  "root cause",
  "struggle",
  "evidence",
  "complaint",
  "feedback",
  "analyze",
  "analysed",
  "analyzed",
  "dataset",
  "listening",
  "radio",
  "weekly",
  "wrapped",
  "explore",
  "exploration",
  "friction",
  "summary",
  "insight",
  "insights",
  "behavior",
  "behaviors",
  "emotion",
  "emotions",
  "unmet",
  "need",
  "needs",
  "frustrat",
  "repeat",
  "quote",
  "quotes",
  "finding",
  "findings",
];

const OFF_TOPIC_KEYWORDS = [
  "weather",
  "stock price",
  "stock market",
  "recipe",
  "football",
  "soccer",
  "bitcoin",
  "crypto",
  "election",
  "president",
  "movie",
  "netflix pricing",
  "apple music vs",
  "youtube music",
  "tidal",
  "code this",
  "write code",
  "homework",
  "math problem",
];

function buildContextVocabulary(context: AnalysisContext): Set<string> {
  const vocab = new Set<string>();
  const { evidence, findings } = context;

  const addText = (text: string) => {
    for (const word of text.toLowerCase().split(/\W+/)) {
      if (word.length >= 4) vocab.add(word);
    }
  };

  const freqKeys = [
    evidence.themeFrequency,
    evidence.behaviorFrequency,
    evidence.emotionFrequency,
    evidence.segmentBreakdown,
    evidence.barrierAnalysis,
    evidence.rootCauseFrequency,
    evidence.unmetNeedFrequency,
  ];
  for (const freq of freqKeys) {
    for (const key of Object.keys(freq)) addText(key);
  }

  for (const key of Object.keys(evidence.sourceBreakdown)) addText(key);

  addText(findings.why_discovery_fails);
  for (const item of [
    ...findings.top_frustrations,
    ...findings.listening_behaviors,
    ...findings.repetition_causes,
    ...findings.unmet_needs,
  ]) {
    addText(item);
  }

  for (const clusters of [
    evidence.themeEvidence,
    evidence.rootCauseEvidence,
    evidence.unmetNeedEvidence,
    evidence.repetitionEvidence,
  ]) {
    for (const cluster of clusters) {
      addText(cluster.label);
      for (const quote of cluster.quotes) {
        addText(quote.text);
        addText(quote.source);
      }
    }
  }

  return vocab;
}

export function isQuestionAnswerableFromContext(
  question: string,
  context: AnalysisContext,
): boolean {
  const q = question.toLowerCase().trim();
  if (!q) return false;

  if (OFF_TOPIC_KEYWORDS.some((term) => q.includes(term))) {
    return false;
  }

  const vocab = buildContextVocabulary(context);
  const questionWords = q.split(/\W+/).filter((w) => w.length >= 4);

  const mentionsContextTerm = questionWords.some((word) => vocab.has(word));
  const hasInScopeTopic = IN_SCOPE_TOPIC_KEYWORDS.some((term) =>
    q.includes(term),
  );

  if (!mentionsContextTerm && !hasInScopeTopic) {
    return false;
  }

  return true;
}

export function noRelevantDataResponse(): {
  reply: string;
  citations?: undefined;
} {
  return { reply: NO_RELEVANT_DATA_REPLY };
}
