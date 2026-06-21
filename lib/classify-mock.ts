import {
  behaviorFromResearchDraft,
  buildResearchEvidenceDraft,
} from "./classify-research-mock";
import { mergeClassificationItem } from "./classify-normalize";
import {
  BARRIERS,
  BEHAVIORS,
  EMOTIONS,
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
    ],
  },
  {
    label: "Poor Personalization Context",
    keywords: ["wrong mood", "wrong context", "doesn't understand me"],
  },
  {
    label: "Ineffective Discovery Surfaces",
    keywords: [
      "discover weekly useless",
      "release radar bad",
      "daily mix useless",
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

const ROOT_CAUSE_RULES: RuleSet = [
  {
    label: "Similarity-Based Reinforcement",
    keywords: [
      "listening history",
      "based on what i already",
      "similar music",
      "echo chamber",
    ],
  },
  {
    label: "Engagement Optimization Bias",
    keywords: ["engagement", "plays familiar", "optimize listen time"],
  },
  {
    label: "Lack of User Steering Signals",
    keywords: [
      "no feedback",
      "won't listen to feedback",
      "can't tell spotify",
      "no signal",
    ],
  },
  {
    label: "Limited Exploration Strategy",
    keywords: ["narrow recommend", "limited exploration", "won't explore"],
  },
  {
    label: "Listening History Loop",
    keywords: ["history loop", "past listens", "what i already heard"],
  },
  {
    label: "Playlist or Radio Loop",
    keywords: [
      "discover weekly repeat",
      "radio repeat",
      "playlist loop",
      "dj loops familiar",
    ],
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
];

const SEGMENT_RULES: RuleSet = [
  {
    label: "Long-Term Power Listener",
    keywords: ["years on spotify", "long time user", "decade", "premium for years"],
  },
  {
    label: "Discovery-Focused Listener",
    keywords: ["discover weekly", "release radar", "find new artists"],
  },
  { label: "Music Explorer", keywords: ["explore genre", "try new genre"] },
  {
    label: "Playlist-Centric Listener",
    keywords: ["my playlist", "curate playlist", "1000 songs playlist"],
  },
  { label: "New User", keywords: ["just started", "new to spotify", "signed up"] },
];

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
  const barrierMatch = matchFromRules(text, BARRIER_RULES, "Unclear Discovery Struggle");
  const behaviorMatch = matchFromRules(
    text,
    BEHAVIOR_RULES,
    behaviorFromResearchDraft(draft),
  );
  const rootCauseMatch = matchFromRules(
    text,
    ROOT_CAUSE_RULES,
    "Unclear Repetition Cause",
  );
  const unmetNeedMatch = matchFromRules(
    text,
    UNMET_NEED_RULES,
    "General Discovery Improvement",
  );
  const segmentMatch = matchFromRules(text, SEGMENT_RULES, "Unspecified Segment");
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
      theme: themeMatch.label,
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
