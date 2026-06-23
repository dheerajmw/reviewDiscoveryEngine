import {
  countDiscoverySignals,
  countPatternHits,
  hasHardDiscoveryExclusion,
  hasPmDiscoverySubstance,
  PRAISE_PATTERNS,
} from "./review-preprocessing/signals";
import type { RawReview } from "./types";
import {
  type ClassificationUserGoal,
  type ResearchQuestionId,
  mapUserGoalToBehavior,
  normalizeClassificationUserGoal,
} from "./classify-research";

const GENERIC_LOW_VALUE_PATTERNS: RegExp[] = [
  /\b(love spotify|great app|best music app|amazing app)\b/,
  /\b(good music selection|nice ui|cool playlist|playlist looks cool)\b/,
  /\b(five stars|5 stars|10\/10)\b/,
  /\b(works fine|no complaints)\b/,
];

const SUBSTANTIVE_SIGNAL_PATTERNS: RegExp[] = [
  /\b(recommend|recommendation|discover|algorithm|playlist|radio|shuffle|dj)\b/,
  /\b(same (artist|artists|song|songs|music|playlist|playlists)|repetitive|nothing new|stale)\b/,
  /\b(find new|explore|genre|novelty|personaliz|control|tiktok|hidden gem)\b/,
  /\b(frustrat|disappoint|bored|distrust|wish|want|need)\b/,
  /\b(keeps? recommending|always sounds identical|loops familiar)\b/,
];

const GOAL_RULES: { goal: ClassificationUserGoal; patterns: RegExp[] }[] = [
  {
    goal: "find new artists",
    patterns: [/\b(find(ing)? new artists?|discover new artists?)\b/],
  },
  {
    goal: "explore genres",
    patterns: [/\b(explor(e|ing) genres?|cross genre|different genres?)\b/],
  },
  {
    goal: "refresh playlists",
    patterns: [/\b(refresh (my )?playlists?|update playlists?|stale playlist)\b/],
  },
  {
    goal: "discover hidden gems",
    patterns: [/\bhidden gems?\b/],
  },
  {
    goal: "discover music for mood",
    patterns: [/\b(music for (my )?mood|mood playlist)\b/],
  },
  {
    goal: "receive better recommendations",
    patterns: [
      /\b(better recommendations?|improve recommendations?|recommendations? (are )?(bad|terrible|repetitive))\b/,
    ],
  },
  {
    goal: "cross-genre exploration",
    patterns: [/\b(cross-genre|break out of (my )?genre|genre bubble)\b/],
  },
];

export interface ResearchEvidenceDraft {
  research_relevant: boolean;
  supports_questions: ResearchQuestionId[];
  observation: string;
  evidence: string;
  user_goal: ClassificationUserGoal;
}

function extractEvidenceQuote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  const candidate =
    sentences.find((sentence) =>
      SUBSTANTIVE_SIGNAL_PATTERNS.some((pattern) => pattern.test(sentence)),
    ) ?? sentences[0];

  const words = candidate.split(/\s+/).slice(0, 15).join(" ");
  return words.length < candidate.length ? `${words}…` : words;
}

function inferObservation(text: string, lower: string): string {
  if (/\b(same (artist|song|music)|repetitive|over and over)\b/.test(lower)) {
    return "User receives repetitive recommendations or listening loops";
  }
  if (/\b(discover weekly|release radar|daily mix)\b/.test(lower)) {
    return "User evaluates an algorithmic discovery surface";
  }
  if (/\b(control|slider|steer|adjust)\b/.test(lower)) {
    return "User wants more control over recommendation exploration";
  }
  if (/\b(tiktok|youtube|friend|social)\b/.test(lower)) {
    return "User compares or supplements Spotify discovery with external sources";
  }
  if (/\b(find new|discover new|hidden gem)\b/.test(lower)) {
    return "User is trying to find new music or artists";
  }
  if (/\b(genre|explore)\b/.test(lower)) {
    return "User discusses genre exploration or variety";
  }
  if (/\b(recommend|algorithm)\b/.test(lower)) {
    return "User discusses recommendation quality or algorithm behavior";
  }
  return "User provides discovery-related feedback with research value";
}

function inferUserGoal(text: string, review: RawReview): ClassificationUserGoal {
  if (review.user_goal) {
    const normalized = normalizeClassificationUserGoal(review.user_goal);
    if (normalized !== "other") {
      return normalized;
    }
  }

  const lower = text.toLowerCase();
  for (const rule of GOAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(lower))) {
      return rule.goal;
    }
  }

  const { explicit, implicit } = countDiscoverySignals(lower);
  if (explicit + implicit >= 1) {
    return "receive better recommendations";
  }

  return "other";
}

function inferSupportsQuestions(
  lower: string,
  userGoal: ClassificationUserGoal,
): ResearchQuestionId[] {
  const questions = new Set<ResearchQuestionId>();

  if (
    /\b(struggle|hard to find|can't find|cannot find|barrier|stuck|nothing new)\b/.test(
      lower,
    ) ||
    /\b(discover weekly|release radar|discovery tab|ineffective)\b/.test(lower)
  ) {
    questions.add("why_discovery_fails");
  }

  if (
    /\b(frustrat|annoy|bad recommend|terrible|useless|repetitive|disappoint|bored)\b/.test(
      lower,
    ) ||
    /\b(recommend(ing|ation)?s? (the )?same|same artists?|same songs?)\b/.test(
      lower,
    ) ||
    /\b(recommend(ation)?s? (feel|are|is) (bad|off|wrong|repetitive))\b/.test(
      lower,
    ) ||
    /\b(discover weekly|release radar).{0,40}(repeat|same|bad|useless)\b/.test(
      lower,
    )
  ) {
    questions.add("top_frustrations");
  }

  if (
    userGoal !== "other" ||
    /\b(try(ing)? to|want to|looking for|goal|listen(ing)? for)\b/.test(lower)
  ) {
    questions.add("listening_behaviors");
  }

  if (
    /\b(same (artist|song|music)|repeat(ing|s|ed)?|loop|history|again and again)\b/.test(
      lower,
    )
  ) {
    questions.add("repetition_causes");
  }

  if (
    /\b(years|long time|new user|casual|power listener|premium|student|dj)\b/.test(
      lower,
    )
  ) {
    questions.add("segment_challenges");
  }

  if (
    /\b(wish|want|need|should|would like|unmet|missing|if only|please add)\b/.test(
      lower,
    ) ||
    /\b(more control|adjust|slider|explain why|better discovery)\b/.test(lower)
  ) {
    questions.add("unmet_needs");
  }

  if (questions.size === 0) {
    questions.add("top_frustrations");
  }

  return [...questions];
}

/**
 * Step 1–4 mock path: research relevance, question mapping, evidence, user goal.
 */
export function buildResearchEvidenceDraft(
  review: RawReview,
): ResearchEvidenceDraft {
  const text = review.text?.trim() ?? "";
  const lower = text.toLowerCase();
  const hardExclude = hasHardDiscoveryExclusion(lower);
  const discoverySignals = countDiscoverySignals(lower);
  const praiseHits = countPatternHits(lower, PRAISE_PATTERNS);
  const genericHits = countPatternHits(lower, GENERIC_LOW_VALUE_PATTERNS);
  const substantiveHits = countPatternHits(lower, SUBSTANTIVE_SIGNAL_PATTERNS);
  const pmSubstance = hasPmDiscoverySubstance(lower);

  const tooShort = lower.length < 35;

  if (hardExclude.excluded || tooShort) {
    return {
      research_relevant: false,
      supports_questions: [],
      observation: "",
      evidence: "",
      user_goal: "other",
    };
  }

  const genericPraiseOnly =
    (praiseHits >= 1 || genericHits >= 1) &&
    !pmSubstance &&
    substantiveHits === 0;

  if (genericPraiseOnly) {
    return {
      research_relevant: false,
      supports_questions: [],
      observation: "",
      evidence: "",
      user_goal: "other",
    };
  }

  if (!pmSubstance && substantiveHits === 0) {
    return {
      research_relevant: false,
      supports_questions: [],
      observation: "",
      evidence: "",
      user_goal: "other",
    };
  }

  const user_goal = inferUserGoal(text, review);
  const supports_questions = inferSupportsQuestions(lower, user_goal);

  return {
    research_relevant: true,
    supports_questions,
    observation: inferObservation(text, lower),
    evidence: extractEvidenceQuote(text),
    user_goal,
  };
}

export function behaviorFromResearchDraft(draft: ResearchEvidenceDraft): string {
  if (!draft.research_relevant) {
    return mapUserGoalToBehavior("other");
  }
  return mapUserGoalToBehavior(draft.user_goal);
}
