/** Research question IDs aligned with PM assignment and findings API. */
export type ResearchQuestionId =
  | "why_discovery_fails"
  | "top_frustrations"
  | "listening_behaviors"
  | "repetition_causes"
  | "segment_challenges"
  | "unmet_needs";

export const RESEARCH_QUESTION_IDS: readonly ResearchQuestionId[] = [
  "why_discovery_fails",
  "top_frustrations",
  "listening_behaviors",
  "repetition_causes",
  "segment_challenges",
  "unmet_needs",
] as const;

export const RESEARCH_QUESTION_LABELS: Record<ResearchQuestionId, string> = {
  why_discovery_fails: "Why do users struggle to discover new music?",
  top_frustrations: "What are the most common frustrations with recommendations?",
  listening_behaviors: "What listening behaviors are users trying to achieve?",
  repetition_causes:
    "What causes users to repeatedly listen to the same content?",
  segment_challenges:
    "Which user segments experience different discovery challenges?",
  unmet_needs: "What unmet needs emerge consistently across reviews?",
};

export type ClassificationUserGoal =
  | "find new artists"
  | "explore genres"
  | "refresh playlists"
  | "discover hidden gems"
  | "discover music for mood"
  | "receive better recommendations"
  | "cross-genre exploration"
  | "other";

export const CLASSIFICATION_USER_GOALS: readonly ClassificationUserGoal[] = [
  "find new artists",
  "explore genres",
  "refresh playlists",
  "discover hidden gems",
  "discover music for mood",
  "receive better recommendations",
  "cross-genre exploration",
  "other",
] as const;

export function formatResearchQuestionsForPrompt(): string {
  return RESEARCH_QUESTION_IDS.map(
    (id) => `- ${id}: ${RESEARCH_QUESTION_LABELS[id]}`,
  ).join("\n");
}

export function isResearchQuestionId(value: string): value is ResearchQuestionId {
  return (RESEARCH_QUESTION_IDS as readonly string[]).includes(value);
}

export function normalizeSupportsQuestions(value: unknown): ResearchQuestionId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ResearchQuestionId =>
      typeof item === "string" && isResearchQuestionId(item),
  );
}

export function normalizeClassificationUserGoal(
  value: unknown,
): ClassificationUserGoal {
  if (
    typeof value === "string" &&
    (CLASSIFICATION_USER_GOALS as readonly string[]).includes(value)
  ) {
    return value as ClassificationUserGoal;
  }
  return "other";
}

/** Fallback taxonomy when review lacks PM research value. */
export const NON_RESEARCH_FALLBACK = {
  theme: "Other Discovery Frustration",
  barrier: "Unclear Discovery Struggle",
  behavior: "Evaluate Recommendations",
  emotion: "Neutral",
  segment: "Unspecified Segment",
  root_cause: "Unclear Repetition Cause",
  unmet_need: "General Discovery Improvement",
} as const;

export function mapUserGoalToBehavior(goal: ClassificationUserGoal): string {
  switch (goal) {
    case "find new artists":
    case "discover hidden gems":
      return "Find New Music or Artists";
    case "explore genres":
    case "cross-genre exploration":
      return "Explore by Genre or Mood";
    case "refresh playlists":
      return "Use Algorithmic Playlists";
    case "discover music for mood":
      return "Explore by Genre or Mood";
    case "receive better recommendations":
      return "Evaluate Recommendations";
    default:
      return "Evaluate Recommendations";
  }
}
