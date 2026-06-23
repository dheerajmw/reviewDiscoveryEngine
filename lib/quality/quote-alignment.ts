import type { ProductInsight, QuoteEvidence } from "../types";

export type QuoteAlignmentScore = "Strong" | "Medium" | "Weak";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "spotify",
  "music",
  "users",
  "user",
  "their",
  "they",
  "are",
  "was",
  "have",
  "has",
  "not",
  "but",
  "when",
  "into",
  "about",
]);

const POSITIVE_QUOTE_SIGNALS =
  /\b(love|amazing|great|best|introduced me to|found (new )?artists?|spot on|excellent|discover(ed)? new)\b/i;

const NEGATIVE_QUOTE_SIGNALS =
  /\b(same|repeat|again|stuck|frustrat|boring|terrible|awful|hate|never find|no new|identical|regurgitat|loop)\b/i;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared++;
  }
  return shared / Math.min(a.size, b.size);
}

function insightKeywords(insight: ProductInsight): Set<string> {
  const parts = [
    insight.symptom,
    insight.mechanism,
    insight.product_implication,
    insight.insight,
    ...insight.themes,
    ...insight.barriers,
    ...insight.root_causes,
    ...insight.unmet_needs,
  ]
    .filter(Boolean)
    .join(" ");

  return tokenize(parts);
}

export function scoreQuoteAlignment(
  quote: QuoteEvidence,
  insight: ProductInsight,
): QuoteAlignmentScore {
  const quoteText = quote.text.toLowerCase();
  const isPositiveFinding = Boolean(insight.is_positive);

  if (!isPositiveFinding && POSITIVE_QUOTE_SIGNALS.test(quoteText)) {
    return "Weak";
  }
  if (isPositiveFinding && NEGATIVE_QUOTE_SIGNALS.test(quoteText)) {
    return "Weak";
  }

  const insightTokens = insightKeywords(insight);
  const quoteTokens = tokenize(quote.text);
  const overlap = overlapScore(insightTokens, quoteTokens);

  const themeMatch =
    insight.themes.includes(quote.theme) ||
    insight.barriers.includes(quote.barrier ?? "") ||
    insight.root_causes.includes(quote.root_cause ?? "");

  if (overlap >= 0.35) return "Strong";
  if (overlap >= 0.15 || (themeMatch && NEGATIVE_QUOTE_SIGNALS.test(quoteText))) {
    return "Medium";
  }
  if (themeMatch) return "Medium";
  return "Weak";
}

export function filterAlignedQuotes(
  quotes: QuoteEvidence[],
  insight: ProductInsight,
  limit = 3,
): QuoteEvidence[] {
  return quotes
    .map((quote) => ({
      quote,
      alignment: scoreQuoteAlignment(quote, insight),
    }))
    .filter(({ alignment }) => alignment !== "Weak")
    .sort((a, b) => {
      const rank = { Strong: 0, Medium: 1, Weak: 2 };
      return rank[a.alignment] - rank[b.alignment];
    })
    .slice(0, limit)
    .map(({ quote }) => quote);
}

export function averageQuoteAlignment(
  insights: ProductInsight[],
): { strongPct: number; mediumPct: number; weakPct: number; score: number } {
  let strong = 0;
  let medium = 0;
  let weak = 0;

  for (const insight of insights) {
    for (const quote of insight.representative_quotes) {
      const score = scoreQuoteAlignment(quote, insight);
      if (score === "Strong") strong++;
      else if (score === "Medium") medium++;
      else weak++;
    }
  }

  const total = strong + medium + weak;
  const strongPct = total === 0 ? 0 : Math.round((strong / total) * 1000) / 10;
  const mediumPct = total === 0 ? 0 : Math.round((medium / total) * 1000) / 10;
  const weakPct = total === 0 ? 0 : Math.round((weak / total) * 1000) / 10;
  const score = total === 0 ? 0 : Math.round(((strong + medium * 0.5) / total) * 100) / 10;

  return { strongPct, mediumPct, weakPct, score };
}
