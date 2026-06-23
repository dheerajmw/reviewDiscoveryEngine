/**
 * Executive insight quality audit — evaluates findings for PM/Director usefulness.
 * Usage: npx tsx scripts/executive-insight-quality-audit.mts [--mock]
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { loadEnvLocal } from "../lib/env-loader";
import { aggregateReviews } from "../lib/aggregation";
import { buildExecutiveResearchReport } from "../lib/executive";
import type {
  ExecutiveFinding,
  ExecutiveResearchReport,
  ProductInsight,
  StrategicOpportunity,
} from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvLocal(join(__dirname, ".."));

const OUT_JSON = join(
  __dirname,
  "../docs/evaluation/executive-insight-quality-audit.json",
);
const OUT_MD = join(
  __dirname,
  "../docs/evaluation/executive-insight-quality-audit.md",
);

async function loadCorpusAndClassify(mock: boolean) {
  const csvPath = join(__dirname, "../docs/review-corpus/all-reviews.csv");
  const parsed = Papa.parse<Record<string, string>>(readFileSync(csvPath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  const allReviews = parsed.data.map((row, i) => ({
    review_id: `corpus-${i + 1}`,
    source: row.source?.replace(/^"|"$/g, "") ?? "unknown",
    text: row.text?.replace(/^"|"$/g, "") ?? "",
  }));

  const { curateReviews } = await import("../lib/review-curation");
  const curation = await curateReviews(allReviews);
  const toClassify = curation.included.map((r) => ({
    review_id: r.review_id,
    source: r.source,
    text: r.text,
    cleaned_text: r.cleaned_text,
    primary_category: r.primary_category,
    discovery_outcome: r.discovery_outcome,
    user_goal: r.user_goal,
  }));

  let classified;
  let classifierMode: string;

  if (mock) {
    const { classifyReviewsMock } = await import("../lib/classify-mock");
    classified = classifyReviewsMock(toClassify);
    classifierMode = "mock";
  } else {
    const { classifyReviews } = await import("../lib/classify");
    const { getLlmApiKey } = await import("../lib/llm-config");
    const apiKey = getLlmApiKey();
    if (!apiKey) throw new Error("GROQ_API_KEY required");
    const { DEFAULT_CLASSIFY_BATCH_SIZE } = await import("../lib/llm-limits");
    classified = [];
    const batchSize = DEFAULT_CLASSIFY_BATCH_SIZE;
    for (let i = 0; i < toClassify.length; i += batchSize) {
      const batch = toClassify.slice(i, i + batchSize);
      console.error(`Classifying ${i + batch.length}/${toClassify.length}…`);
      const result = await classifyReviews(batch, apiKey);
      classified.push(...result.classified);
    }
    classifierMode = process.env.GROQ_MODEL ?? process.env.LLM_MODEL ?? "groq";
  }

  const aggregation = aggregateReviews(classified);
  const executive = buildExecutiveResearchReport({ classified, aggregation });

  return {
    classifierMode,
    corpusTotal: allReviews.length,
    curationIncluded: curation.included.length,
    classified,
    aggregation,
    executive,
  };
}

function insightMap(report: ExecutiveResearchReport): Map<string, ProductInsight> {
  return new Map(report.insights.map((i) => [i.id, i]));
}

function oppForFinding(
  report: ExecutiveResearchReport,
  findingId: string,
): StrategicOpportunity | undefined {
  return report.strategic_opportunities.find(
    (o) => o.related_finding_id === findingId,
  );
}

function scoreActionability(finding: ExecutiveFinding, insight?: ProductInsight): {
  score: 0 | 1 | 2;
  rationale: string;
} {
  const title = finding.title.toLowerCase();
  const desc = finding.description.toLowerCase();

  if (
    /users (mention|report|describe|articulate)/.test(title) &&
    !/cannot|lack|trapped|over-index|loop|lock-in|steer|intent/.test(title)
  ) {
    return { score: 0, rationale: "Observational — describes frequency or mentions without product lever." };
  }
  if (
    /cannot|lack|trapped|over-index|loop|lock-in|steer|intent|mechanism|controls|opaque|predictable/.test(
      title + desc,
    )
  ) {
    return {
      score: 2,
      rationale: "Names a product-addressable mechanism or user need PMs can design against.",
    };
  }
  if (insight?.unmet_needs?.length || insight?.root_causes?.length) {
    return {
      score: 1,
      rationale: "Suggests direction via taxonomy linkage but lacks explicit product intervention.",
    };
  }
  return { score: 0, rationale: "Restates user sentiment without clear product action." };
}

function scoreRootCauseDepth(
  finding: ExecutiveFinding,
  insight?: ProductInsight,
): {
  level: 1 | 2 | 3;
  label: string;
  executiveQuality: boolean;
} {
  const text = `${finding.title} ${finding.description}`.toLowerCase();
  const hasMechanism =
    /over-index|reinforc|loop|history|similarity|engagement optimization|ranking|bias|strategy|signal|mechanism/.test(
      text,
    ) || (insight?.root_causes?.some((r) => !r.includes("Unclear")) ?? false);
  const hasBehavior =
    /return|skip|retreat|disengage|explore|seek|rely|playlist|familiar/.test(text);
  const symptomOnly =
    /hear the same|repetitive|frustrat|frequent|mention/.test(text) && !hasMechanism;

  if (hasMechanism) {
    return { level: 3, label: "Mechanism", executiveQuality: true };
  }
  if (hasBehavior) {
    return { level: 2, label: "Behavior", executiveQuality: false };
  }
  if (symptomOnly) {
    return { level: 1, label: "Symptom", executiveQuality: false };
  }
  return { level: 2, label: "Behavior", executiveQuality: false };
}

function scoreStrategicValue(finding: ExecutiveFinding): {
  score: "Low" | "Medium" | "High";
  influences: string[];
} {
  const influences: string[] = [];
  const impacts = finding.business_impact;
  if (impacts.includes("Discovery")) influences.push("Discovery strategy");
  if (impacts.includes("Engagement")) influences.push("Recommendation strategy");
  if (impacts.includes("Retention")) influences.push("Retention strategy");
  if (impacts.includes("Monetization")) influences.push("Growth strategy");
  if (
    finding.title.toLowerCase().includes("roadmap") ||
    finding.description.toLowerCase().includes("surface")
  ) {
    influences.push("Product roadmap");
  }
  if (influences.length >= 3) return { score: "High", influences };
  if (influences.length >= 2) return { score: "Medium", influences };
  return { score: "Low", influences: influences.length ? influences : ["Discovery strategy"] };
}

function mvpRelevance(
  finding: ExecutiveFinding,
  opp?: StrategicOpportunity,
): { aiNative: boolean; concept?: string } {
  const text = `${finding.title} ${opp?.spotify_opportunity ?? ""}`.toLowerCase();
  if (
    /control|novelty|dial|steer|intent|explain|rationale|exploration mode|reset|boost|block/.test(
      text,
    )
  ) {
    return {
      aiNative: true,
      concept:
        opp?.spotify_opportunity?.slice(0, 120) ??
        "AI discovery copilot that interprets exploration intent and reweights recommendations in-session.",
    };
  }
  if (/freshness|diversity|artist-level|discover weekly/.test(text)) {
    return {
      aiNative: true,
      concept: "AI freshness agent that enforces artist diversity constraints per discovery session.",
    };
  }
  return { aiNative: false };
}

function slideWorthiness(
  finding: ExecutiveFinding,
  actionability: 0 | 1 | 2,
  rootLevel: 1 | 2 | 3,
): { score: "No" | "Maybe" | "Yes"; why: string } {
  if (actionability === 2 && rootLevel === 3 && finding.evidence_count >= 10) {
    return {
      score: "Yes",
      why: "Mechanism-level insight with strong evidence — suitable for a strategy slide with quote backup.",
    };
  }
  if (actionability >= 1 && finding.evidence_count >= 5) {
    return {
      score: "Maybe",
      why: "Directionally useful but may need sharpening or merging before Director review.",
    };
  }
  return {
    score: "No",
    why: "Too observational or thin on mechanism/evidence for Director-level deck.",
  };
}

function jaccardWords(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}

function redundancyCheck(findings: ExecutiveFinding[]) {
  const merged: { keep: ExecutiveFinding; mergedFrom: string[] }[] = [];
  const used = new Set<string>();

  for (const f of findings) {
    if (used.has(f.id)) continue;
    const group = [f];
    used.add(f.id);
    for (const other of findings) {
      if (used.has(other.id)) continue;
      const sim = jaccardWords(f.title, other.title);
      if (sim >= 0.45) {
        group.push(other);
        used.add(other.id);
      }
    }
    const keep = group.sort((a, b) => b.evidence_count - a.evidence_count)[0]!;
    merged.push({
      keep,
      mergedFrom: group.filter((g) => g.id !== keep.id).map((g) => g.title),
    });
  }

  return {
    originalCount: findings.length,
    mergedCount: merged.length,
    recommended: merged.map((m) => ({
      title: m.keep.title,
      evidence_count: m.keep.evidence_count,
      merged_from: m.mergedFrom,
    })),
  };
}

function allFindings(report: ExecutiveResearchReport): ExecutiveFinding[] {
  const seen = new Set<string>();
  const out: ExecutiveFinding[] = [];
  for (const f of [
    ...report.top_discovery_problems,
    ...report.top_recommendation_frustrations,
  ]) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

async function main() {
  const mock = process.argv.includes("--mock");
  console.error(`Loading corpus (${mock ? "mock" : "gemini"} classifier)…`);

  const data = await loadCorpusAndClassify(mock);
  const { executive } = data;
  const insights = insightMap(executive);
  const findings = allFindings(executive);

  const audited = findings.map((finding) => {
    const insight = insights.get(finding.related_insight_id.replace("finding-", ""));
    const opp = oppForFinding(executive, finding.id);
    const action = scoreActionability(finding, insight);
    const root = scoreRootCauseDepth(finding, insight);
    const strategic = scoreStrategicValue(finding);
    const mvp = mvpRelevance(finding, opp);
    const slide = slideWorthiness(finding, action.score, root.level);

    return {
      title: finding.title,
      supporting_review_count: finding.evidence_count,
      supporting_segments: finding.affected_segments,
      supporting_quotes: finding.representative_quotes.map((q) => ({
        text: q.text.slice(0, 220),
        source: q.source,
        segment: q.segment,
      })),
      supporting_themes: insight?.themes ?? [],
      supporting_root_causes: insight?.root_causes ?? [],
      confidence: finding.confidence,
      opportunity_score: opp?.opportunity_score ?? null,
      audits: {
        actionability: action,
        root_cause_depth: root,
        strategic_value: strategic,
        mvp_relevance: mvp,
        slide_worthiness: slide,
      },
    };
  });

  const redundancy = redundancyCheck(findings);

  const topFindings = [...audited]
    .sort((a, b) => {
      const aScore =
        (a.audits.actionability.score + (a.audits.root_cause_depth.level === 3 ? 2 : 0)) *
        a.supporting_review_count;
      const bScore =
        (b.audits.actionability.score + (b.audits.root_cause_depth.level === 3 ? 2 : 0)) *
        b.supporting_review_count;
      return bScore - aScore;
    })
    .slice(0, 3);

  const topOpps = executive.strategic_opportunities.slice(0, 3);
  const topMvp = audited
    .filter((a) => a.audits.mvp_relevance.aiNative)
    .slice(0, 3);
  const topQuotes = executive.key_quotes.slice(0, 3).map((q) => ({
    text: q.text.slice(0, 200),
    source: q.source,
    segment: q.segment,
  }));

  const level3Count = audited.filter((a) => a.audits.root_cause_depth.level === 3).length;
  const action2Count = audited.filter((a) => a.audits.actionability.score === 2).length;
  const slideYes = audited.filter((a) => a.audits.slide_worthiness.score === "Yes").length;

  const pmScore = Math.min(
    10,
    Math.round(
      (action2Count / Math.max(findings.length, 1)) * 4 +
        (level3Count / Math.max(findings.length, 1)) * 3 +
        (executive.quality.accepted / Math.max(executive.quality.total_candidates, 1)) * 2 +
        (slideYes > 0 ? 1 : 0),
    ) / 1,
  );

  const directorScore = Math.min(
    10,
    Math.round(
      pmScore * 0.6 +
        (slideYes >= 2 ? 2 : slideYes >= 1 ? 1 : 0) +
        (redundancy.mergedCount < redundancy.originalCount ? -0.5 : 0),
    ),
  );

  let directorBelief: "YES" | "PARTIALLY" | "NO";
  let directorWhy: string;
  if (directorScore >= 7 && slideYes >= 2 && level3Count >= 2) {
    directorBelief = "YES";
    directorWhy =
      "Findings cite mechanisms, carry multi-source evidence, and map to concrete opportunities a Director could prioritize.";
  } else if (directorScore >= 4 && action2Count >= 1) {
    directorBelief = "PARTIALLY";
    directorWhy =
      "Some findings are mechanism-level and evidence-backed, but redundancy, quote quality, or shallow clusters would require PM editing before roadmap use.";
  } else {
    directorBelief = "NO";
    directorWhy =
      "Findings read as templated synthesis over weak clusters — insufficient mechanism depth and evidence diversity for executive prioritization.";
  }

  const weakness =
    executive.quality.accepted < 3
      ? "Quality gate accepts too few clusters — executive layer falls back to thin or templated findings."
      : level3Count < findings.length / 2
        ? "Root cause depth: many findings stop at symptom/behavior without naming recommendation mechanisms."
        : redundancy.mergedCount < redundancy.originalCount
          ? "Redundant findings rephrase the same discovery loop — needs merge logic in synthesis."
          : "Quote representativeness: supporting quotes often don't sharply illustrate the claimed mechanism.";

  const report = {
    generatedAt: new Date().toISOString(),
    corpus: {
      total: data.corpusTotal,
      discovery_curated: data.curationIncluded,
      discovery_classified: data.aggregation.discoveryRelevantCount,
      classifier: data.classifierMode,
    },
    executive_quality_gate: executive.quality,
    findings_audited: audited,
    redundancy,
    top_3_executive_findings: topFindings,
    top_3_strategic_opportunities: topOpps,
    top_3_mvp_opportunities: topMvp,
    top_3_quotes: topQuotes,
    biggest_weakness: weakness,
    pm_readiness_score: pmScore,
    director_readiness_score: directorScore,
    director_would_believe: directorBelief,
    director_would_believe_why: directorWhy,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

  const md = `# Executive Insight Quality Audit

**Classifier:** ${data.classifierMode} · **Discovery corpus:** ${data.aggregation.discoveryRelevantCount} reviews

## PM Readiness: ${pmScore}/10 · Director Readiness: ${directorScore}/10

**Would a Director believe and use these?** ${directorBelief} — ${directorWhy}

**Biggest weakness:** ${weakness}

## Findings audited (${audited.length})

${audited
  .map(
    (f) => `### ${f.title}

- Reviews: ${f.supporting_review_count} · Confidence: ${f.confidence} · Opp score: ${f.opportunity_score ?? "n/a"}
- Segments: ${f.supporting_segments.join(", ")}
- Themes: ${f.supporting_themes.join(", ") || "—"}
- Root causes: ${f.supporting_root_causes.join(", ") || "—"}
- **Actionability:** ${f.audits.actionability.score}/2 — ${f.audits.actionability.rationale}
- **Root cause depth:** Level ${f.audits.root_cause_depth.level} (${f.audits.root_cause_depth.label})
- **Strategic value:** ${f.audits.strategic_value.score} — ${f.audits.strategic_value.influences.join(", ")}
- **AI MVP:** ${f.audits.mvp_relevance.aiNative ? `Yes — ${f.audits.mvp_relevance.concept}` : "No"}
- **Slide worthy:** ${f.audits.slide_worthiness.score} — ${f.audits.slide_worthiness.why}

> "${f.supporting_quotes[0]?.text ?? ""}"
`,
  )
  .join("\n")}

## Redundancy: ${redundancy.originalCount} → ${redundancy.mergedCount} recommended

${redundancy.recommended.map((r) => `- **${r.title}** (${r.evidence_count})${r.merged_from.length ? ` — merges: ${r.merged_from.join("; ")}` : ""}`).join("\n")}
`;

  writeFileSync(OUT_MD, md, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.error(`\nWrote ${OUT_JSON} and ${OUT_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
