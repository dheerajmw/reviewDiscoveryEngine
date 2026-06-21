/**
 * Frozen baseline classifier (pre-refactor) for before/after evaluation.
 * Uses keyword theme matching + theme→barrier→root_cause→unmet_need inheritance chains.
 */
import type { ClassifiedReview, RawReview } from "./types";

const NOT_DISCOVERY_KEYWORDS = [
  "billing", "payment", "charged", "subscription cancelled", "refund",
  "login", "log in", "sign in", "password", "account locked",
  "crash", "crashes", "crashing", "won't open", "wont open", "bug", "glitch",
  "freeze", "frozen", "ads ", " too many ads", "advertisement",
  "premium cancelled", "customer support", "contact support",
];

const DISCOVERY_KEYWORDS = [
  "discover", "discovery", "recommend", "recommendation", "algorithm", "playlist",
  "discover weekly", "daily mix", "radio", "repeat", "same artist", "same song",
  "genre", "explore", "exploration", "novelty", "new music", "find music",
  "stuck", "recycled", "wrapped", "suggestion", "for you",
];

/** Original keyword discovery filter (short reviews default true). */
function assessDiscoveryRelevanceLegacy(text: string): boolean {
  const lower = text.toLowerCase();
  const notDiscoveryHits = NOT_DISCOVERY_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const discoveryHits = DISCOVERY_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (notDiscoveryHits >= 2 && discoveryHits === 0) return false;
  if (notDiscoveryHits >= 1 && discoveryHits === 0) return false;
  if (discoveryHits >= 1) return true;
  if (lower.length < 40) return true;
  return discoveryHits > notDiscoveryHits;
}

const THEME_RULES: { theme: string; keywords: string[] }[] = [
  {
    theme: "Repetition Fatigue",
    keywords: ["same song", "same artist", "repeat", "recycled", "regurgitat", "shuffle", "same things", "on repeat"],
  },
  {
    theme: "Genre Lock-In",
    keywords: ["genre", "bubble", "locked", "one type", "filter bubble", "break out"],
  },
  {
    theme: "Lack of Discovery Control",
    keywords: ["control", "dial", "slider", "adventurous", "steer", "choose", "novelty setting"],
  },
  {
    theme: "Poor Recommendation Quality",
    keywords: ["irrelevant", "bad recommend", "useless", "wrong music", "doesn't match", "poor suggest"],
  },
  {
    theme: "Trust Gap",
    keywords: ["trust", "distrust", "don't trust", "pushing", "opacity", "manipulat"],
  },
  {
    theme: "Discovery Outside Platform",
    keywords: ["tiktok", "youtube", "friend told", "instagram", "outside spotify", "reddit found"],
  },
  {
    theme: "Positive Discovery Experience",
    keywords: ["found new", "discovered amazing", "great discovery", "exposure to", "introduced me", "love discover"],
  },
];

function matchTheme(text: string): string {
  const lower = text.toLowerCase();
  for (const rule of THEME_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.theme;
    }
  }
  if (lower.includes("discover") || lower.includes("recommend")) {
    return "Poor Recommendation Quality";
  }
  return "Other Discovery Issue";
}

function inferSegment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("years") || lower.includes("long time") || lower.includes("premium subscriber")) {
    return "Long-Term Power Listener";
  }
  if (lower.includes("discover weekly") || lower.includes("release radar") || lower.includes("find new artists")) {
    return "Discovery-Focused Listener";
  }
  if (lower.includes("explor") || lower.includes("try new genre")) return "Music Explorer";
  if (lower.includes("playlist") || lower.includes("daily mix")) return "Playlist Listener";
  if (lower.includes("just started") || lower.includes("new to spotify")) return "New User";
  return "Casual Listener";
}

function inferBarrier(theme: string, text: string): string {
  const lower = text.toLowerCase();
  if (theme === "Repetition Fatigue" || lower.includes("same artist")) return "Similar Artist Loop";
  if (theme === "Genre Lock-In") return "Genre Saturation";
  if (theme === "Lack of Discovery Control" || lower.includes("control")) return "Lack of Exploration Controls";
  if (lower.includes("discover weekly") || lower.includes("daily mix") || lower.includes("release radar")) {
    return "Discovery Surface Ineffectiveness";
  }
  if (lower.includes("novelty") || lower.includes("nothing new")) return "Low Novelty";
  if (lower.includes("mood") || lower.includes("context")) return "Poor Context Awareness";
  if (lower.includes("new account") || lower.includes("just started")) return "Cold Start Discovery";
  return "Unknown Barrier";
}

function inferBehavior(theme: string, text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("discover weekly") || lower.includes("release radar") || lower.includes("daily mix")) {
    return "Playlist Consumption";
  }
  if (lower.includes("explor") || lower.includes("find new")) return "Active Exploration";
  if (lower.includes("friend") || lower.includes("social")) return "Social Discovery";
  if (theme === "Repetition Fatigue") return "Familiarity Seeking";
  if (lower.includes("mood") || lower.includes("vibe")) return "Mood Listening";
  if (lower.includes("radio") || lower.includes("background")) return "Passive Listening";
  if (lower.includes("recommend") || lower.includes("suggest")) return "Recommendation Evaluation";
  if (lower.includes("playlist")) return "Playlist Consumption";
  return "Recommendation Evaluation";
}

function inferRootCause(theme: string, barrier: string): string {
  if (theme === "Repetition Fatigue" || barrier === "Similar Artist Loop") {
    return "Similarity-Based Reinforcement";
  }
  if (theme === "Genre Lock-In") return "Similarity-Based Reinforcement";
  if (barrier === "Lack of Exploration Controls") return "Lack of User Steering Signals";
  if (barrier === "Discovery Surface Ineffectiveness") return "Discovery Surface Design Issues";
  if (barrier === "Low Novelty") return "Insufficient Novelty Injection";
  if (barrier === "Poor Context Awareness") return "Weak Context Understanding";
  if (theme === "Trust Gap") return "Engagement Optimization Bias";
  if (theme === "Poor Recommendation Quality") return "Limited Exploration Strategy";
  return "Unknown Root Cause";
}

function inferUnmetNeed(theme: string, barrier: string): string {
  if (barrier === "Lack of Exploration Controls" || theme === "Lack of Discovery Control") {
    return "Discovery Control";
  }
  if (barrier === "Low Novelty" || theme === "Repetition Fatigue") return "Adjustable Novelty";
  if (theme === "Trust Gap") return "Explainable Recommendations";
  if (theme === "Genre Lock-In") return "Cross-Genre Exploration";
  if (theme === "Repetition Fatigue") return "Better Artist Discovery";
  if (barrier === "Discovery Surface Ineffectiveness") return "Better Discovery Surfaces";
  if (barrier === "Poor Context Awareness") return "Context-Aware Discovery";
  return "Better Discovery Surfaces";
}

function inferEmotion(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("frustrat") || lower.includes("irritat") || lower.includes("nerves") || lower.includes("infuriat")) {
    return "Frustration";
  }
  if (lower.includes("confus") || lower.includes("don't understand")) return "Confusion";
  if (lower.includes("bored") || lower.includes("stale")) return "Boredom";
  if (lower.includes("curious") || lower.includes("want to explore")) return "Curiosity";
  if (lower.includes("delight") || lower.includes("amazing discovery")) return "Delight";
  if (lower.includes("love") || lower.includes("great") || lower.includes("best") || lower.includes("wonderful")) {
    return "Satisfaction";
  }
  if (lower.includes("disappoint")) return "Disappointment";
  return "Neutral";
}

function baselineClassifyReview(review: RawReview): ClassifiedReview {
  const theme = matchTheme(review.text);
  const barrier = inferBarrier(theme, review.text);

  return {
    source: review.source,
    text: review.text,
    discovery_relevant: assessDiscoveryRelevanceLegacy(review.text),
    theme,
    behavior: inferBehavior(theme, review.text),
    emotion: inferEmotion(review.text),
    segment: inferSegment(review.text),
    barrier,
    root_cause: inferRootCause(theme, barrier),
    unmet_need: inferUnmetNeed(theme, barrier),
    confidence: 0.55,
  };
}

export function classifyReviewsBaseline(reviews: RawReview[]): ClassifiedReview[] {
  return reviews.map(baselineClassifyReview);
}
