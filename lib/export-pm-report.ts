import { PLATFORM_NAME } from "./brand";
import type {
  AggregationResult,
  ClassifiedReview,
  ResearchFindings,
  ResearchFindingsReport,
} from "./types";
import { buildOpportunitiesFromEvidence } from "./opportunity-evidence";
import { ensureFindingsReport } from "./findings";
import { downloadFile } from "./export-report";

function formatFindingSection(
  title: string,
  finding: {
    summary: string;
    evidence_count: number;
    confidence: number;
    quotes: { text: string; source: string; segment: string; confidence: number }[];
  },
): string {
  const quotes = finding.quotes
    .slice(0, 5)
    .map(
      (q) =>
        `- "${q.text}" — ${q.source}, ${q.segment} (${Math.round(q.confidence * 100)}% conf.)`,
    )
    .join("\n");

  return `### ${title}

${finding.summary}

**Evidence:** ${finding.evidence_count} reviews · **Confidence:** ${Math.round(finding.confidence * 100)}%

**Top quotes:**
${quotes || "- (none)"}
`;
}

export function buildPmReportMarkdown(input: {
  findings: ResearchFindings;
  evidence: AggregationResult;
  datasetName?: string;
  classified?: ClassifiedReview[];
}): string {
  const { findings, evidence, datasetName = PLATFORM_NAME } = input;

  const report: ResearchFindingsReport = ensureFindingsReport(
    findings,
    evidence,
    input.classified ?? [],
  ).report!;

  const opportunities = buildOpportunitiesFromEvidence(evidence);

  const formatFreq = (data: Record<string, { count: number; pct: number }>) =>
    Object.entries(data)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { pct, count }]) => `- ${name}: ${pct}% (${count})`)
      .join("\n");

  return `# PM Research Report — ${datasetName}

Generated: ${new Date().toISOString()}
**Discovery-related reviews:** ${evidence.discoveryRelevantCount}

---

## 1. Why do users struggle to discover new music?

${formatFindingSection("Summary", report.why_discovery_fails)}

---

## 2. Most common frustrations

${report.top_frustrations.map((f) => formatFindingSection(f.title, f)).join("\n---\n")}

---

## 3. Listening behaviors

${report.listening_behaviors.map((f) => formatFindingSection(f.title, f)).join("\n---\n")}

---

## 4. Causes of repetitive listening

${report.repetition_causes.map((f) => formatFindingSection(f.title, f)).join("\n---\n")}

---

## 5. Segment-specific challenges

${report.segment_challenges
  .map(
    (s) => `### ${s.segment} — ${s.challenge} (${s.pct}%)

**Evidence:** ${s.evidence_count} reviews

${s.quotes.map((q) => `- "${q.text}"`).join("\n")}`,
  )
  .join("\n\n")}

---

## 6. Unmet needs

${report.unmet_needs.map((f) => formatFindingSection(f.title, f)).join("\n---\n")}

---

## Theme distribution

${formatFreq(evidence.themeFrequency)}

## Root causes

${formatFreq(evidence.rootCauseFrequency)}

## Unmet needs (frequency)

${formatFreq(evidence.unmetNeedFrequency)}

---

## Product opportunities (from unmet needs)

${opportunities
  .map(
    (o) => `#### ${o.title}

${o.description}

**Driven by:** ${o.supporting_unmet_needs.join(", ")}
**Evidence:** ${o.evidence_count} reviews

${o.quotes.map((q) => `- "${q.text}"`).join("\n")}`,
  )
  .join("\n\n")}
`;
}

export function buildPmReportJson(input: {
  findings: ResearchFindings;
  evidence: AggregationResult;
  classified?: ClassifiedReview[];
  datasetName?: string;
}) {
  const report = ensureFindingsReport(
    input.findings,
    input.evidence,
    input.classified ?? [],
  ).report;

  return {
    generatedAt: new Date().toISOString(),
    datasetName: input.datasetName ?? PLATFORM_NAME,
    evidence: input.evidence,
    findings: ensureFindingsReport(
      input.findings,
      input.evidence,
      input.classified ?? [],
    ),
    report,
    opportunities: buildOpportunitiesFromEvidence(input.evidence),
  };
}

export function exportPmReportPdf(markdown: string, title: string): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.5; color: #1a1a1a; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; color: #333; }
    h3 { font-size: 1rem; margin-top: 1.5rem; }
    h4 { font-size: 0.95rem; }
    pre, code { background: #f4f4f4; }
    ul { padding-left: 1.25rem; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    blockquote { border-left: 3px solid #666; margin-left: 0; padding-left: 1rem; color: #444; font-style: italic; }
  </style>
</head>
<body>
${markdown
  .replace(/^# (.*)/gm, "<h1>$1</h1>")
  .replace(/^## (.*)/gm, "<h2>$1</h2>")
  .replace(/^### (.*)/gm, "<h3>$1</h3>")
  .replace(/^#### (.*)/gm, "<h4>$1</h4>")
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/^- (.*)/gm, "<li>$1</li>")
  .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
  .replace(/^---$/gm, "<hr />")
  .replace(/\n\n/g, "</p><p>")
  .replace(/^(?!<[hul])/gm, "")
}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function downloadPmReportMarkdown(content: string, filename: string): void {
  downloadFile(content, filename, "text/markdown");
}

export function downloadPmReportJson(content: object, filename: string): void {
  downloadFile(JSON.stringify(content, null, 2), filename, "application/json");
}
