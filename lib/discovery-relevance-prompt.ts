import type { RawReview } from "./types";

export const DISCOVERY_RELEVANCE_SYSTEM_PROMPT = `You are a product research analyst for a music streaming app (Spotify-like).

For each review, decide whether it is DISCOVERY-RELEVANT using semantic understanding — not keyword matching.

Mark discovery_relevant: true ONLY when the review discusses at least one of:
- Discovery experience: finding new music/artists/genres, recommendation quality, algorithm behavior, Discover Weekly/DJ/Radio/Mixes, recommendation accuracy/diversity
- Discovery friction: same songs repeatedly, repetitive recommendations, lack of novelty, genre bubble, recommendation loops, playlist contamination, irrelevance, distrust
- Discovery intent: user trying to explore, discover, find something new, broaden taste

Mark discovery_relevant: false when the review is primarily about:
- pricing, premium restrictions, ads, crashes, login, account issues, UI bugs, playback/queue bugs
- playlist sharing/promotion ("drop your playlist", "follow me", "check out my playlist")
- social spam or self-promotion
- generic praise with no discovery substance

Unless discovery/recommendation quality is explicitly discussed, exclude billing/ads/bug-only reviews.

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
