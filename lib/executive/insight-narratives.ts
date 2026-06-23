/** Executive narrative fragments — synthesize labels into product language, never report raw %. */

export const SEGMENT_DISPLAY_NAMES: Record<string, string> = {
  "Long-Term Power Listener": "Power Listener",
  "Music Explorer": "Music Explorer",
  "Casual Listener": "Casual Listener",
  "Playlist-Centric Listener": "Playlist Curator",
  "Discovery-Focused Listener": "Discovery Seeker",
  "New User": "New User",
  "Unspecified Segment": "General Listener",
};

export const THEME_INSIGHT_FRAGMENTS: Record<string, string> = {
  "Repetition Fatigue":
    "discovery sessions converge on already-known music rather than introducing meaningful novelty",
  "Poor Recommendation Quality":
    "recommendations feel misaligned with stated listening intent and taste diversity",
  "Lack of Discovery Control":
    "users cannot steer discovery toward exploration when algorithms default to familiarity",
  "Genre Lock-In":
    "recommendation surfaces remain trapped in narrow genre bubbles despite varied listening history",
  "Algorithm Distrust":
    "users question whether recommendations genuinely reflect their preferences or opaque optimization",
  "Weak Discovery Surfaces":
    "built-in discovery features fail to surface compelling new music at the moment users seek it",
  "Discovery Fatigue":
    "users disengage from discovery after repeated exposure to predictable recommendation patterns",
  "Cross-Content Recommendation Noise":
    "non-music content signals pollute music recommendations and undermine discovery trust",
  "Positive Discovery Experience":
    "algorithmic playlists successfully introduce unfamiliar artists when novelty and relevance align",
  "Strong Discovery Playlists":
    "Discover Weekly, Release Radar, and DJ reliably surface compelling new music",
  "Recommendation Success":
    "recommendations match taste context and deliver satisfying discovery moments",
  "Successful Artist Discovery":
    "users discover unfamiliar artists that still feel personally relevant",
  "Discovery Delight":
    "users experience surprise and delight when discovery surfaces exceed expectations",
  "Other Discovery Frustration":
    "discovery pain points remain diffuse without a clear product surface to address",
};

export const BARRIER_INSIGHT_FRAGMENTS: Record<string, string> = {
  "Low Novelty":
    "recommendation feeds deliver insufficient novelty relative to user expectations for discovery",
  "Similar Artist Loop":
    "users repeatedly encounter familiar artists instead of adjacent but unfamiliar music",
  "Genre Saturation":
    "genre diversity collapses as the algorithm over-weights recent listening patterns",
  "Lack of Exploration Controls":
    "users lack mechanisms to communicate exploration intent to the recommendation system",
  "Poor Personalization Context":
    "personalization ignores situational context — mood, session intent, or cross-genre curiosity",
  "Ineffective Discovery Surfaces":
    "Discover Weekly, Release Radar, and DJ fail to deliver fresh artists at meaningful cadence",
  "Cold Start Discovery":
    "new or returning users cannot break out of generic recommendations quickly enough",
  "Unclear Discovery Struggle":
    "users articulate discovery frustration without naming a specific product failure mode",
};

export const ROOT_CAUSE_INSIGHT_FRAGMENTS: Record<string, string> = {
  "Similarity-Based Reinforcement":
    "similarity-based ranking reinforces past listens, shrinking the candidate pool over time",
  "Listening History Loop":
    "listening history dominates recommendation ranking, reducing exposure to new artists",
  "Engagement Optimization Bias":
    "engagement optimization favors safe, familiar picks over exploratory recommendations",
  "Limited Exploration Strategy":
    "the exploration strategy under-samples the long tail of artists and genres",
  "Lack of User Steering Signals":
    "the system lacks explicit signals for when users want novelty versus comfort",
  "Playlist or Radio Loop":
    "autoplay and radio modes recycle library content instead of branching outward",
  "Discovery Surface Design Issues":
    "discovery surface design prioritizes engagement metrics over genuine artist introduction",
  "Cross-Content Recommendation Bias":
    "cross-content signals (podcasts, audiobooks) bleed into music recommendations",
  "Unclear Repetition Cause":
    "repetition mechanisms are perceived but not attributed to a specific product behavior",
};

export const UNMET_NEED_NARRATIVES: Record<string, string> = {
  "Better Artist Discovery":
    "Users want Spotify to introduce unfamiliar artists that still feel personally relevant — not just more songs from artists they already stream.",
  "Stronger Discovery Playlists":
    "Users expect algorithmic playlists to function as reliable discovery engines, but many describe them as predictable or stale.",
  "Adjustable Novelty":
    "Users want explicit controls to dial up or down how adventurous recommendations should be.",
  "Discovery Control":
    "Users want to steer discovery — blocking genres, boosting exploration, or resetting recommendation context.",
  "Explainable Recommendations":
    "Users want to understand why a track was recommended so they can trust or correct the system.",
  "Genre Exploration":
    "Users with diverse taste want deliberate cross-genre exploration, not permanent genre lock-in.",
  "Freshness Guarantees":
    "Users want assurance that discovery surfaces will not repeat the same artists week after week.",
  "Cross-Genre Exploration":
    "Users expect recommendations to bridge genres they already listen to, not silo them further.",
  "General Discovery Improvement":
    "Users want discovery to feel intentional and fresh, but struggle to articulate a single fix.",
};

export const BEHAVIOR_NARRATIVES: Record<string, string> = {
  "Find New Music or Artists":
    "Users actively seek new artists but depend on Spotify surfaces to deliver unfamiliar music — when those surfaces repeat, users disengage from discovery.",
  "Evaluate Recommendations":
    "Users treat recommendations as a quality barometer — each miss erodes trust and pushes them back to saved content.",
  "Explore by Genre or Mood":
    "Users browse by genre or mood expecting serendipity, but surfaces often mirror their existing library instead of expanding it.",
  "Listen to Familiar Content":
    "When discovery fails, users retreat to playlists and saved tracks — familiarity becomes the fallback behavior.",
  "Use Algorithmic Playlists":
    "Users rely on Discover Weekly, Release Radar, and DJ as primary discovery channels, making repetition in these surfaces especially damaging.",
  "Social or External Discovery":
    "Some users supplement Spotify with social and external discovery because in-app recommendations feel insufficient.",
  "Passive Background Listening":
    "Passive listeners accept familiar recommendations but still notice when autoplay feels repetitive during long sessions.",
};

export const OPPORTUNITY_ACTIONS: Record<string, string> = {
  "Adjustable Novelty":
    "Introduce exploration-weighted recommendation modes with user-controlled novelty sliders.",
  "Discovery Control":
    "Add discovery steering controls — genre boost/block, exploration reset, and session-intent signals.",
  "Better Artist Discovery":
    "Increase artist-level diversity in ranking with explicit new-artist exposure targets per session.",
  "Freshness Guarantees":
    "Implement freshness constraints on Discover Weekly and Release Radar to cap artist repeat rate.",
  "Explainable Recommendations":
    "Surface recommendation rationale and let users correct misfires inline.",
  "Genre Exploration":
    "Deploy cross-genre bridging in recommendations for users with multi-genre listening history.",
  "Stronger Discovery Playlists":
    "Redesign discovery playlist generation with exploration-first objectives separate from engagement.",
  "Cross-Genre Exploration":
    "Add cross-genre exploration lanes in Home and Discover Weekly for multi-genre listeners.",
  "General Discovery Improvement":
    "Establish a discovery quality metric distinct from engagement and optimize surfaces against it.",
};

export const BUSINESS_IMPLICATIONS: Record<string, string> = {
  "Repetition Fatigue": "Discovery engagement declines as users perceive recommendations as predictable.",
  "Poor Recommendation Quality":
    "Recommendation trust erodes, reducing time spent on algorithmic surfaces.",
  "Lack of Discovery Control":
    "Power users churn to manual curation or competing platforms with better discovery tools.",
  "Genre Lock-In": "Cross-genre listeners feel underserved, limiting catalog depth perception.",
  "Algorithm Distrust": "Users disengage from recommendations and rely on external discovery.",
  "Weak Discovery Surfaces": "Flagship discovery features underdeliver on Spotify's core value proposition.",
  "Similar Artist Loop": "Artist exploration stagnates, reducing long-tail catalog engagement.",
  "Listening History Loop":
    "Historical preferences dominate, preventing users from evolving their taste on-platform.",
  "Engagement Optimization Bias":
    "Short-term engagement wins trade off long-term discovery satisfaction.",
  "Lack of User Steering Signals":
    "Users cannot communicate intent, so the system optimizes for the wrong objective.",
};

export function displaySegment(segment: string): string {
  return SEGMENT_DISPLAY_NAMES[segment] ?? segment;
}

export function composeInsightSentence(parts: {
  theme?: string;
  barrier?: string;
  root_cause?: string;
}): string {
  const root =
    parts.root_cause && ROOT_CAUSE_INSIGHT_FRAGMENTS[parts.root_cause];
  const barrier =
    parts.barrier && BARRIER_INSIGHT_FRAGMENTS[parts.barrier];
  const theme = parts.theme && THEME_INSIGHT_FRAGMENTS[parts.theme];

  if (root && barrier) {
    return `Users feel Spotify ${barrier} because ${root}.`;
  }
  if (root && theme) {
    return `Because ${root}, users experience that ${theme}.`;
  }
  if (root) {
    return `Recommendation surfaces ${root}, reducing meaningful artist exploration.`;
  }
  if (barrier && theme) {
    return `Users report that ${barrier}, causing ${theme}.`;
  }
  if (barrier) {
    return `Users struggle to discover new music because ${barrier}.`;
  }
  if (theme) {
    return `Users experience discovery friction: ${theme}.`;
  }
  return "Users articulate discovery challenges that converge on familiarity over exploration.";
}

export function composeMechanismTitle(insight: {
  is_positive?: boolean;
  symptom?: string;
  mechanism?: string;
  product_implication?: string;
  themes?: string[];
  barriers?: string[];
  root_causes?: string[];
}): string {
  if (insight.is_positive) {
    const theme = insight.themes?.[0];
    if (theme === "Strong Discovery Playlists") {
      return "Users consistently praise Discover Weekly, DJ, and algorithmic playlists for introducing new artists.";
    }
    if (theme === "Successful Artist Discovery") {
      return "Spotify successfully introduces unfamiliar artists that users adopt into regular listening.";
    }
    return "Users consistently praise Spotify's ability to introduce new artists through discovery surfaces.";
  }

  if (insight.mechanism && insight.symptom) {
    if (insight.root_causes?.includes("Listening History Loop")) {
      return "Discovery surfaces over-index on listening history, reducing exposure to new artists.";
    }
    if (insight.root_causes?.includes("Similarity-Based Reinforcement")) {
      return "Recommendation ranking reinforces familiar artists, shrinking meaningful novelty in discovery sessions.";
    }
    if (insight.themes?.includes("Repetition Fatigue")) {
      return "Users report recommendation loops that repeatedly surface familiar content, limiting discovery.";
    }
    if (insight.themes?.includes("Genre Lock-In")) {
      return "Users remain locked in genre bubbles despite diverse listening histories.";
    }
    if (insight.themes?.includes("Algorithm Distrust")) {
      return "Opaque recommendations erode user trust in Spotify's discovery engine.";
    }
    return `${insight.symptom.replace(/\.$/, "")} — ${insight.mechanism.replace(/\.$/, "")}.`;
  }

  return composeFindingTitle({
    theme: insight.themes?.[0],
    barrier: insight.barriers?.[0],
    root_cause: insight.root_causes?.[0],
  });
}

export function composeDashboardHeadline(input: {
  positiveSignals: { title: string; evidence_count: number }[];
  discoveryProblems: { title: string }[];
  recommendationFrustrations: { title: string }[];
  aggregation: { discoveryRelevantCount: number };
}): string {
  const n = input.aggregation.discoveryRelevantCount;
  const topPositive = input.positiveSignals[0];
  const topNegative =
    input.discoveryProblems[0] ?? input.recommendationFrustrations[0];

  if (
    topPositive &&
    topPositive.evidence_count >= 5 &&
    (!topNegative || topPositive.evidence_count >= (topNegative as { evidence_count?: number }).evidence_count!)
  ) {
    return topPositive.title;
  }

  if (topNegative) {
    return topNegative.title;
  }

  return `Across ${n} discovery-related reviews, users describe friction between familiarity and exploration in Spotify's recommendation system.`;
}

export function composeFindingTitle(parts: {
  theme?: string;
  barrier?: string;
  root_cause?: string;
}): string {
  if (parts.root_cause === "Listening History Loop") {
    return "Users are trapped in recommendation loops driven by historical listening behavior.";
  }
  if (parts.root_cause === "Similarity-Based Reinforcement") {
    return "Recommendation surfaces over-index on listening history, reducing exposure to new artists.";
  }
  if (parts.theme === "Repetition Fatigue") {
    return "Discovery sessions converge on familiar content, undermining the promise of algorithmic playlists.";
  }
  if (parts.theme === "Genre Lock-In") {
    return "Users remain locked in genre bubbles despite diverse listening histories.";
  }
  if (parts.barrier === "Lack of Exploration Controls") {
    return "Users lack mechanisms to communicate exploration intent to recommendation systems.";
  }
  if (parts.theme === "Lack of Discovery Control") {
    return "Users want discovery but cannot steer recommendations away from familiarity.";
  }
  if (parts.theme === "Algorithm Distrust") {
    return "Opaque recommendations erode user trust in Spotify's discovery engine.";
  }
  if (parts.barrier === "Similar Artist Loop") {
    return "Users repeatedly encounter familiar artists instead of meaningful new introductions.";
  }
  return composeInsightSentence(parts).replace(/\.$/, "");
}

export function composeFindingDescription(
  insight: string,
  segments: string[],
  count: number,
): string {
  const segmentList =
    segments.length > 0
      ? segments.map(displaySegment).join(", ")
      : "multiple listener segments";
  return `${insight} This pattern appears across ${segmentList} and is supported by ${count} discovery-related reviews. Users describe discovery sessions that feel predictable rather than exploratory, with frustration concentrated among listeners who actively seek new music.`;
}
