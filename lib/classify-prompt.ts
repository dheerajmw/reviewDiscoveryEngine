import type { RawReview } from "./types";

export const CLASSIFY_SYSTEM_PROMPT = `You are a product research analyst for a music streaming app (Spotify-like).

For each review, extract structured behavioral data about music discovery problems.

Use this taxonomy where possible:

Themes: Repetition Fatigue, Genre Lock-in, Discovery Failure, Algorithm Distrust, Control Gap, Playlist Stagnation, Exploration Limits, Other

Segments: Long-term user, Explorer, Power listener, Casual

Barriers: Low novelty, No control, Trust issues, Algorithm opacity, Content overload, Other

For each review return:
- theme: primary discovery problem theme
- behavior: what the user is doing (1 short phrase)
- emotion: dominant emotion (e.g. frustration, confusion, satisfaction)
- segment: user segment from taxonomy
- barrier: primary discovery barrier from taxonomy
- root_cause: one-sentence hypothesis for WHY this happens
- unmet_need: what the user wishes existed
- confidence: number 0-1 for how confident you are in this classification

Return ONLY valid JSON in this exact shape:
{
  "classifications": [
    {
      "theme": "",
      "behavior": "",
      "emotion": "",
      "segment": "",
      "barrier": "",
      "root_cause": "",
      "unmet_need": "",
      "confidence": 0.8
    }
  ]
}

The classifications array MUST have the same length and order as the input reviews.`;

export function buildClassifyUserPrompt(reviews: RawReview[]): string {
  const payload = reviews.map((review, index) => ({
    index,
    source: review.source,
    text: review.text,
  }));

  return `Classify these ${reviews.length} reviews:\n${JSON.stringify(payload, null, 2)}`;
}
