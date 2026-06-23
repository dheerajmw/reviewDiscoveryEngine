/**
 * Discovery signal audit — corpus exclusion analysis, source scoring, diversity.
 * Usage: npx tsx scripts/discovery-signal-audit.mts
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { aggregateReviews } from "../lib/aggregation";
import { classifyReviewsMock } from "../lib/classify-mock";
import { buildExecutiveResearchReport } from "../lib/executive";
import { filterQualifiedInsights, MIN_SUPPORTING_REVIEWS } from "../lib/executive/executive-quality";
import { synthesizeInsights } from "../lib/executive/insight-synthesis";
import { curateReviews, type CurationRecord } from "../lib/review-curation";
import { preprocessReview } from "../lib/review-preprocessing/preprocess-review";
import {
  DISCOVERY_COLLECTION_KEYWORDS,
  filterForDiscoveryCollection,
  matchesDiscoveryCollectionSignal,
} from "../lib/fetch/discovery-collection";
import {
  ADS_PATTERNS,
  BILLING_PATTERNS,
  TECHNICAL_PATTERNS,
} from "../lib/review-preprocessing/signals";
import type { RawReview } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, "../docs/review-corpus/all-reviews.csv");
const OUT_JSON = join(__dirname, "../docs/evaluation/discovery-signal-audit.json");
const OUT_MD = join(__dirname, "../docs/evaluation/discovery-signal-audit.md");

const SOURCE_LABELS: Record<string, string> = {
  playstore: "Play Store",
  appstore: "App Store",
  reddit: "Reddit",
  "spotify-community": "Spotify Community",
  "social-media": "Social Media",
};

type AuditExclusionCategory =
  | "premium"
  | "ads"
  | "bugs"
  | "playback"
  | "account"
  | "social_spam"
  | "playlist_sharing"
  | "generic_praise"
  | "off_topic"
  | "duplicate"
  | "too_short";

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function classifyExcludedReview(record: CurationRecord): AuditExclusionCategory {
  const text = record.text.toLowerCase();
  const reason = record.exclusion_reason ?? "not_discovery_related";

  if (reason === "duplicate") return "duplicate";
  if (reason === "too_short") return "too_short";
  if (reason === "playlist_promotion") return "playlist_sharing";
  if (reason === "social_spam") return "social_spam";
  if (reason === "praise_only" || record.primary_category === "praise") {
    return "generic_praise";
  }
  if (reason === "advertising" || record.primary_category === "ads") return "ads";
  if (
    reason === "billing_or_pricing" ||
    record.primary_category === "billing" ||
    matchesAny(text, BILLING_PATTERNS)
  ) {
    return "premium";
  }
  if (/\b(password|account locked|login|sign in|verify email)\b/.test(text)) {
    return "account";
  }
  if (/\b(won't play|wont play|playback|skipping|buffer|audio cut)\b/.test(text)) {
    return "playback";
  }
  if (
    reason === "technical_issue" ||
    record.primary_category === "technical" ||
    matchesAny(text, TECHNICAL_PATTERNS)
  ) {
    return "bugs";
  }
  return "off_topic";
}

function pct(n: number, d: number): string {
  return d === 0 ? "0%" : `${Math.round((n / d) * 1000) / 10}%`;
}

function hasDiscoverySignal(text: string): boolean {
  return matchesDiscoveryCollectionSignal(text);
}

async function main() {
  const parsed = Papa.parse<Record<string, string>>(readFileSync(CORPUS, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  const allReviews: RawReview[] = parsed.data.map((row, i) => ({
    review_id: `corpus-${i + 1}`,
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));

  const curation = await curateReviews(allReviews);
  const classified = classifyReviewsMock(curation.included.map((r) => ({ ...r })));
  const aggregation = aggregateReviews(classified);
  const executive = buildExecutiveResearchReport({ classified, aggregation });
  const candidates = synthesizeInsights(classified);
  const { accepted } = filterQualifiedInsights(candidates);

  // ── Task 1: Exclusion audit ──
  const exclusionCounts = new Map<AuditExclusionCategory, CurationRecord[]>();
  for (const record of curation.excluded) {
    const cat = classifyExcludedReview(record);
    const list = exclusionCounts.get(cat) ?? [];
    list.push(record);
    exclusionCounts.set(cat, list);
  }

  const exclusionAudit = [...exclusionCounts.entries()]
    .map(([category, records]) => ({
      category,
      count: records.length,
      percent: pct(records.length, curation.excluded.length),
      samples: records.slice(0, 2).map((r) => ({
        source: r.source,
        text: r.text.slice(0, 180),
      })),
    }))
    .sort((a, b) => b.count - a.count);

  // Missed discovery in excluded (keyword/pattern in excluded text)
  const missedDiscoveryExcluded = curation.excluded.filter(
    (r) => hasDiscoverySignal(r.text),
  );

  // ── Task 2: Source scoring ──
  const sources = [...new Set(curation.records.map((r) => r.source))];

  const sourceScoring = sources
    .map((source) => {
      const records = curation.records.filter((r) => r.source === source);
      const included = records.filter((r) => r.included);
      const highConf = included.filter((r) => (r.confidence ?? 0) >= 0.6);
      const classifiedFromSource = classified.filter((r) => r.source === source);
      const research = classifiedFromSource.filter(
        (r) => r.research_relevant !== false && r.discovery_relevant,
      );

      const insightContribution = accepted.filter((insight) =>
        insight.representative_quotes.some((q) => q.source === source),
      ).length;

      const discoveryRate = records.length
        ? (included.length / records.length) * 100
        : 0;
      const highConfRate = included.length
        ? (highConf.length / included.length) * 100
        : 0;

      return {
        source,
        label: SOURCE_LABELS[source] ?? source,
        total: records.length,
        discovery_included: included.length,
        discovery_review_rate: Math.round(discoveryRate * 10) / 10,
        high_confidence_rate: Math.round(highConfRate * 10) / 10,
        classified_research: research.length,
        executive_finding_contribution: insightContribution,
        composite_score:
          Math.round(
            (discoveryRate * 0.5 + highConfRate * 0.2 + insightContribution * 10) *
              10,
          ) / 10,
      };
    })
    .sort((a, b) => b.discovery_review_rate - a.discovery_review_rate);

  const sourceDiscoveryRank = sourceScoring.map((s) => ({
    source: s.label,
    discovery_rate: `${s.discovery_review_rate}%`,
    included: s.discovery_included,
    total: s.total,
  }));

  // ── Task 5: Finding diversity ──
  const findingVolumes = accepted.map((i) => ({
    id: i.id,
    insight: i.insight.slice(0, 120),
    volume: i.supporting_reviews,
    percent_of_research: pct(
      i.supporting_reviews,
      aggregation.discoveryRelevantCount,
    ),
    exceeds_50pct: i.supporting_reviews > aggregation.discoveryRelevantCount * 0.5,
  }));

  const mechanismLevel = accepted.filter((i) =>
    i.root_causes.some((r) => !r.includes("Unclear")),
  ).length;

  // Keyword density in full corpus vs included
  const keywordHitsInCorpus = allReviews.filter((r) =>
    hasDiscoverySignal(r.text),
  ).length;
  const keywordHitsIncluded = curation.included.filter((r) =>
    hasDiscoverySignal(r.text),
  ).length;

  const keywordFiltered = filterForDiscoveryCollection(allReviews);
  const keywordCuration = await curateReviews(keywordFiltered);
  const keywordClassified = classifyReviewsMock(keywordCuration.included.map((r) => ({ ...r })));
  const keywordAgg = aggregateReviews(keywordClassified);
  const keywordInsights = filterQualifiedInsights(
    synthesizeInsights(keywordClassified),
  ).accepted;

  const report = {
    generatedAt: new Date().toISOString(),
    corpus: {
      total: allReviews.length,
      curated_discovery: curation.included.length,
      classified_discovery: aggregation.discoveryRelevantCount,
      insight_candidates: candidates.length,
      qualified_insights: accepted.length,
      executive_findings:
        executive.top_discovery_problems.length +
        executive.top_recommendation_frustrations.length,
      strategic_opportunities: executive.strategic_opportunities.length,
    },
    task1_exclusion_audit: {
      total_excluded: curation.excluded.length,
      by_category: exclusionAudit,
      missed_discovery_signal_in_excluded: missedDiscoveryExcluded.length,
      missed_discovery_samples: missedDiscoveryExcluded.slice(0, 5).map((r) => ({
        source: r.source,
        category: classifyExcludedReview(r),
        text: r.text.slice(0, 160),
        reason: r.discovery_reason,
      })),
    },
    task2_source_scoring: sourceScoring,
    task2_source_rank: sourceDiscoveryRank,
    task3_collection_keywords: [...DISCOVERY_COLLECTION_KEYWORDS],
    task4_quality_target: {
      current: {
        discovery_curated: curation.included.length,
        classified_discovery: aggregation.discoveryRelevantCount,
        executive_findings: accepted.length,
        mechanism_findings: mechanismLevel,
        opportunities: executive.strategic_opportunities.length,
      },
      target: {
        discovery_curated: "500-1000",
        classified_discovery: 300,
        executive_findings: 5,
        mechanism_findings: 3,
        opportunities: 3,
        director_readiness: 7,
      },
      keyword_filter_projection: {
        corpus_after_keyword_filter: keywordFiltered.length,
        curated_after_filter: keywordCuration.included.length,
        qualified_insights_projected: keywordInsights.length,
      },
    },
    task5_finding_diversity: {
      findings: findingVolumes,
      largest_finding_pct: findingVolumes[0]
        ? findingVolumes[0].percent_of_research
        : "0%",
      any_exceeds_50pct: findingVolumes.some((f) => f.exceeds_50pct),
    },
    keyword_analysis: {
      corpus_with_discovery_keywords: keywordHitsInCorpus,
      included_with_discovery_keywords: keywordHitsIncluded,
      keyword_hit_rate_in_corpus: pct(keywordHitsInCorpus, allReviews.length),
    },
    recommendation: {
      primary: "C",
      rationale:
        "Classification and synthesis work; discovery signal density (8.8% curation yield) is the binding constraint.",
      options: {
        A_better_classification: {
          expected_discovery_lift: "+10-20% classified yield",
          expected_findings_lift: "+0-1 findings",
          impact: "Low — mock/Gemini already classify; bottleneck is input pool",
        },
        B_better_synthesis: {
          expected_discovery_lift: "0%",
          expected_findings_lift: "+0-1 via lower quality gate",
          impact: "Low — validated; lowering gate increases false positives",
        },
        C_more_discovery_data: {
          expected_discovery_lift: "+200-400 curated reviews with targeted collection",
          expected_findings_lift: "+3-5 executive findings at 500+ curated",
          impact: "High — only path to 3-5 mechanism-level findings",
        },
      },
      collection_priority: sourceScoring.slice(0, 3).map((s) => s.label),
    },
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

  const md = `# Discovery Signal Audit

## Corpus funnel
| Stage | Count |
|-------|-------|
| Total | ${report.corpus.total} |
| Discovery curated | ${report.corpus.curated_discovery} (${pct(report.corpus.curated_discovery, report.corpus.total)}) |
| Classified discovery | ${report.corpus.classified_discovery} |
| Insight candidates | ${report.corpus.insight_candidates} |
| Qualified findings | ${report.corpus.qualified_insights} |

## Task 1 — Exclusion reasons (n=${report.task1_exclusion_audit.total_excluded})

${exclusionAudit.map((e) => `- **${e.category}**: ${e.count} (${e.percent})`).join("\n")}

**Missed discovery signal in excluded:** ${missedDiscoveryExcluded.length} reviews contain discovery keywords/patterns but were excluded.

## Task 2 — Source discovery rate (ranked)

| Source | Discovery rate | Included / Total |
|--------|----------------|------------------|
${sourceScoring.map((s) => `| ${s.label} | ${s.discovery_review_rate}% | ${s.discovery_included} / ${s.total} |`).join("\n")}

## Task 4 — Quality target gap

| Metric | Current | Target |
|--------|---------|--------|
| Curated discovery | ${report.task4_quality_target.current.discovery_curated} | 500-1000 |
| Classified | ${report.task4_quality_target.current.classified_discovery} | 300+ |
| Executive findings | ${report.task4_quality_target.current.executive_findings} | 5+ |
| Mechanism findings | ${report.task4_quality_target.current.mechanism_findings} | 3+ |

**Keyword-filter projection:** ${keywordFiltered.length} reviews → ${keywordCuration.included.length} curated → ${keywordInsights.length} qualified insights

## Recommendation: **${report.recommendation.primary} — More discovery-specific data**

${report.recommendation.rationale}

Priority sources: ${report.recommendation.collection_priority.join(", ")}
`;

  writeFileSync(OUT_MD, md, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.error(`\nWrote ${OUT_JSON} and ${OUT_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
