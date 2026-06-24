import {
  behaviorFromResearchDraft,
  buildResearchEvidenceDraft,
} from "./classify-research-mock";
import { mergeClassificationItem } from "./classify-normalize";
import {
  BARRIER_FALLBACK,
  BARRIERS,
  BEHAVIORS,
  EMOTIONS,
  hasSegmentBehavioralSignals,
  inferClosestRootCause,
  isRepetitionRelatedReview,
  ROOT_CAUSES,
  SEGMENTS,
  THEMES,
  UNMET_NEEDS,
  buildTaxonomyReport,
} from "./taxonomy";
import type {
  ClassifiedReview,
  RawReview,
  TaxonomyDimension,
  TaxonomyReport,
  TaxonomyViolation,
} from "./types";

export type { TaxonomyReport };

const TAXONOMY_DIMENSIONS: TaxonomyDimension[] = [
  "theme",
  "behavior",
  "emotion",
  "segment",
  "barrier",
  "root_cause",
  "unmet_need",
];

type RuleSet = { label: string; keywords: string[]; weight?: number }[];

const THEME_RULES: RuleSet = [
  {
    label: "Positive Discovery Experience",
    keywords: [
      "love discover weekly",
      "discover weekly",
      "release radar",
      "spotify dj",
      "daily mix",
      "great recommendations",
      "introduced me to",
      "introduced me",
      "found new artists",
      "find new music",
      "find great new",
      "recommendations work",
      "recommendations are",
      "spot on",
      "love the dj",
      "amazing discovery",
      "best feature",
      "hidden gem",
      "genuine find",
      "consistently helps",
      "discovery features",
      "go-to discovery",
      "artist radio",
      "new music every week",
      "discover artists",
    ],
    weight: 3,
  },
  {
    label: "Repetition Fatigue",
    keywords: [
      "same song",
      "same artist",
      "same music",
      "on repeat",
      "recycled",
      "regurgitat",
      "over and over",
      "repetitive recommend",
    ],
  },
  {
    label: "Genre Lock-In",
    keywords: [
      "genre bubble",
      "filter bubble",
      "one genre",
      "one type of music",
      "locked in",
      "break out of",
      "same genre",
      "stuck in a genre",
    ],
  },
  {
    label: "Lack of Discovery Control",
    keywords: [
      "no control over recommend",
      "can't control recommend",
      "steer recommend",
      "novelty slider",
      "adjust how adventurous",
      "control recommend",
    ],
  },
  {
    label: "Poor Recommendation Quality",
    keywords: [
      "bad recommend",
      "poor suggest",
      "irrelevant recommend",
      "wrong music",
      "useless recommend",
      "doesn't match my taste",
      "terrible recommend",
    ],
  },
  {
    label: "Algorithm Anxiety",
    keywords: [
      "afraid to skip",
      "scared to skip",
      "ruin my algorithm",
      "ruin the algorithm",
      "mess up my recommendations",
      "corrupt my",
      "don't skip",
      "avoid exploring",
      "protect my recommendations",
      "trapped by my history",
      "listening history trap",
      "can't explore without",
    ],
    weight: 2,
  },
  {
    label: "Mood-Context Mismatch",
    keywords: [
      "wrong mood",
      "wrong energy",
      "tone deaf",
      "tone-deaf",
      "for work",
      "at work",
      "relaxation",
      "relaxing",
      "social context",
      "party music",
      "doesn't match my mood",
      "not the vibe",
      "wrong vibe",
      "context",
    ],
    weight: 2,
  },
  {
    label: "Trust Erosion",
    keywords: [
      "discover weekly used to",
      "used to be good",
      "used to love discover weekly",
      "stopped opening discover weekly",
      "gave up on discover weekly",
      "gave up on discover",
      "not what it used to be",
      "quality declined",
      "quality dropped",
      "lost trust",
      "don't trust discover weekly anymore",
      "disappointed over time",
      "stopped using discover weekly",
    ],
    weight: 4,
  },
  {
    label: "Algorithm Distrust",
    keywords: [
      "don't trust the algorithm",
      "distrust algorithm",
      "opacity",
      "pushing artists",
      "manipulat",
    ],
  },
  {
    label: "Weak Discovery Surfaces",
    keywords: [
      "discover weekly useless",
      "release radar bad",
      "daily mix useless",
      "discovery tab",
      "dj always loops",
    ],
  },
];

const BARRIER_RULES: RuleSet = [
  {
    label: "Low Novelty",
    keywords: ["nothing new", "no novelty", "stale feed", "same old music"],
  },
  {
    label: "Similar Artist Loop",
    keywords: ["same artist", "similar artist", "artist loop", "same bands"],
  },
  {
    label: "Genre Saturation",
    keywords: ["genre bubble", "one genre", "genre locked", "same genre only"],
  },
  {
    label: "Lack of Exploration Controls",
    keywords: [
      "no control",
      "can't adjust recommend",
      "can't steer",
      "no slider",
      "wish i could adjust",
      "afraid to skip",
      "ruin my algorithm",
      "protect my recommendations",
    ],
  },
  {
    label: "Poor Personalization Context",
    keywords: [
      "wrong mood",
      "wrong energy",
      "wrong context",
      "doesn't understand me",
      "tone deaf",
      "for work",
      "relaxation",
      "not the vibe",
    ],
  },
  {
    label: "Ineffective Discovery Surfaces",
    keywords: [
      "discover weekly useless",
      "release radar bad",
      "daily mix useless",
      "used to be good",
      "stopped opening discover weekly",
      "gave up on discover weekly",
      "not what it used to be",
    ],
  },
  {
    label: "Cold Start Discovery",
    keywords: ["new account", "just started", "cold start", "new to spotify"],
  },
];

const BEHAVIOR_RULES: RuleSet = [
  {
    label: "Find New Music or Artists",
    keywords: ["find new artist", "discover new music", "hidden gem"],
  },
  {
    label: "Passive Background Listening",
    keywords: ["background listen", "autoplay", "radio mode"],
  },
  {
    label: "Explore by Genre or Mood",
    keywords: ["explore genre", "mood playlist", "music for mood"],
  },
  {
    label: "Listen to Familiar Content",
    keywords: ["comfort music", "listen to favorites", "same songs again"],
  },
  {
    label: "Social or External Discovery",
    keywords: ["tiktok", "youtube", "friend shared", "outside spotify"],
  },
  {
    label: "Evaluate Recommendations",
    keywords: ["recommendation quality", "evaluate recommend", "for you feed"],
  },
  {
    label: "Use Algorithmic Playlists",
    keywords: ["discover weekly", "release radar", "daily mix", "spotify dj"],
  },
];

const UNMET_NEED_RULES: RuleSet = [
  {
    label: "Adjustable Novelty",
    keywords: ["novelty slider", "adjust novelty", "adventurous dial"],
  },
  {
    label: "Discovery Control",
    keywords: [
      "control discovery",
      "steer recommend",
      "choose discovery",
      "more control over",
    ],
  },
  {
    label: "Explainable Recommendations",
    keywords: ["explain why", "transparent recommend", "why this song"],
  },
  {
    label: "Better Artist Discovery",
    keywords: ["find new artists", "artist discovery", "discover artists"],
  },
  {
    label: "Cross-Genre Exploration",
    keywords: ["cross genre", "different genres", "break out genre"],
  },
  {
    label: "Stronger Discovery Playlists",
    keywords: [
      "better discover weekly",
      "improve release radar",
      "stronger discovery",
    ],
  },
  {
    label: "Genre Exploration",
    keywords: ["explore genre", "outside genre", "different genre", "genre exploration"],
  },
  {
    label: "Freshness Guarantees",
    keywords: ["no repetition", "avoid repeat", "fresh recommend", "never repeat"],
  },
];

const SEGMENT_RULES: RuleSet = [
  {
    label: "Music Explorer",
    keywords: [
      "find new artist",
      "discover new music",
      "explore genre",
      "new genre",
      "outside my usual",
      "broaden my taste",
      "skip the same",
      "skip familiar",
      "skip songs i know",
      "discovery tool",
      "seek new",
      "hidden gem",
      "unfamiliar artist",
    ],
    weight: 2,
  },
  {
    label: "Discovery-Focused Listener",
    keywords: [
      "discover weekly",
      "release radar",
      "spotify dj",
      "daily mix",
      "algorithmic playlist",
      "weekly refresh",
      "fresh every week",
      "playlist freshness",
      "go-to discovery",
      "primary discovery",
    ],
    weight: 2,
  },
  {
    label: "Long-Term Power Listener",
    keywords: [
      "years on spotify",
      "long time user",
      "long-time user",
      "for years",
      "over a decade",
      "decade",
      "premium for years",
      "listen every day",
      "hours a day",
      "daily listening",
      "repetition fatigue",
      "same songs every week",
      "heavy user",
      "power user",
    ],
    weight: 2,
  },
  {
    label: "Playlist-Centric Listener",
    keywords: [
      "my playlist",
      "curate playlist",
      "curated playlist",
      "manually add",
      "built my own",
      "don't trust the algorithm",
      "ignore recommendations",
      "self-directed",
      "own library",
      "1000 songs playlist",
    ],
    weight: 2,
  },
  {
    label: "Casual Listener",
    keywords: [
      "background",
      "while working",
      "ambient",
      "passive",
      "don't pay attention",
      "just plays",
      "easy listening",
      "shuffle",
      "low effort",
    ],
    weight: 1,
  },
];

const SEGMENT_DEFAULT = "Casual Listener";
const SEGMENT_UNSPECIFIED = "Unspecified Segment";

function matchRootCause(
  text: string,
  theme: string,
  barrier: string,
): { label: string; evidence: string; confidence: number } {
  const inferred = inferClosestRootCause(text);
  if (inferred.score > 0) {
    return {
      label: inferred.label,
      evidence: inferred.hit,
      confidence: Math.min(0.55 + inferred.score * 0.12, 0.88),
    };
  }
  if (isRepetitionRelatedReview({ theme, barrier, text })) {
    return {
      label: "Engagement Optimization Bias",
      evidence: "",
      confidence: 0.55,
    };
  }
  return { label: "Unclear Repetition Cause", evidence: "", confidence: 0.42 };
}

function matchSegment(text: string): {
  label: string;
  evidence: string;
  confidence: number;
} {
  const match = scoreRules(text, SEGMENT_RULES);
  if (match.score > 0) {
    return {
      label: match.label,
      evidence: match.hit,
      confidence: Math.min(0.55 + match.score * 0.12, 0.88),
    };
  }
  if (!hasSegmentBehavioralSignals(text)) {
    return { label: SEGMENT_UNSPECIFIED, evidence: "", confidence: 0.42 };
  }
  return { label: SEGMENT_DEFAULT, evidence: "", confidence: 0.52 };
}

const EMOTION_RULES: RuleSet = [
  { label: "Frustration", keywords: ["frustrat", "annoy", "infuriat"] },
  { label: "Disappointment", keywords: ["disappoint", "let down"] },
  { label: "Boredom", keywords: ["bored", "stale", "tired of the same"] },
  { label: "Distrust", keywords: ["don't trust", "distrust", "skeptic"] },
  { label: "Curiosity", keywords: ["curious", "want to explore"] },
];

function scoreRules(text: string, rules: RuleSet): { label: string; score: number; hit: string } {
  const lower = text.toLowerCase();
  let best = { label: "", score: 0, hit: "" };

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        const score = (rule.weight ?? 1) + kw.length / 20;
        if (score > best.score) {
          best = { label: rule.label, score, hit: kw };
        }
      }
    }
  }

  return best;
}

function matchFromRules(
  text: string,
  rules: RuleSet,
  fallback: string,
): { label: string; evidence: string; confidence: number } {
  const match = scoreRules(text, rules);
  if (match.score > 0) {
    return {
      label: match.label,
      evidence: match.hit,
      confidence: Math.min(0.55 + match.score * 0.12, 0.88),
    };
  }
  return { label: fallback, evidence: "", confidence: 0.45 };
}

function mockClassifyReview(review: RawReview, index: number): {
  review: ClassifiedReview;
  violations: TaxonomyViolation[];
} {
  const draft = buildResearchEvidenceDraft(review);

  if (!draft.research_relevant) {
    const { review: classifiedReview } = mergeClassificationItem(
      review,
      {
        research_relevant: false,
        discovery_relevant: false,
        discovery_reason:
          "Generic praise or insufficient discovery evidence for PM research.",
        confidence: 0.3,
      },
      index,
    );
    return { review: classifiedReview, violations: [] };
  }

  const text = review.text;
  const themeMatch = matchFromRules(text, THEME_RULES, "Other Discovery Frustration");
  const positiveDiscovery =
    /\b(introduced me to|discover(ed)? new|spot on|find (great )?new music|hidden gem|genuine find|consistently helps|go-to discovery|recommendations? (are |is )?(spot on|great|excellent|usually spot on))\b/i.test(
      text,
    ) &&
    !/\b(same artist|on repeat|frustrat|hate|terrible|useless|broken)\b/i.test(
      text,
    );
  const themeLabel =
    positiveDiscovery && themeMatch.label === "Other Discovery Frustration"
      ? /\b(discover weekly|release radar|daily mix|spotify dj)\b/i.test(text)
        ? "Strong Discovery Playlists"
        : "Positive Discovery Experience"
      : themeMatch.label;
  const barrierMatch = matchFromRules(text, BARRIER_RULES, BARRIER_FALLBACK);
  const behaviorMatch = matchFromRules(
    text,
    BEHAVIOR_RULES,
    behaviorFromResearchDraft(draft),
  );
  const rootCauseMatch = matchRootCause(text, themeLabel, barrierMatch.label);
  const unmetNeedMatch = matchFromRules(
    text,
    UNMET_NEED_RULES,
    "General Discovery Improvement",
  );
  const segmentMatch = matchSegment(text);
  const emotionMatch = matchFromRules(text, EMOTION_RULES, "Neutral");

  const confValues = [
    themeMatch.confidence,
    barrierMatch.confidence,
    behaviorMatch.confidence,
    emotionMatch.confidence,
    segmentMatch.confidence,
    rootCauseMatch.confidence,
    unmetNeedMatch.confidence,
  ].filter((value) => value > 0);

  const avgConfidence =
    confValues.length > 0
      ? confValues.reduce((sum, value) => sum + value, 0) / confValues.length
      : 0.55;

  const { review: classifiedReview, violations } = mergeClassificationItem(
    review,
    {
      research_relevant: true,
      supports_questions: draft.supports_questions,
      observation: draft.observation,
      evidence: draft.evidence,
      user_goal: draft.user_goal,
      discovery_relevant: true,
      discovery_reason: draft.observation,
      theme: themeLabel,
      barrier: barrierMatch.label,
      behavior: behaviorMatch.label,
      emotion: emotionMatch.label,
      segment: segmentMatch.label,
      root_cause: rootCauseMatch.label,
      unmet_need: unmetNeedMatch.label,
      confidence: Math.round(avgConfidence * 1000) / 1000,
    },
    index,
  );

  return { review: classifiedReview, violations };
}

export function classifyReviewsMock(reviews: RawReview[]): ClassifiedReview[] {
  return classifyReviewsMockWithReport(reviews).classified;
}

export function classifyReviewsMockWithReport(reviews: RawReview[]): {
  classified: ClassifiedReview[];
  taxonomyReport: TaxonomyReport;
} {
  const violations: TaxonomyViolation[] = [];
  const classified = reviews.map((review, index) => {
    const { review: classifiedReview, violations: v } = mockClassifyReview(
      review,
      index,
    );
    violations.push(...v);
    return classifiedReview;
  });

  return {
    classified,
    taxonomyReport: buildTaxonomyReport(classified, violations),
  };
}

export function isMockClassifierEnabled(): boolean {
  return process.env.USE_MOCK_CLASSIFIER === "true";
}

export function isClassificationAuditEnabled(): boolean {
  return process.env.CLASSIFICATION_AUDIT === "true";
}

export const TAXONOMY = {
  THEMES,
  BARRIERS,
  BEHAVIORS,
  EMOTIONS,
  SEGMENTS,
  UNMET_NEEDS,
  ROOT_CAUSES,
};
