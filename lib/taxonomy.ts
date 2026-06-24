import type { ClassifiedReview, TaxonomyReport, TaxonomyViolation } from "./types";

// ─── Research scope ──────────────────────────────────────────────────────
// Each dimension answers exactly one discovery-research question.

export const RESEARCH_QUESTIONS = {
  barrier:
    "Why do users struggle to discover new music?",
  theme:
    "What are the most common frustrations with recommendations?",
  emotion:
    "What emotional tone reflects recommendation or discovery frustration?",
  behavior:
    "What listening behaviors are users trying to achieve?",
  root_cause:
    "What causes users to repeatedly listen to the same content?",
  segment:
    "Which user segments experience different discovery challenges?",
  unmet_need:
    "What unmet needs emerge consistently across reviews?",
} as const;

// ─── Closed taxonomy enums ───────────────────────────────────────────────

/** Q2 — positive discovery themes (never merge with negative fallbacks) */
export const POSITIVE_THEMES = [
  "Positive Discovery Experience",
  "Strong Discovery Playlists",
  "Recommendation Success",
  "Successful Artist Discovery",
  "Discovery Delight",
] as const;

/** Q2 — discovery frustrations and friction themes */
export const NEGATIVE_THEMES = [
  "Repetition Fatigue",
  "Poor Recommendation Quality",
  "Lack of Discovery Control",
  "Genre Lock-In",
  "Algorithm Distrust",
  "Algorithm Anxiety",
  "Mood-Context Mismatch",
  "Trust Erosion",
  "Weak Discovery Surfaces",
  "Discovery Fatigue",
  "Cross-Content Recommendation Noise",
] as const;

/** Last-resort negative bucket — not for positive reviews */
export const THEME_FALLBACK = "Other Discovery Frustration" as const;

export const THEMES = [
  ...POSITIVE_THEMES,
  ...NEGATIVE_THEMES,
  THEME_FALLBACK,
] as const;

export const POSITIVE_THEME_SET = new Set<string>(POSITIVE_THEMES);
export const NEGATIVE_THEME_SET = new Set<string>(NEGATIVE_THEMES);

export function isPositiveTheme(theme: string): boolean {
  return POSITIVE_THEME_SET.has(theme);
}

export function isNegativeTheme(theme: string): boolean {
  return NEGATIVE_THEME_SET.has(theme) || theme === THEME_FALLBACK;
}

/** Last-resort barrier when no specific mechanism fits — not a user-stated label. */
export const BARRIER_FALLBACK = "Unspecified discovery barrier" as const;

/** @deprecated Stored on older runs; maps to {@link BARRIER_FALLBACK} for display and normalize. */
export const LEGACY_BARRIER_FALLBACK = "Unclear Discovery Struggle" as const;

/** Q1 — barriers to discovering new music */
export const BARRIERS = [
  "Low Novelty",
  "Similar Artist Loop",
  "Genre Saturation",
  "Lack of Exploration Controls",
  "Poor Personalization Context",
  "Ineffective Discovery Surfaces",
  "Cold Start Discovery",
  BARRIER_FALLBACK,
] as const;

/** Q3 — listening goals users describe */
export const BEHAVIORS = [
  "Find New Music or Artists",
  "Evaluate Recommendations",
  "Explore by Genre or Mood",
  "Listen to Familiar Content",
  "Use Algorithmic Playlists",
  "Social or External Discovery",
  "Passive Background Listening",
] as const;

/** Q2 — emotional tone of frustration (not generic app sentiment) */
export const EMOTIONS = [
  "Frustration",
  "Disappointment",
  "Boredom",
  "Distrust",
  "Curiosity",
  "Neutral",
] as const;

/** Q5 — behavioral listener segments (PM research) */
export const SEGMENTS = [
  "Music Explorer",
  "Discovery-Focused Listener",
  "Long-Term Power Listener",
  "Casual Listener",
  "Playlist-Centric Listener",
  "Unspecified Segment",
] as const;

/** Primary segments 1–5; use before Unspecified Segment */
export const PRIMARY_SEGMENTS = [
  "Music Explorer",
  "Discovery-Focused Listener",
  "Long-Term Power Listener",
  "Casual Listener",
  "Playlist-Centric Listener",
] as const;

export const SEGMENT_BEHAVIORAL_DEFINITIONS: Record<
  (typeof PRIMARY_SEGMENTS)[number],
  string
> = {
  "Music Explorer":
    "Actively seeks new artists and genres; high skip rate on familiar content; treats Spotify as a discovery tool first.",
  "Discovery-Focused Listener":
    "Relies on algorithmic playlists (Discover Weekly, Release Radar, DJ) as primary discovery channel; judges Spotify quality by playlist freshness.",
  "Long-Term Power Listener":
    "High daily listening volume; 3+ years on platform; experiencing repetition fatigue; high engagement but declining discovery rate.",
  "Casual Listener":
    "Background listening mode; low active engagement; playlist dependent; treats Spotify as ambient music service.",
  "Playlist-Centric Listener":
    "Manually curates own playlists; low algorithmic trust; prefers self-directed discovery over AI suggestions.",
};

const SEGMENT_BEHAVIOR_SIGNAL =
  /\b(listen|listening|playlist|discover|recommend|skip|music|spotify|artist|album|genre|dj|radio|stream|shuffle|curate|explore|fresh|weekly|years|background|ambient)\b/i;

export function hasSegmentBehavioralSignals(text: string): boolean {
  return SEGMENT_BEHAVIOR_SIGNAL.test(text);
}

/** Default ambiguous research reviews to Casual Listener; Unspecified only with zero behavioral signals. */
export function resolveResearchSegment(
  segment: string,
  reviewText: string,
): string {
  const trimmed = segment.trim();
  if (
    trimmed &&
    trimmed !== "Unspecified Segment" &&
    (SEGMENTS as readonly string[]).includes(trimmed)
  ) {
    return trimmed;
  }
  if (!hasSegmentBehavioralSignals(reviewText)) {
    return "Unspecified Segment";
  }
  return "Casual Listener";
}

/** Q6 — recurring unmet discovery needs */
export const UNMET_NEEDS = [
  "Better Artist Discovery",
  "Stronger Discovery Playlists",
  "Adjustable Novelty",
  "Discovery Control",
  "Explainable Recommendations",
  "Genre Exploration",
  "Freshness Guarantees",
  "Cross-Genre Exploration",
  "General Discovery Improvement",
] as const;

/** Q4 — mechanisms behind repeated / same content */
export const ROOT_CAUSES = [
  "Similarity-Based Reinforcement",
  "Listening History Loop",
  "Engagement Optimization Bias",
  "Limited Exploration Strategy",
  "Lack of User Steering Signals",
  "Playlist or Radio Loop",
  "Discovery Surface Design Issues",
  "No Exploration Sandbox",
  "Cross-Content Recommendation Bias",
  "Unclear Repetition Cause",
] as const;

export const PRIMARY_ROOT_CAUSES = ROOT_CAUSES.filter(
  (label) => label !== "Unclear Repetition Cause",
);

export const REPETITION_RELATED_THEMES = new Set<string>([
  "Repetition Fatigue",
  "Discovery Fatigue",
  "Algorithm Anxiety",
]);

export const ROOT_CAUSE_MECHANISM_DEFINITIONS: Record<string, string> = {
  "Similarity-Based Reinforcement":
    "Algorithm recommends music similar to past listens, shrinking the candidate pool over time.",
  "Lack of User Steering Signals":
    "User has no way to signal exploration intent to the algorithm.",
  "Discovery Surface Design Issues":
    "Discovery feature design prioritises engagement over novelty.",
  "Engagement Optimization Bias":
    "System maximises stream completion and familiarity, not new artist exposure (algorithm optimises for engagement not exploration).",
  "No Exploration Sandbox":
    "User cannot explore without affecting their main recommendation profile.",
};

export const ROOT_CAUSE_INFERENCE_RULES: {
  label: (typeof ROOT_CAUSES)[number];
  keywords: string[];
  weight?: number;
}[] = [
  {
    label: "Similarity-Based Reinforcement",
    keywords: [
      "same artists",
      "same artist",
      "sounds the same",
      "sound the same",
      "no variety",
      "algorithm stuck",
      "similar music",
      "echo chamber",
      "based on what i already",
      "listening history",
    ],
    weight: 2,
  },
  {
    label: "Lack of User Steering Signals",
    keywords: [
      "no way to control",
      "can't tell it what i want",
      "cant tell it what i want",
      "no settings",
      "wish i could choose",
      "can't tell spotify",
      "no feedback",
      "no signal",
      "can't steer",
    ],
    weight: 2,
  },
  {
    label: "Discovery Surface Design Issues",
    keywords: [
      "discover weekly got worse",
      "discover weekly worse",
      "daily mixes are bad",
      "daily mix bad",
      "same songs in every playlist",
      "recommendation quality declined",
      "release radar bad",
      "discover weekly useless",
      "home feed",
      "on repeat not updating",
    ],
    weight: 2,
  },
  {
    label: "Engagement Optimization Bias",
    keywords: [
      "plays safe",
      "play it safe",
      "never risks anything new",
      "only familiar",
      "comfortable but boring",
      "optimize listen time",
      "engagement",
      "familiar picks",
      "safe recommendations",
    ],
    weight: 2,
  },
  {
    label: "No Exploration Sandbox",
    keywords: [
      "scared to skip",
      "afraid to skip",
      "ruins my recommendations",
      "ruin my algorithm",
      "no way to try new music safely",
      "mess up my recommendations",
      "corrupt my algorithm",
      "can't explore without",
    ],
    weight: 2,
  },
  {
    label: "Listening History Loop",
    keywords: ["history loop", "past listens", "what i already heard", "past listening"],
    weight: 1,
  },
  {
    label: "Playlist or Radio Loop",
    keywords: [
      "playlist loop",
      "radio repeat",
      "shuffle repeat",
      "same songs on shuffle",
      "dj loops familiar",
    ],
    weight: 1,
  },
  {
    label: "Limited Exploration Strategy",
    keywords: ["narrow recommend", "limited exploration", "won't explore", "under-samples"],
    weight: 1,
  },
  {
    label: "Cross-Content Recommendation Bias",
    keywords: [
      "podcast recommend",
      "audiobook recommend",
      "podcast in recommend",
      "unrelated podcast",
    ],
    weight: 1,
  },
];

const REPETITION_TEXT_SIGNAL =
  /\b(repeat|repetitive|same songs?|same artists?|same music|stale|no variety|familiar|on repeat|regurgitat|over and over)\b/i;

export function isRepetitionRelatedReview(input: {
  theme: string;
  barrier?: string;
  text: string;
}): boolean {
  if (REPETITION_RELATED_THEMES.has(input.theme)) return true;
  if (
    input.barrier === "Similar Artist Loop" ||
    input.barrier === "Low Novelty"
  ) {
    return true;
  }
  return REPETITION_TEXT_SIGNAL.test(input.text);
}

export function inferClosestRootCause(text: string): {
  label: (typeof ROOT_CAUSES)[number];
  score: number;
  hit: string;
} {
  const lower = text.toLowerCase();
  let best = {
    label: "Unclear Repetition Cause" as (typeof ROOT_CAUSES)[number],
    score: 0,
    hit: "",
  };

  for (const rule of ROOT_CAUSE_INFERENCE_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        const score = (rule.weight ?? 1) + kw.length / 24;
        if (score > best.score) {
          best = { label: rule.label, score, hit: kw };
        }
      }
    }
  }

  return best;
}

export interface ResolvedRootCause {
  root_cause: (typeof ROOT_CAUSES)[number];
  low_confidence: boolean;
  rationale?: string;
}

const UNCLEAR_REPETITION_CAUSE = "Unclear Repetition Cause" as const;

export function resolveResearchRootCause(
  rootCause: string,
  reviewText: string,
  theme: string,
  barrier: string,
  reviewConfidence: number,
): ResolvedRootCause {
  const trimmed = rootCause.trim();
  const valid =
    trimmed &&
    trimmed !== UNCLEAR_REPETITION_CAUSE &&
    (ROOT_CAUSES as readonly string[]).includes(trimmed);

  if (valid) {
    return {
      root_cause: trimmed as (typeof ROOT_CAUSES)[number],
      low_confidence: reviewConfidence < 0.7,
    };
  }

  const inferred = inferClosestRootCause(reviewText);
  const repetition = isRepetitionRelatedReview({ theme, barrier, text: reviewText });

  if (inferred.score > 0) {
    return {
      root_cause: inferred.label,
      low_confidence: reviewConfidence < 0.7 || inferred.score < 2.2,
      rationale: `Matched mechanism signal "${inferred.hit}".`,
    };
  }

  if (repetition) {
    return {
      root_cause: "Engagement Optimization Bias",
      low_confidence: true,
      rationale:
        "Repetition-related review with weak mechanism signals — assigned closest default cause.",
    };
  }

  return {
    root_cause: UNCLEAR_REPETITION_CAUSE,
    low_confidence: false,
  };
}

export type Theme = (typeof THEMES)[number];
export type Barrier = (typeof BARRIERS)[number];
export type Behavior = (typeof BEHAVIORS)[number];
export type Emotion = (typeof EMOTIONS)[number];
export type Segment = (typeof SEGMENTS)[number];
export type UnmetNeed = (typeof UNMET_NEEDS)[number];
export type RootCause = (typeof ROOT_CAUSES)[number];

export type TaxonomyField =
  | "theme"
  | "behavior"
  | "emotion"
  | "segment"
  | "barrier"
  | "root_cause"
  | "unmet_need";

const TAXONOMY_MAP: Record<TaxonomyField, readonly string[]> = {
  theme: THEMES,
  behavior: BEHAVIORS,
  emotion: EMOTIONS,
  segment: SEGMENTS,
  barrier: BARRIERS,
  root_cause: ROOT_CAUSES,
  unmet_need: UNMET_NEEDS,
};

export const FALLBACK_LABELS: Record<TaxonomyField, string> = {
  theme: THEME_FALLBACK,
  behavior: "Evaluate Recommendations",
  emotion: "Neutral",
  segment: "Casual Listener",
  barrier: BARRIER_FALLBACK,
  root_cause: "Unclear Repetition Cause",
  unmet_need: "General Discovery Improvement",
};

export const OTHER_UNKNOWN_LABELS = new Set([
  "Other Discovery Frustration",
  BARRIER_FALLBACK,
  LEGACY_BARRIER_FALLBACK,
  "Unspecified Segment",
  "Unclear Repetition Cause",
  "General Discovery Improvement",
]);

/** Legacy / LLM variant → canonical label */
const ALIASES: Record<TaxonomyField, Record<string, string>> = {
  theme: {
    "genre lock-in": "Genre Lock-In",
    "genre lock in": "Genre Lock-In",
    "control gap": "Lack of Discovery Control",
    "discovery failure": "Poor Recommendation Quality",
    "algorithm distrust": "Algorithm Distrust",
    "trust gap": "Algorithm Distrust",
    "trust issues": "Algorithm Distrust",
    "algorithm anxiety": "Algorithm Anxiety",
    "afraid to skip": "Algorithm Anxiety",
    "mood-context mismatch": "Mood-Context Mismatch",
    "mood context mismatch": "Mood-Context Mismatch",
    "wrong mood": "Mood-Context Mismatch",
    "trust erosion": "Trust Erosion",
    "discover weekly used to": "Trust Erosion",
    "playlist stagnation": "Repetition Fatigue",
    "exploration limits": "Other Discovery Frustration",
    other: "Other Discovery Frustration",
    "other discovery issue": "Other Discovery Frustration",
    "other discovery frustration": "Other Discovery Frustration",
    "positive discovery": "Positive Discovery Experience",
    "positive discovery experience": "Positive Discovery Experience",
    "strong discovery playlists": "Strong Discovery Playlists",
    "recommendation success": "Recommendation Success",
    "successful artist discovery": "Successful Artist Discovery",
    "discovery delight": "Discovery Delight",
    "great discover weekly": "Strong Discovery Playlists",
    "discover weekly praise": "Strong Discovery Playlists",
    "dj praise": "Positive Discovery Experience",
    "discovery fatigue": "Discovery Fatigue",
    "cross-content recommendation noise": "Cross-Content Recommendation Noise",
    "playlist contamination": "Cross-Content Recommendation Noise",
    "podcast pollution": "Cross-Content Recommendation Noise",
    "discovery outside platform": "Other Discovery Frustration",
    "poor recommendation quality": "Poor Recommendation Quality",
    "lack of discovery control": "Lack of Discovery Control",
    "repetition fatigue": "Repetition Fatigue",
    "weak discovery surfaces": "Weak Discovery Surfaces",
    "discovery surface ineffectiveness": "Weak Discovery Surfaces",
  },
  behavior: {
    "active exploration": "Find New Music or Artists",
    "find new music or artists": "Find New Music or Artists",
    "actively seeking new music": "Find New Music or Artists",
    "passive listening": "Passive Background Listening",
    "passive background listening": "Passive Background Listening",
    "mood listening": "Explore by Genre or Mood",
    "explore by genre or mood": "Explore by Genre or Mood",
    "familiarity seeking": "Listen to Familiar Content",
    "listen to familiar content": "Listen to Familiar Content",
    "re-listening to familiar content": "Listen to Familiar Content",
    "social discovery": "Social or External Discovery",
    "social or external discovery": "Social or External Discovery",
    "recommendation evaluation": "Evaluate Recommendations",
    "evaluate recommendations": "Evaluate Recommendations",
    "evaluating recommendations": "Evaluate Recommendations",
    "playlist consumption": "Use Algorithmic Playlists",
    "use algorithmic playlists": "Use Algorithmic Playlists",
    "relying on algorithmic playlists": "Use Algorithmic Playlists",
    "using radio or autoplay": "Passive Background Listening",
    unknown: "Evaluate Recommendations",
    "unknown behavior": "Evaluate Recommendations",
    neutral: "Evaluate Recommendations",
  },
  emotion: {
    "disgust": "Distrust",
    frustration: "Frustration",
    disappointment: "Disappointment",
    boredom: "Boredom",
    distrust: "Distrust",
    confusion: "Frustration",
    delight: "Neutral",
    satisfaction: "Neutral",
    curiosity: "Curiosity",
    neutral: "Neutral",
    unknown: "Neutral",
  },
  segment: {
    "long-term user": "Long-Term Power Listener",
    "long term user": "Long-Term Power Listener",
    "long-term power listener": "Long-Term Power Listener",
    explorer: "Music Explorer",
    "music explorer": "Music Explorer",
    casual: "Casual Listener",
    "casual listener": "Casual Listener",
    "power listener": "Long-Term Power Listener",
    "playlist listener": "Playlist-Centric Listener",
    "playlist-centric listener": "Playlist-Centric Listener",
    "discovery-focused listener": "Discovery-Focused Listener",
    "discovery focused listener": "Discovery-Focused Listener",
    "new user": "Casual Listener",
    unknown: "Casual Listener",
    "unknown segment": "Casual Listener",
    "unspecified segment": "Unspecified Segment",
  },
  barrier: {
    "low novelty": "Low Novelty",
    "no control": "Lack of Exploration Controls",
    "lack of exploration controls": "Lack of Exploration Controls",
    "trust issues": "Poor Personalization Context",
    "algorithm opacity": "Poor Personalization Context",
    "similar artist loop": "Similar Artist Loop",
    "genre saturation": "Genre Saturation",
    "poor context awareness": "Poor Personalization Context",
    "poor personalization context": "Poor Personalization Context",
    "discovery surface ineffectiveness": "Ineffective Discovery Surfaces",
    "ineffective discovery surfaces": "Ineffective Discovery Surfaces",
    "cold start discovery": "Cold Start Discovery",
    other: BARRIER_FALLBACK,
    unknown: BARRIER_FALLBACK,
    "unknown barrier": BARRIER_FALLBACK,
    "unclear discovery struggle": BARRIER_FALLBACK,
    [LEGACY_BARRIER_FALLBACK.toLowerCase()]: BARRIER_FALLBACK,
    "unspecified discovery barrier": BARRIER_FALLBACK,
    "content overload": "Ineffective Discovery Surfaces",
  },
  root_cause: {
    "similarity-based reinforcement": "Similarity-Based Reinforcement",
    "engagement optimization bias": "Engagement Optimization Bias",
    "lack of user steering signals": "Lack of User Steering Signals",
    "limited exploration strategy": "Limited Exploration Strategy",
    "weak context understanding": "Limited Exploration Strategy",
    "insufficient novelty injection": "Limited Exploration Strategy",
    "discovery surface design issues": "Discovery Surface Design Issues",
    "discovery surface design": "Discovery Surface Design Issues",
    "weak discovery surface": "Discovery Surface Design Issues",
    "cross-content recommendation bias": "Cross-Content Recommendation Bias",
    "cross content recommendation bias": "Cross-Content Recommendation Bias",
    "podcast pollution": "Cross-Content Recommendation Bias",
    "playlist contamination": "Playlist or Radio Loop",
    "shuffle fatigue": "Playlist or Radio Loop",
    "listening history loop": "Listening History Loop",
    "playlist or radio loop": "Playlist or Radio Loop",
    "no exploration sandbox": "No Exploration Sandbox",
    "exploration sandbox": "No Exploration Sandbox",
    "algorithm optimises for engagement not exploration":
      "Engagement Optimization Bias",
    "algorithm optimizes for engagement not exploration":
      "Engagement Optimization Bias",
    unknown: "Unclear Repetition Cause",
    "unknown root cause": "Unclear Repetition Cause",
    "unclear repetition cause": "Unclear Repetition Cause",
  },
  unmet_need: {
    "adjustable novelty": "Adjustable Novelty",
    "discovery control": "Discovery Control",
    "explainable recommendations": "Explainable Recommendations",
    "better artist discovery": "Better Artist Discovery",
    "cross-genre exploration": "Cross-Genre Exploration",
    "human-like curation": "Stronger Discovery Playlists",
    "context-aware discovery": "Stronger Discovery Playlists",
    "better discovery surfaces": "Stronger Discovery Playlists",
    "stronger discovery playlists": "Stronger Discovery Playlists",
    "genre exploration": "Genre Exploration",
    "explore outside genre": "Genre Exploration",
    "freshness guarantees": "Freshness Guarantees",
    "avoid repetition": "Freshness Guarantees",
    "no repetition": "Freshness Guarantees",
    "cross-genre discovery": "Cross-Genre Exploration",
    "discover hidden gems": "Better Artist Discovery",
    "general discovery improvement": "General Discovery Improvement",
    unknown: "General Discovery Improvement",
    "unknown need": "General Discovery Improvement",
    "unknown unmet need": "General Discovery Improvement",
    "unknown unmet_need": "General Discovery Improvement",
    "n/a": "General Discovery Improvement",
    none: "General Discovery Improvement",
  },
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isValidLabel(field: TaxonomyField, value: string): boolean {
  return TAXONOMY_MAP[field].includes(value as never);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function isUnknownPlaceholder(value: string): boolean {
  const key = normalizeKey(value);
  return (
    key === "unknown" ||
    key.startsWith("unknown ") ||
    key.endsWith(" unknown") ||
    key.includes("unknown ") ||
    key === "n/a" ||
    key === "none" ||
    key === "not applicable"
  );
}

/** Map invalid labels to closest enum by string similarity — never uses review keywords. */
export function closestTaxonomyLabel(
  field: TaxonomyField,
  rawValue: string,
): string {
  const trimmed = rawValue.trim();
  if (!trimmed || isUnknownPlaceholder(trimmed)) {
    return FALLBACK_LABELS[field];
  }

  const key = normalizeKey(trimmed);
  const labels = TAXONOMY_MAP[field];

  let best = FALLBACK_LABELS[field];
  let bestDistance = Infinity;

  for (const label of labels) {
    const distance = levenshtein(key, normalizeKey(label));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = label;
    }
  }

  // Reject weak similarity matches — prefer canonical fallback over wrong bucket
  const maxAllowedDistance = Math.max(3, Math.floor(key.length * 0.35));
  if (bestDistance > maxAllowedDistance) {
    return FALLBACK_LABELS[field];
  }

  return best;
}

export function validateTaxonomyLabel(
  field: TaxonomyField,
  rawValue: string | undefined,
  reviewIndex?: number,
): { value: string; violation?: TaxonomyViolation } {
  const trimmed = rawValue?.trim() ?? "";
  if (!trimmed) {
    const mappedTo = FALLBACK_LABELS[field];
    return {
      value: mappedTo,
      violation: {
        field,
        rawValue: "(empty)",
        mappedTo,
        reason: "empty",
        reviewIndex,
      },
    };
  }

  if (isValidLabel(field, trimmed)) {
    return { value: trimmed };
  }

  const key = normalizeKey(trimmed);
  const alias = ALIASES[field][key];
  if (alias && isValidLabel(field, alias)) {
    return {
      value: alias,
      violation: {
        field,
        rawValue: trimmed,
        mappedTo: alias,
        reason: "alias",
        reviewIndex,
      },
    };
  }

  const mappedTo = closestTaxonomyLabel(field, trimmed);
  return {
    value: mappedTo,
    violation: {
      field,
      rawValue: trimmed,
      mappedTo,
      reason: "invalid",
      reviewIndex,
    },
  };
}

const TAXONOMY_FIELDS: TaxonomyField[] = [
  "theme",
  "behavior",
  "emotion",
  "segment",
  "barrier",
  "root_cause",
  "unmet_need",
];

export function logTaxonomyViolation(violation: TaxonomyViolation): void {
  console.warn(
    `[taxonomy] ${violation.field}: "${violation.rawValue}" → "${violation.mappedTo}" (${violation.reason})`,
  );
}

export function buildTaxonomyReport(
  classified: ClassifiedReview[],
  violations: TaxonomyViolation[] = [],
): TaxonomyReport {
  const discoveryOnly = classified.filter((r) => r.discovery_relevant);
  const reportSource = discoveryOnly.length > 0 ? discoveryOnly : classified;

  const distribution = {
    theme: {} as Record<string, number>,
    behavior: {} as Record<string, number>,
    emotion: {} as Record<string, number>,
    segment: {} as Record<string, number>,
    barrier: {} as Record<string, number>,
    root_cause: {} as Record<string, number>,
    unmet_need: {} as Record<string, number>,
  };

  const bump = (field: TaxonomyField, label: string) => {
    distribution[field][label] = (distribution[field][label] ?? 0) + 1;
  };

  for (const review of reportSource) {
    bump("theme", review.theme);
    bump("behavior", review.behavior);
    bump("emotion", review.emotion);
    bump("segment", review.segment);
    bump("barrier", review.barrier);
    bump("root_cause", review.root_cause);
    bump("unmet_need", review.unmet_need);
  }

  const toPct = (counts: Record<string, number>): Record<string, number> => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      result[k] = Math.round((v / total) * 100);
    }
    return result;
  };

  const fallbacksByField = {} as Record<TaxonomyField, number>;
  for (const f of TAXONOMY_FIELDS) fallbacksByField[f] = 0;
  for (const v of violations) {
    fallbacksByField[v.field] = (fallbacksByField[v.field] ?? 0) + 1;
  }

  const totalLabels = reportSource.length * TAXONOMY_FIELDS.length;
  const fallbackCount = violations.length;
  const fallbackRate =
    totalLabels === 0 ? 0 : Math.round((fallbackCount / totalLabels) * 1000) / 1000;

  let otherUnknownCount = 0;
  for (const review of reportSource) {
    for (const field of TAXONOMY_FIELDS) {
      if (OTHER_UNKNOWN_LABELS.has(review[field])) otherUnknownCount++;
    }
  }
  const otherUnknownRate =
    totalLabels === 0
      ? 0
      : Math.round((otherUnknownCount / totalLabels) * 1000) / 1000;

  return {
    totalClassified: reportSource.length,
    distribution,
    distributionPct: {
      theme: toPct(distribution.theme),
      behavior: toPct(distribution.behavior),
      emotion: toPct(distribution.emotion),
      segment: toPct(distribution.segment),
      barrier: toPct(distribution.barrier),
      root_cause: toPct(distribution.root_cause),
      unmet_need: toPct(distribution.unmet_need),
    },
    fallbackCount,
    fallbackRate,
    fallbacksByField,
    otherUnknownRate,
    violations,
  };
}

export function isTaxonomyFallbackLabel(
  field: TaxonomyField,
  value: string,
): boolean {
  if (field === "barrier" && value === LEGACY_BARRIER_FALLBACK) return true;
  return FALLBACK_LABELS[field] === value || OTHER_UNKNOWN_LABELS.has(value);
}

/** User-facing label for dashboard, exports, and quote explorer. */
export function getTaxonomyDisplayLabel(
  field: TaxonomyField,
  value: string,
): string {
  if (field === "barrier") {
    if (value === LEGACY_BARRIER_FALLBACK || value === BARRIER_FALLBACK) {
      return BARRIER_FALLBACK;
    }
  }
  return value;
}

export function isBarrierFallbackLabel(value: string): boolean {
  return isTaxonomyFallbackLabel("barrier", value);
}

export function formatTaxonomyForPrompt(): string {
  return `
Research scope: Spotify music discovery and recommendations ONLY.
Do NOT label billing, ads, crashes, login, UI bugs, or generic app praise.

Choose EXACTLY ONE value per field from the allowed lists below.
If none fit perfectly, choose the CLOSEST valid value. Never invent labels.

BARRIER — ${RESEARCH_QUESTIONS.barrier}
Prefer a specific barrier. Use "${BARRIER_FALLBACK}" only when frustration is clear but no mechanism fits (<10% of research reviews).
${BARRIERS.join(" | ")}

POSITIVE THEMES — satisfied discovery (use when user praises discovery):
${POSITIVE_THEMES.join(" | ")}

NEGATIVE THEMES — discovery friction (never use for praise):
${NEGATIVE_THEMES.join(" | ")}

THEME FALLBACK (negative unclear only — NEVER for positive reviews):
${THEME_FALLBACK}

EMOTION — ${RESEARCH_QUESTIONS.emotion}
${EMOTIONS.join(" | ")}

BEHAVIOR — ${RESEARCH_QUESTIONS.behavior}
${BEHAVIORS.join(" | ")}

ROOT CAUSE — ${RESEARCH_QUESTIONS.root_cause}
Assign a specific mechanism. Use "Unclear Repetition Cause" in fewer than 5% of research reviews — only when no repetition or discovery mechanism is inferable at all.

MANDATORY: Every repetition-related review (Repetition Fatigue, Discovery Fatigue, Algorithm Anxiety, or clear repetition signals) MUST receive a root cause. If confidence is below 70%, assign the closest mechanism and note low confidence in classification_reasons — never default to Unclear.

Mechanisms and detection signals:
1. Similarity-Based Reinforcement — ${ROOT_CAUSE_MECHANISM_DEFINITIONS["Similarity-Based Reinforcement"]} Signals: "same artists", "sounds the same", "no variety", "algorithm stuck".
2. Lack of User Steering Signals — ${ROOT_CAUSE_MECHANISM_DEFINITIONS["Lack of User Steering Signals"]} Signals: "no way to control", "can't tell it what I want", "no settings", "wish I could choose".
3. Discovery Surface Design Issues — ${ROOT_CAUSE_MECHANISM_DEFINITIONS["Discovery Surface Design Issues"]} Signals: "Discover Weekly got worse", "daily mixes are bad", "same songs in every playlist", "recommendation quality declined".
4. Engagement Optimization Bias (algorithm optimises for engagement not exploration) — ${ROOT_CAUSE_MECHANISM_DEFINITIONS["Engagement Optimization Bias"]} Signals: "plays safe", "never risks anything new", "only familiar", "comfortable but boring".
5. No Exploration Sandbox — ${ROOT_CAUSE_MECHANISM_DEFINITIONS["No Exploration Sandbox"]} Signals: "scared to skip", "ruins my recommendations", "no way to try new music safely".

Also allowed: Listening History Loop, Limited Exploration Strategy, Playlist or Radio Loop, Cross-Content Recommendation Bias.

Allowed labels: ${ROOT_CAUSES.join(" | ")}

SEGMENT — ${RESEARCH_QUESTIONS.segment}
Choose ONE primary segment (1–5) using behavioral evidence. Copy label exactly.
If segments 1–5 are ambiguous but the review describes listening behavior, default to "Casual Listener".
Use "Unspecified Segment" ONLY when the review contains zero behavioral signals about how the user listens or discovers music.

1. Music Explorer — ${SEGMENT_BEHAVIORAL_DEFINITIONS["Music Explorer"]}
2. Discovery-Focused Listener — ${SEGMENT_BEHAVIORAL_DEFINITIONS["Discovery-Focused Listener"]}
3. Long-Term Power Listener — ${SEGMENT_BEHAVIORAL_DEFINITIONS["Long-Term Power Listener"]}
4. Casual Listener — ${SEGMENT_BEHAVIORAL_DEFINITIONS["Casual Listener"]}
5. Playlist-Centric Listener — ${SEGMENT_BEHAVIORAL_DEFINITIONS["Playlist-Centric Listener"]}

Allowed labels: ${SEGMENTS.join(" | ")}

UNMET NEED — ${RESEARCH_QUESTIONS.unmet_need}
Prefer specific needs. Use General Discovery Improvement only as last resort.
${UNMET_NEEDS.join(" | ")}
`.trim();
}

export interface RawClassificationFields {
  theme?: string;
  behavior?: string;
  emotion?: string;
  segment?: string;
  barrier?: string;
  root_cause?: string;
  unmet_need?: string;
}

export function normalizeTaxonomyFields(
  fields: RawClassificationFields,
  reviewIndex?: number,
): { fields: Required<RawClassificationFields>; violations: TaxonomyViolation[] } {
  const violations: TaxonomyViolation[] = [];
  const result = {} as Required<RawClassificationFields>;

  for (const field of TAXONOMY_FIELDS) {
    const { value, violation } = validateTaxonomyLabel(
      field,
      fields[field],
      reviewIndex,
    );
    result[field] = value;
    if (violation) {
      violations.push(violation);
      logTaxonomyViolation(violation);
    }
  }

  return { fields: result, violations };
}
