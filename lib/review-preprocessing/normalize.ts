const URL_PATTERN = /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/gi;
const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;
const EXCESS_PUNCTUATION = /([!?.,"'():;-])\1{2,}/g;

/** Decode numeric and common named HTML entities from scraped social/HN text. */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * Phase 1 — normalize review text for signal detection while preserving original.
 */
export function normalizeReviewText(original: string): {
  original_text: string;
  cleaned_text: string;
} {
  const original_text = decodeHtmlEntities(original.trim());

  let cleaned = original_text.toLowerCase();
  cleaned = cleaned.replace(URL_PATTERN, " ");
  cleaned = cleaned.replace(EMOJI_PATTERN, " ");
  cleaned = cleaned.replace(EXCESS_PUNCTUATION, "$1");
  cleaned = cleaned.replace(/[^\w\s'-]/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return {
    original_text,
    cleaned_text: cleaned || original_text.toLowerCase().trim(),
  };
}

export function dedupeKey(cleanedText: string): string {
  return cleanedText.slice(0, 220);
}
