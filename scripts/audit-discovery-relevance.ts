/**
 * Audit discovery relevance filter on the last processed dataset (first 20 corpus rows).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { classifyReviewsMock } from "../lib/classify-mock";
import type { RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NOT_DISCOVERY_KEYWORDS = [
  "billing",
  "payment",
  "charged",
  "subscription cancelled",
  "refund",
  "login",
  "log in",
  "sign in",
  "password",
  "account locked",
  "crash",
  "crashes",
  "crashing",
  "won't open",
  "wont open",
  "bug",
  "glitch",
  "freeze",
  "frozen",
  "ads ",
  " too many ads",
  "advertisement",
  "premium cancelled",
  "customer support",
  "contact support",
];

const DISCOVERY_KEYWORDS = [
  "discover",
  "discovery",
  "recommend",
  "recommendation",
  "algorithm",
  "playlist",
  "discover weekly",
  "daily mix",
  "radio",
  "repeat",
  "same artist",
  "same song",
  "genre",
  "explore",
  "exploration",
  "novelty",
  "new music",
  "find music",
  "stuck",
  "recycled",
  "wrapped",
  "suggestion",
  "for you",
];

/** Strict ground truth per PM assignment criteria */
const STRICT_POSITIVE_SIGNALS: { label: string; patterns: RegExp[] }[] = [
  {
    label: "recommendations / recommendation quality",
    patterns: [
      /\brecommend(ation|ations|ed|s)?\b/,
      /\bsuggested?\s+(music|songs?|artists?)\b/,
      /\bsuggestion(s)?\b/,
      /\bfor you\b/,
      /\bpersonaliz/,
      /\balgorithm\b/,
    ],
  },
  {
    label: "discovering music / finding new artists",
    patterns: [
      /\bdiscover(y|ing)?\b/,
      /\bfind(ing)?\s+(new\s+)?(music|artists?|songs?)\b/,
      /\bnew\s+(music|artists?|songs?)\b/,
      /\bexplor(e|ation|ing)\b/,
    ],
  },
  {
    label: "Discover Weekly / Release Radar",
    patterns: [/\bdiscover\s+weekly\b/, /\brelease\s+radar\b/, /\bdaily\s+mix\b/],
  },
  {
    label: "playlists (discovery context)",
    patterns: [/\bplaylist(s)?\b/],
  },
  {
    label: "repetition / same content",
    patterns: [
      /\brepeat(ing|s|ed)?\b/,
      /\bsame\s+(artist|song|music|things?)\b/,
      /\bregurgitat/,
      /\brecycled?\b/,
      /\bheard\s+everything\b/,
    ],
  },
  {
    label: "novelty",
    patterns: [/\bnovelty\b/, /\bnew\s+artists?\b/],
  },
  {
    label: "genre exploration",
    patterns: [/\bgenre(s)?\b/, /\bbubble\b/, /\bbreak\s+out\b/],
  },
];

const STRICT_NEGATIVE_CATEGORIES: { category: string; patterns: RegExp[] }[] = [
  {
    category: "ads complaints",
    patterns: [
      /\bads?\b/,
      /\badvertisement/,
      /\btoo many ads\b/,
      /\bcontinuous ads\b/,
    ],
  },
  {
    category: "login issues",
    patterns: [
      /\blogin\b/,
      /\blog in\b/,
      /\bsign in\b/,
      /\bpassword\b/,
      /\bcan't open\b/,
      /\bwon't open\b/,
      /\baccount\b/,
    ],
  },
  {
    category: "crashes / bugs",
    patterns: [
      /\bcrash(es|ing)?\b/,
      /\bglitch(y|es)?\b/,
      /\bbug(s)?\b/,
      /\boffline\b/,
      /\bstops?\s+playing\b/,
      /\bfails?\s+to\b/,
    ],
  },
  {
    category: "premium / billing complaints",
    patterns: [
      /\bpremium\b/,
      /\bsubscription\b/,
      /\bbilling\b/,
      /\bpayment\b/,
      /\bcharged\b/,
      /\bfree plan\b/,
      /\bbuy\s+(premium|subscription)\b/,
      /\bpay for\b/,
      /\bshuffle\b/,
      /\bskip\b/,
    ],
  },
  {
    category: "generic praise",
    patterns: [
      /^[^.!?]{0,80}\b(love it|best app|wonderful|great app|5 stars|thank you)\b/i,
      /\bvery good\b.*\bapp\b/i,
      /\buser-friendly\b/i,
    ],
  },
  {
    category: "generic complaints (non-discovery)",
    patterns: [
      /\bwidget\b/,
      /\bhomescreen\b/,
      /\bnot worth\b/,
      /\bdisgusting app\b/,
    ],
  },
];

function matchedKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

function explainFilterDecision(text: string): {
  discovery_relevant: boolean;
  reasons: string[];
  discoverySignals: string[];
  exclusionSignals: string[];
} {
  const lower = text.toLowerCase();
  const notHits = matchedKeywords(text, NOT_DISCOVERY_KEYWORDS);
  const discHits = matchedKeywords(text, DISCOVERY_KEYWORDS);
  const reasons: string[] = [];

  if (notHits.length >= 2 && discHits.length === 0) {
    reasons.push(
      `Excluded: ${notHits.length} non-discovery keywords with zero discovery keywords (${notHits.join(", ")})`,
    );
    return {
      discovery_relevant: false,
      reasons,
      discoverySignals: discHits,
      exclusionSignals: notHits,
    };
  }
  if (notHits.length >= 1 && discHits.length === 0) {
    reasons.push(
      `Excluded: non-discovery keyword(s) with zero discovery keywords (${notHits.join(", ")})`,
    );
    return {
      discovery_relevant: false,
      reasons,
      discoverySignals: discHits,
      exclusionSignals: notHits,
    };
  }
  if (discHits.length >= 1) {
    reasons.push(
      `Included: matched discovery keyword(s): ${discHits.join(", ")}`,
    );
    if (notHits.length > 0) {
      reasons.push(
        `Note: also matched non-discovery keyword(s) but discovery keywords override: ${notHits.join(", ")}`,
      );
    }
    return {
      discovery_relevant: true,
      reasons,
      discoverySignals: discHits,
      exclusionSignals: notHits,
    };
  }
  if (lower.length < 40) {
    reasons.push(
      `Included: ambiguous short review (${lower.length} chars) defaults to discovery-related`,
    );
    return {
      discovery_relevant: true,
      reasons,
      discoverySignals: [],
      exclusionSignals: notHits,
    };
  }
  const relevant = discHits.length > notHits.length;
  reasons.push(
    relevant
      ? "Included: discovery keyword count exceeds non-discovery"
      : "Excluded: insufficient discovery signal",
  );
  return {
    discovery_relevant: relevant,
    reasons,
    discoverySignals: discHits,
    exclusionSignals: notHits,
  };
}

function strictGroundTruth(text: string): {
  isDiscovery: boolean;
  positiveSignals: string[];
  negativeCategory: string | null;
} {
  const positiveSignals: string[] = [];
  for (const group of STRICT_POSITIVE_SIGNALS) {
    if (group.patterns.some((p) => p.test(text))) {
      positiveSignals.push(group.label);
    }
  }

  let negativeCategory: string | null = null;
  for (const group of STRICT_NEGATIVE_CATEGORIES) {
    if (group.patterns.some((p) => p.test(text))) {
      negativeCategory = group.category;
      break;
    }
  }

  // Strict: must have positive discovery signal AND not be dominated by negative-only review
  const hasDiscovery = positiveSignals.length > 0;
  const isDiscovery =
    hasDiscovery &&
    !(
      negativeCategory &&
      positiveSignals.every((s) => s === "playlists (discovery context)") &&
      !/\bdiscover|\brecommend|\bnew artists?|\brepeat|\bregurgitat|\bsuggested?\s+music|\bfind(ing)?\s+new/i.test(
        text,
      )
    );

  // Special case: discovery signal present even with negative category (e.g. ads + recommendations)
  if (hasDiscovery && /recommend|suggest|discover|new artists?|regurgitat|same things/i.test(text)) {
    return { isDiscovery: true, positiveSignals, negativeCategory };
  }

  if (!hasDiscovery) {
    return { isDiscovery: false, positiveSignals, negativeCategory };
  }

  return { isDiscovery, positiveSignals, negativeCategory };
}

function classifyFalsePositiveType(
  text: string,
  negativeCategory: string | null,
): string {
  if (negativeCategory) return negativeCategory;
  if (/love|best|wonderful|great|stars|thank you/i.test(text)) return "generic praise";
  if (/widget|homescreen|can't open|glitch|crash|ads|premium|subscription/i.test(text))
    return "generic complaints";
  return "no strict discovery signal (short-review default or weak keyword match)";
}

const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
const raw = readFileSync(csvPath, "utf8");
const parsed = Papa.parse<Record<string, string>>(raw, {
  header: true,
  skipEmptyLines: true,
});

const reviews: (RawReview & { row: number })[] = parsed.data
  .slice(0, 20)
  .map((row, i) => ({
    row: i + 2,
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));

const classified = classifyReviewsMock(reviews);

const discoveryRelated = classified.filter((r) => r.discovery_relevant);
const falsePositives: Array<Record<string, unknown>> = [];
const auditRows = classified.map((r, i) => {
  const explain = explainFilterDecision(r.text);
  const truth = strictGroundTruth(r.text);
  const isFalsePositive = r.discovery_relevant && !truth.isDiscovery;
  const row = {
    row: reviews[i].row,
    source: r.source,
    text: r.text,
    discovery_relevant: r.discovery_relevant,
    confidence: r.confidence,
    filterReasons: explain.reasons,
    discoverySignalsDetected: explain.discoverySignals,
    exclusionSignalsDetected: explain.exclusionSignals,
    strictGroundTruth: truth.isDiscovery,
    strictPositiveSignals: truth.positiveSignals,
    strictNegativeCategory: truth.negativeCategory,
    isFalsePositive,
    falsePositiveType: isFalsePositive
      ? classifyFalsePositiveType(r.text, truth.negativeCategory)
      : null,
  };
  if (isFalsePositive) falsePositives.push(row);
  return row;
});

const predictedPositive = classified.filter((r) => r.discovery_relevant).length;
const truePositives = auditRows.filter(
  (r) => r.discovery_relevant && r.strictGroundTruth,
).length;
const falsePositiveCount = falsePositives.length;
const falseNegativeCount = auditRows.filter(
  (r) => !r.discovery_relevant && r.strictGroundTruth,
).length;
const precision =
  predictedPositive === 0 ? 0 : truePositives / predictedPositive;
const falsePositiveRate = falsePositiveCount / reviews.length;

console.log(
  JSON.stringify(
    {
      dataset: "First 20 rows, docs/review-corpus/all-reviews.csv (last processed batch)",
      classifier: "USE_MOCK_CLASSIFIER=true (assessDiscoveryRelevance in classify-mock)",
      summary: {
        totalReviews: reviews.length,
        classifiedDiscoveryRelated: predictedPositive,
        strictGroundTruthDiscovery: auditRows.filter((r) => r.strictGroundTruth)
          .length,
        truePositives,
        falsePositives: falsePositiveCount,
        falseNegatives: falseNegativeCount,
        precision: Math.round(precision * 1000) / 1000,
        falsePositiveRate: Math.round(falsePositiveRate * 1000) / 1000,
      },
      discoveryRelatedReviews: auditRows.filter((r) => r.discovery_relevant),
      falsePositives,
      excludedReviews: auditRows.filter((r) => !r.discovery_relevant),
    },
    null,
    2,
  ),
);
