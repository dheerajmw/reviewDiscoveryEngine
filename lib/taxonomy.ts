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

/** Q2 — recommendation / discovery frustrations */
export const THEMES = [
  "Repetition Fatigue",
  "Poor Recommendation Quality",
  "Lack of Discovery Control",
  "Genre Lock-In",
  "Algorithm Distrust",
  "Weak Discovery Surfaces",
  "Other Discovery Frustration",
] as const;

/** Q1 — barriers to discovering new music */
export const BARRIERS = [
  "Low Novelty",
  "Similar Artist Loop",
  "Genre Saturation",
  "Lack of Exploration Controls",
  "Poor Personalization Context",
  "Ineffective Discovery Surfaces",
  "Cold Start Discovery",
  "Unclear Discovery Struggle",
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

/** Q5 — who faces which discovery challenges */
export const SEGMENTS = [
  "Long-Term Power Listener",
  "Music Explorer",
  "Casual Listener",
  "Playlist-Centric Listener",
  "Discovery-Focused Listener",
  "New User",
  "Unspecified Segment",
] as const;

/** Q6 — recurring unmet discovery needs */
export const UNMET_NEEDS = [
  "Adjustable Novelty",
  "Discovery Control",
  "Explainable Recommendations",
  "Better Artist Discovery",
  "Cross-Genre Exploration",
  "Stronger Discovery Playlists",
  "General Discovery Improvement",
] as const;

/** Q4 — mechanisms behind repeated / same content */
export const ROOT_CAUSES = [
  "Similarity-Based Reinforcement",
  "Engagement Optimization Bias",
  "Lack of User Steering Signals",
  "Limited Exploration Strategy",
  "Listening History Loop",
  "Playlist or Radio Loop",
  "Unclear Repetition Cause",
] as const;

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

const FALLBACK_LABELS: Record<TaxonomyField, string> = {
  theme: "Other Discovery Frustration",
  behavior: "Evaluate Recommendations",
  emotion: "Neutral",
  segment: "Unspecified Segment",
  barrier: "Unclear Discovery Struggle",
  root_cause: "Unclear Repetition Cause",
  unmet_need: "General Discovery Improvement",
};

const OTHER_UNKNOWN_LABELS = new Set([
  "Other Discovery Frustration",
  "Unclear Discovery Struggle",
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
    "playlist stagnation": "Repetition Fatigue",
    "exploration limits": "Other Discovery Frustration",
    other: "Other Discovery Frustration",
    "other discovery issue": "Other Discovery Frustration",
    "other discovery frustration": "Other Discovery Frustration",
    "positive discovery": "Other Discovery Frustration",
    "positive discovery experience": "Other Discovery Frustration",
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
    "new user": "New User",
    unknown: "Unspecified Segment",
    "unknown segment": "Unspecified Segment",
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
    other: "Unclear Discovery Struggle",
    unknown: "Unclear Discovery Struggle",
    "unknown barrier": "Unclear Discovery Struggle",
    "unclear discovery struggle": "Unclear Discovery Struggle",
    "content overload": "Ineffective Discovery Surfaces",
  },
  root_cause: {
    "similarity-based reinforcement": "Similarity-Based Reinforcement",
    "engagement optimization bias": "Engagement Optimization Bias",
    "lack of user steering signals": "Lack of User Steering Signals",
    "limited exploration strategy": "Limited Exploration Strategy",
    "weak context understanding": "Limited Exploration Strategy",
    "insufficient novelty injection": "Limited Exploration Strategy",
    "discovery surface design issues": "Playlist or Radio Loop",
    "listening history loop": "Listening History Loop",
    "playlist or radio loop": "Playlist or Radio Loop",
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

export function formatTaxonomyForPrompt(): string {
  return `
Research scope: Spotify music discovery and recommendations ONLY.
Do NOT label billing, ads, crashes, login, UI bugs, or generic app praise.

BARRIER — ${RESEARCH_QUESTIONS.barrier}
${BARRIERS.join(" | ")}

THEME — ${RESEARCH_QUESTIONS.theme}
${THEMES.join(" | ")}

EMOTION — ${RESEARCH_QUESTIONS.emotion}
${EMOTIONS.join(" | ")}

BEHAVIOR — ${RESEARCH_QUESTIONS.behavior}
${BEHAVIORS.join(" | ")}

ROOT CAUSE — ${RESEARCH_QUESTIONS.root_cause}
${ROOT_CAUSES.join(" | ")}

SEGMENT — ${RESEARCH_QUESTIONS.segment}
${SEGMENTS.join(" | ")}

UNMET NEED — ${RESEARCH_QUESTIONS.unmet_need}
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
