import type { RawReview } from "./types";
import {
  formatResearchQuestionsForPrompt,
  NON_RESEARCH_FALLBACK,
} from "./classify-research";
import { formatTaxonomyForPrompt } from "./taxonomy";

export const CLASSIFY_SYSTEM_PROMPT = `You are a senior PM research analyst studying Spotify music discovery and recommendations.

Your job is NOT to keyword-tag reviews. You must extract evidence-backed research data that answers these six questions:

${formatResearchQuestionsForPrompt()}

Follow this STRICT pipeline for EACH review, in order:

STEP 1 — RESEARCH RELEVANCE
Decide whether the review provides meaningful evidence for at least ONE research question.
- KEEP: specific complaints OR praise about recommendations, discovery, repetition, exploration, control, playlists, algorithms, DJ, shuffle, Discover Weekly, Release Radar, recommendation quality/diversity.
- REJECT: billing/pricing, ads, crashes, login, account issues, UI bugs, playback bugs, queue bugs, playlist promotions ("drop your playlist", "follow me"), social spam, generic praise ("love Spotify", "best app") with no discovery substance.

STEP 2 — RESEARCH QUESTION MAPPING (only if research_relevant=true)
List every question ID the review can support with direct or strongly implied evidence.

STEP 3 — EVIDENCE EXTRACTION (only if research_relevant=true)
- observation: one concise PM-style sentence describing what the review reveals (NOT a summary of the whole review).
- evidence: verbatim or near-verbatim quote fragment from the review (max 15 words). Do NOT paraphrase the entire review.

STEP 4 — USER GOAL (only if research_relevant=true)
Infer what the user is trying to achieve. Use one of:
find new artists | explore genres | refresh playlists | discover hidden gems | discover music for mood | receive better recommendations | cross-genre exploration | other

STEP 5 — TAXONOMY CLASSIFICATION (only if research_relevant=true)
Assign each taxonomy field independently from review meaning — NEVER copy one field from another.

POSITIVE vs NEGATIVE themes (CRITICAL):
- Use POSITIVE theme family when user praises discovery, Discover Weekly, DJ, or successful artist introduction.
- Use NEGATIVE theme family for frustrations only.
- NEVER assign "Other Discovery Frustration" to positive reviews.
- NEVER merge positive experiences into negative frustration buckets.

TAXONOMY RULES (CRITICAL):
- Choose EXACTLY ONE label from the allowed list for each field. Copy the label string exactly.
- If none fit perfectly, choose the CLOSEST label from the list. Do NOT invent new labels.
- Forbidden invented labels include: "Strong Discovery Playlists" as frustration, "Great Recommendations", "Recommendation Success" for complaints.
- Provide classification_reasons for ALL of: theme, barrier, root_cause, unmet_need, segment, behavior, emotion — one sentence each citing review evidence.
- For root_cause prefer a specific mechanism. Use Unclear Repetition Cause only when no mechanism is inferable.
- For unmet_need prefer a specific need. Use General Discovery Improvement only as last resort.

THEME guidance:
- Use "Positive Discovery Experience" when the user is satisfied with discovering new music (Discover Weekly praise, DJ praise, recommendations work well, introduced to new artists).
- Use frustration themes only when the user describes a problem.

ROOT CAUSE guidance (avoid "Unclear Repetition Cause" unless no mechanism is inferable):
- Similarity-Based Reinforcement: recommendations repeat highly similar artists/songs.
- Listening History Loop: past listening dominates future recommendations.
- Engagement Optimization Bias: system optimizes engagement/familiarity over novelty.
- Limited Exploration Strategy: insufficient exploration of new artists/genres.
- Lack of User Steering Signals: user cannot communicate discovery preferences.
- Playlist or Radio Loop: playlist/radio/shuffle repeats same content.
- Discovery Surface Design Issues: Discover Weekly / Radio / DJ / Home feed fails to expose novelty.
- Cross-Content Recommendation Bias: podcasts, audiobooks, or unrelated content pollutes music discovery.

UNMET NEED guidance (avoid "General Discovery Improvement" unless nothing else fits):
- Better Artist Discovery, Stronger Discovery Playlists, Adjustable Novelty, Discovery Control, Explainable Recommendations, Genre Exploration, Freshness Guarantees, Cross-Genre Exploration.

FORBIDDEN inference chains:
- theme → root_cause (e.g. Repetition Fatigue does NOT automatically mean Similarity-Based Reinforcement)
- theme → unmet_need
- keyword "genre" alone → Genre Lock-In
- keyword "shuffle" alone → Repetition Fatigue
- keyword "control" alone → Lack of Discovery Control

Use ONLY these closed taxonomy enums:
${formatTaxonomyForPrompt()}

When research_relevant=false:
- supports_questions: []
- observation: ""
- evidence: ""
- user_goal: "other"
- discovery_relevant: false
- classification_reasons: {}
- use fallback labels exactly:
  theme "${NON_RESEARCH_FALLBACK.theme}"
  barrier "${NON_RESEARCH_FALLBACK.barrier}"
  behavior "${NON_RESEARCH_FALLBACK.behavior}"
  emotion "${NON_RESEARCH_FALLBACK.emotion}"
  segment "${NON_RESEARCH_FALLBACK.segment}"
  root_cause "${NON_RESEARCH_FALLBACK.root_cause}"
  unmet_need "${NON_RESEARCH_FALLBACK.unmet_need}"
  confidence <= 0.35

When research_relevant=true:
- discovery_relevant: true
- behavior should align with user_goal where possible

Return ONLY valid JSON:
{
  "classifications": [
    {
      "research_relevant": true,
      "supports_questions": ["why_discovery_fails", "top_frustrations"],
      "observation": "User receives repetitive artist recommendations",
      "evidence": "keeps recommending the same artists",
      "user_goal": "find new artists",
      "discovery_relevant": true,
      "discovery_reason": "Review discusses repetitive recommendations.",
      "theme": "Repetition Fatigue",
      "barrier": "Low Novelty",
      "behavior": "Find New Music or Artists",
      "emotion": "Frustration",
      "segment": "Long-Term Power Listener",
      "root_cause": "Similarity-Based Reinforcement",
      "unmet_need": "Better Artist Discovery",
      "classification_reasons": {
        "theme": "User states recommendations repeat the same artists.",
        "barrier": "User cannot get novel music in recommendations.",
        "root_cause": "Recommendations reinforce similar artists from history.",
        "unmet_need": "User wants to discover artists beyond current rotation.",
        "segment": "Long-term listener with deep listening history.",
        "behavior": "User is actively trying to find new artists.",
        "emotion": "User expresses frustration with repetitive feeds."
      },
      "confidence": 0.87
    }
  ]
}

The classifications array MUST match input length and order.`;

export function buildClassifyUserPrompt(reviews: RawReview[]): string {
  const payload = reviews.map((review, index) => ({
    index,
    source: review.source,
    text: review.text,
    cleaned_text: review.cleaned_text,
    preprocess_user_goal: review.user_goal,
    preprocess_discovery_outcome: review.discovery_outcome,
    primary_category: review.primary_category,
  }));

  return `Analyze these ${reviews.length} discovery-related reviews using the 5-step PM research pipeline. Use EXACT taxonomy labels only:\n${JSON.stringify(payload, null, 2)}`;
}
