/**
 * Discovery-targeted collection — keyword filter for fetch + corpus building.
 * Prioritize reviews about recommendations, discovery surfaces, repetition, exploration.
 */

export const DISCOVERY_COLLECTION_KEYWORDS = [
  "discover weekly",
  "release radar",
  "spotify dj",
  "daily mix",
  "made for you",
  "for you",
  "recommendation",
  "recommendations",
  "recommended",
  "algorithm",
  "personalization",
  "personalized",
  "find new artist",
  "finding new artist",
  "music discovery",
  "discover new",
  "artist discovery",
  "same songs",
  "same artist",
  "same music",
  "on repeat",
  "repetition",
  "repetitive",
  "shuffle",
  "smart shuffle",
  "radio",
  "autoplay",
  "genre bubble",
  "genre lock",
  "stuck in a genre",
  "discovery fatigue",
  "exploration",
  "explore new",
  "novelty",
  "hidden gem",
  "recommendation trust",
  "recommendation quality",
  "recommendation diversity",
  "feedback loop",
  "listening history",
  "discover mode",
  "blend",
  "song radio",
  "artist radio",
] as const;

export const DISCOVERY_COLLECTION_REGEX: RegExp[] = [
  /\bdiscover weekly\b/i,
  /\brelease radar\b/i,
  /\bspotify dj\b/i,
  /\bdaily mix\b/i,
  /\b(recommendation|recommendations|recommended)\b/i,
  /\balgorithm(ic)?\b/i,
  /\bfind(ing)? (new )?(artist|music|songs?)\b/i,
  /\b(music )?discover(y|ing)\b/i,
  /\bsame (song|artist|music|playlist)/i,
  /\b(keeps? playing the same|on repeat|over and over)\b/i,
  /\b(genre bubble|genre lock|stuck in (a |one )?genre)\b/i,
  /\b(novelty|exploration|explore new)\b/i,
  /\bshuffle\b/i,
  /\b(radio|autoplay)\b/i,
  /\bhidden gems?\b/i,
  /\bfeedback loop\b/i,
  /\blistening history\b/i,
];

export function matchesDiscoveryCollectionSignal(text: string): boolean {
  const lower = text.toLowerCase();
  if (DISCOVERY_COLLECTION_KEYWORDS.some((k) => lower.includes(k))) return true;
  return DISCOVERY_COLLECTION_REGEX.some((p) => p.test(text));
}

export function filterForDiscoveryCollection<
  T extends { text: string },
>(rows: T[]): T[] {
  return rows.filter((r) => matchesDiscoveryCollectionSignal(r.text));
}

/** Suggested Reddit search queries for discovery-focused collection. */
export const DISCOVERY_REDDIT_QUERIES = [
  "discover weekly",
  "release radar",
  "spotify dj",
  "recommendation algorithm",
  "music discovery",
  "same songs repeat",
  "recommendation quality",
  "genre bubble",
  "shuffle repeat",
  "find new artists",
  "daily mix",
  "recommendation diversity",
  "discovery fatigue",
  "autoplay recommendations",
] as const;

/** Subreddits with higher discovery discussion density. */
export const DISCOVERY_REDDIT_SUBREDDITS = [
  "spotify",
  "truespotify",
  "LetsTalkMusic",
  "music",
  "listentothis",
  "ifyoulikeblank",
] as const;
