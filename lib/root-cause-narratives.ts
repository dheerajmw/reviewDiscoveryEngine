export interface RootCauseNarrative {
  mechanism: string;
  product_implication: string;
}

export const ROOT_CAUSE_MECHANISMS: Record<string, string> = {
  "Similarity-Based Reinforcement":
    "The collaborative filtering model uses past listening as its primary training signal — the more a user listens, the more the model converges on familiar content, actively shrinking the candidate pool over time.",
  "Listening History Loop":
    "Recent listening history dominates ranking features, so each session reinforces the same artist and genre pool instead of branching into new catalog territory.",
  "Engagement Optimization Bias":
    "The ranking objective favors stream completion and skip avoidance, so the system learns to serve safe, familiar tracks rather than riskier exploratory picks.",
  "Limited Exploration Strategy":
    "Candidate generation under-samples the long tail of artists and genres, so recommendation pools stay narrow even when users signal appetite for novelty.",
  "Lack of User Steering Signals":
    "The product has no durable way for users to signal exploration intent, so the algorithm optimizes for passive listening patterns it already observes.",
  "Playlist or Radio Loop":
    "Autoplay, radio, and station modes recycle library and session context instead of injecting fresh artists beyond what the user already saved or skipped.",
  "Discovery Surface Design Issues":
    "Flagship discovery playlists and feeds are tuned for engagement metrics, so they reuse high-confidence familiar picks instead of introducing unfamiliar artists at meaningful cadence.",
  "No Exploration Sandbox":
    "Exploratory listening actions feed directly into the main recommendation profile, so users avoid experimentation for fear of corrupting future suggestions.",
  "Cross-Content Recommendation Bias":
    "Signals from podcasts, audiobooks, and other non-music content bleed into music ranking, pulling recommendations toward adjacent but repetitive listening patterns.",
  "Unclear Repetition Cause":
    "Users perceive repetitive listening but cannot attribute it to a specific product behavior, suggesting multiple reinforcement mechanisms are compounding invisibly.",
};

export const ROOT_CAUSE_PRODUCT_IMPLICATIONS: Record<string, string> = {
  "Similarity-Based Reinforcement":
    "Introduce exploration-weighted ranking modes that inject novelty at a user-controlled rate without requiring past listening data as input.",
  "Listening History Loop":
    "Add session-scoped and time-decayed recommendation contexts so recent plays do not permanently dominate long-term discovery ranking.",
  "Engagement Optimization Bias":
    "Establish discovery-quality objectives separate from completion rate and optimize flagship surfaces against new-artist exposure, not just listen time.",
  "Limited Exploration Strategy":
    "Expand candidate generation with explicit long-tail and new-artist quotas in every discovery session.",
  "Lack of User Steering Signals":
    "Ship exploration-intent controls — novelty dial, genre boost/block, and explicit 'surprise me' signals the model can learn from.",
  "Playlist or Radio Loop":
    "Redesign autoplay and radio to enforce artist-diversity constraints and branch outward after each familiar track.",
  "Discovery Surface Design Issues":
    "Rebuild Discover Weekly, Release Radar, and Daily Mix generation around freshness guarantees and artist-repeat caps.",
  "No Exploration Sandbox":
    "Create a sandboxed exploration mode where skips, genre hops, and experimental listens do not rewrite the core taste profile.",
  "Cross-Content Recommendation Bias":
    "Isolate music recommendation signals from podcast and audiobook consumption when building taste models.",
  "Unclear Repetition Cause":
    "Instrument recommendation diversity and repeat-rate telemetry so product teams can pinpoint which reinforcement loop is driving repetition for each user cohort.",
};

const DEFAULT_NARRATIVE: RootCauseNarrative = {
  mechanism:
    "Multiple recommendation feedback loops reinforce familiar listening patterns instead of expanding artist exposure over time.",
  product_implication:
    "Add explicit exploration controls and diversity constraints so users can break repetition without abandoning algorithmic discovery.",
};

export function resolveRootCauseNarrative(label: string): RootCauseNarrative {
  const mechanism = ROOT_CAUSE_MECHANISMS[label];
  const product_implication = ROOT_CAUSE_PRODUCT_IMPLICATIONS[label];
  if (!mechanism || !product_implication) return DEFAULT_NARRATIVE;
  return { mechanism, product_implication };
}

export function enrichRootCauseFinding<
  T extends { title: string; mechanism?: string; product_implication?: string },
>(finding: T): T {
  const narrative = resolveRootCauseNarrative(finding.title);
  return {
    ...finding,
    mechanism: narrative.mechanism,
    product_implication: narrative.product_implication,
  };
}
