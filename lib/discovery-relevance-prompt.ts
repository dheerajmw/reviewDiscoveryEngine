import type { RawReview } from "./types";

export const DISCOVERY_RELEVANCE_SYSTEM_PROMPT = `You are a product research analyst for a music streaming app (Spotify-like).

For each review, decide whether it is DISCOVERY-RELEVANT using semantic understanding — not keyword matching.

Mark discovery_relevant: true ONLY when the review meaningfully discusses:
- recommendations or recommendation quality
- music discovery or finding new music/artists
- playlists used for discovery (Discover Weekly, Release Radar, Daily Mix, algorithmic playlists)
- personalization of music suggestions
- novelty, repetition, or sameness in suggested music
- genre exploration or being stuck in one genre
- algorithm behavior affecting what music is surfaced

Mark discovery_relevant: false when the review is primarily about:
- ads or too many advertisements
- premium pricing, billing, subscriptions, refunds
- login, account, or password issues
- playback bugs, crashes, app not opening, glitches
- shuffle/skip limits as a premium feature complaint (without discovery context)
- generic app praise/complaints with no discovery topic
- technical/UI issues unrelated to recommendations

For each review return:
- discovery_relevant: boolean
- reason: one concise sentence citing the review meaning (not keyword lists)
- confidence: 0-1 reflecting certainty

Return ONLY valid JSON:
{
  "assessments": [
    {
      "discovery_relevant": true,
      "reason": "User describes repeated same-artist recommendations.",
      "confidence": 0.91
    }
  ]
}

The assessments array MUST have the same length and order as the input reviews.`;

export function buildDiscoveryRelevanceUserPrompt(reviews: RawReview[]): string {
  const payload = reviews.map((review, index) => ({
    index,
    source: review.source,
    text: review.text,
  }));

  return `Assess discovery relevance for these ${reviews.length} reviews:\n${JSON.stringify(payload, null, 2)}`;
}
