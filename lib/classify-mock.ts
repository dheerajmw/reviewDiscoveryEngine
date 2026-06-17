import type { ClassifiedReview, RawReview } from "./types";

const THEME_RULES: { theme: string; keywords: string[] }[] = [
  {
    theme: "Repetition Fatigue",
    keywords: [
      "same",
      "repeat",
      "again",
      "recycled",
      "stuck",
      "heard everything",
      "replays",
      "old favorites",
    ],
  },
  {
    theme: "Genre Lock-in",
    keywords: ["genre", "bubble", "locked", "one type", "break out"],
  },
  {
    theme: "Discovery Failure",
    keywords: [
      "discover",
      "discovery",
      "find new",
      "useless",
      "exploration",
    ],
  },
  {
    theme: "Algorithm Distrust",
    keywords: ["trust", "distrust", "pushing", "opacity", "don't trust"],
  },
  {
    theme: "Control Gap",
    keywords: [
      "control",
      "dial",
      "slider",
      "adventurous",
      "novelty",
      "choose",
    ],
  },
  {
    theme: "Playlist Stagnation",
    keywords: ["playlist", "daily mix", "weekly", "mix"],
  },
];

function matchTheme(text: string): string {
  const lower = text.toLowerCase();
  for (const rule of THEME_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.theme;
    }
  }
  return "Exploration Limits";
}

function inferSegment(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("years") ||
    lower.includes("long time") ||
    lower.includes("5 year")
  ) {
    return "Long-term user";
  }
  if (lower.includes("explor") || lower.includes("random")) {
    return "Explorer";
  }
  if (lower.includes("playlist") || lower.includes("daily")) {
    return "Power listener";
  }
  return "Casual";
}

function inferBarrier(theme: string, text: string): string {
  const lower = text.toLowerCase();
  if (theme === "Repetition Fatigue" || lower.includes("novelty")) {
    return "Low novelty";
  }
  if (theme === "Control Gap" || lower.includes("control")) {
    return "No control";
  }
  if (theme === "Algorithm Distrust" || lower.includes("trust")) {
    return "Trust issues";
  }
  if (lower.includes("algorithm") || lower.includes("opaque")) {
    return "Algorithm opacity";
  }
  return "Other";
}

function inferEmotion(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("frustrat") ||
    lower.includes("irritat") ||
    lower.includes("useless")
  ) {
    return "frustration";
  }
  if (lower.includes("confus") || lower.includes("don't understand")) {
    return "confusion";
  }
  if (lower.includes("love") || lower.includes("great") || lower.includes("best")) {
    return "satisfaction";
  }
  return "disappointment";
}

function mockClassifyReview(review: RawReview): ClassifiedReview {
  const theme = matchTheme(review.text);
  const segment = inferSegment(review.text);
  const barrier = inferBarrier(theme, review.text);
  const emotion = inferEmotion(review.text);

  return {
    source: review.source,
    text: review.text,
    theme,
    behavior: "Listening and evaluating recommendations",
    emotion,
    segment,
    barrier,
    root_cause:
      "Recommendation systems optimize for familiarity and engagement over controlled novelty.",
    unmet_need: "More user control over how adventurous recommendations should be",
    confidence: 0.55,
  };
}

export function classifyReviewsMock(reviews: RawReview[]): ClassifiedReview[] {
  return reviews.map(mockClassifyReview);
}

export function isMockClassifierEnabled(): boolean {
  return process.env.USE_MOCK_CLASSIFIER === "true";
}
