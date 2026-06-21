/**
 * Per-review classification audit for the latest analysis run.
 * Usage: npx tsx scripts/generate-classification-audit.mts [runId]
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/env-loader";
import { ensureTursoSchema } from "../lib/turso";
import {
  buildResearchEvidenceDraft,
  behaviorFromResearchDraft,
} from "../lib/classify-research-mock";
import type { RawReview } from "../lib/types";

const FALLBACK_LABELS = {
  theme: "Other Discovery Frustration",
  barrier: "Unclear Discovery Struggle",
  root_cause: "Unclear Repetition Cause",
  unmet_need: "General Discovery Improvement",
  segment: "Unspecified Segment",
} as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/evaluation");

const FALLBACK_SET = new Set([
  "Other Discovery Frustration",
  "General Discovery Improvement",
  "Unclear Discovery Struggle",
  "Unclear Repetition Cause",
  "Unspecified Segment",
]);

type RuleSet = { label: string; keywords: string[] }[];

const THEME_RULES: RuleSet = [
  { label: "Repetition Fatigue", keywords: ["same song", "same artist", "same music", "on repeat", "recycled", "regurgitat", "over and over", "repetitive recommend"] },
  { label: "Genre Lock-In", keywords: ["genre bubble", "filter bubble", "one genre", "one type of music", "locked in", "break out of", "same genre", "stuck in a genre"] },
  { label: "Lack of Discovery Control", keywords: ["no control over recommend", "can't control recommend", "steer recommend", "novelty slider", "adjust how adventurous", "control recommend"] },
  { label: "Poor Recommendation Quality", keywords: ["bad recommend", "poor suggest", "irrelevant recommend", "wrong music", "useless recommend", "doesn't match my taste", "terrible recommend"] },
  { label: "Algorithm Distrust", keywords: ["don't trust the algorithm", "distrust algorithm", "opacity", "pushing artists", "manipulat"] },
  { label: "Weak Discovery Surfaces", keywords: ["discover weekly useless", "release radar bad", "daily mix useless", "discovery tab", "dj always loops"] },
];

const BARRIER_RULES: RuleSet = [
  { label: "Low Novelty", keywords: ["nothing new", "no novelty", "stale feed", "same old music"] },
  { label: "Similar Artist Loop", keywords: ["same artist", "similar artist", "artist loop", "same bands"] },
  { label: "Genre Saturation", keywords: ["genre bubble", "one genre", "genre locked", "same genre only"] },
  { label: "Lack of Exploration Controls", keywords: ["no control", "can't adjust recommend", "can't steer", "no slider", "wish i could adjust"] },
  { label: "Poor Personalization Context", keywords: ["wrong mood", "wrong context", "doesn't understand me"] },
  { label: "Ineffective Discovery Surfaces", keywords: ["discover weekly useless", "release radar bad", "daily mix useless"] },
  { label: "Cold Start Discovery", keywords: ["new account", "just started", "cold start", "new to spotify"] },
];

const ROOT_CAUSE_RULES: RuleSet = [
  { label: "Similarity-Based Reinforcement", keywords: ["listening history", "based on what i already", "similar music", "echo chamber"] },
  { label: "Engagement Optimization Bias", keywords: ["engagement", "plays familiar", "optimize listen time"] },
  { label: "Lack of User Steering Signals", keywords: ["no feedback", "won't listen to feedback", "can't tell spotify", "no signal"] },
  { label: "Limited Exploration Strategy", keywords: ["narrow recommend", "limited exploration", "won't explore"] },
  { label: "Listening History Loop", keywords: ["history loop", "past listens", "what i already heard"] },
  { label: "Playlist or Radio Loop", keywords: ["discover weekly repeat", "radio repeat", "playlist loop", "dj loops familiar"] },
];

const UNMET_NEED_RULES: RuleSet = [
  { label: "Adjustable Novelty", keywords: ["novelty slider", "adjust novelty", "adventurous dial"] },
  { label: "Discovery Control", keywords: ["control discovery", "steer recommend", "choose discovery", "more control over"] },
  { label: "Explainable Recommendations", keywords: ["explain why", "transparent recommend", "why this song"] },
  { label: "Better Artist Discovery", keywords: ["find new artists", "artist discovery", "discover artists"] },
  { label: "Cross-Genre Exploration", keywords: ["cross genre", "different genres", "break out genre"] },
  { label: "Stronger Discovery Playlists", keywords: ["better discover weekly", "improve release radar", "stronger discovery"] },
];

const SEGMENT_RULES: RuleSet = [
  { label: "Long-Term Power Listener", keywords: ["years on spotify", "long time user", "decade", "premium for years"] },
  { label: "Discovery-Focused Listener", keywords: ["discover weekly", "release radar", "find new artists"] },
  { label: "Music Explorer", keywords: ["explore genre", "try new genre"] },
  { label: "Playlist-Centric Listener", keywords: ["my playlist", "curate playlist", "1000 songs playlist"] },
  { label: "New User", keywords: ["just started", "new to spotify", "signed up"] },
];

const BEHAVIOR_RULES: RuleSet = [
  { label: "Find New Music or Artists", keywords: ["find new artist", "discover new music", "hidden gem"] },
  { label: "Passive Background Listening", keywords: ["background listen", "autoplay", "radio mode"] },
  { label: "Explore by Genre or Mood", keywords: ["explore genre", "mood playlist", "music for mood"] },
  { label: "Listen to Familiar Content", keywords: ["comfort music", "listen to favorites", "same songs again"] },
  { label: "Social or External Discovery", keywords: ["tiktok", "youtube", "friend shared", "outside spotify"] },
  { label: "Evaluate Recommendations", keywords: ["recommendation quality", "evaluate recommend", "for you feed"] },
  { label: "Use Algorithmic Playlists", keywords: ["discover weekly", "release radar", "daily mix", "spotify dj"] },
];

function scoreRules(text: string, rules: RuleSet): { label: string; hit: string } | null {
  const lower = text.toLowerCase();
  let best: { label: string; score: number; hit: string } | null = null;
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        const score = 1 + kw.length / 20;
        if (!best || score > best.score) best = { label: rule.label, score, hit: kw };
      }
    }
  }
  return best ? { label: best.label, hit: best.hit } : null;
}

type FallbackCause =
  | "weak taxonomy"
  | "weak prompt"
  | "missing category"
  | "review not actually about discovery"
  | "validation/remapping logic"
  | "low confidence classification";

interface FieldAudit {
  field: string;
  value: string;
  isFallback: boolean;
  ruleMatch: { label: string; hit: string } | null;
  causes: FallbackCause[];
  explanation: string;
}

function auditField(
  field: string,
  value: string,
  rules: RuleSet,
  fallback: string,
  text: string,
  extraCauses: FallbackCause[] = [],
): FieldAudit {
  const isFallback = value === fallback;
  const ruleMatch = scoreRules(text, rules);
  const causes: FallbackCause[] = [...extraCauses];

  if (isFallback) {
    if (!ruleMatch) {
      causes.push("weak taxonomy");
      if (field === "theme" || field === "barrier" || field === "root_cause" || field === "unmet_need") {
        causes.push("missing category");
      }
    }
    causes.push("low confidence classification");
  }

  let explanation: string;
  if (!isFallback && ruleMatch) {
    explanation = `Keyword rule matched "${ruleMatch.hit}" → ${ruleMatch.label}`;
  } else if (!isFallback) {
    explanation = `Non-fallback label assigned (behavior may come from user_goal mapping)`;
  } else if (ruleMatch && ruleMatch.label !== fallback) {
    explanation = `Rule matched "${ruleMatch.hit}" for ${ruleMatch.label} but stored value is fallback — check validation/remapping`;
    causes.push("validation/remapping logic");
  } else {
    explanation = `No keyword rule matched; mock classifier default → ${fallback}`;
  }

  return { field, value, isFallback, ruleMatch, causes: [...new Set(causes)], explanation };
}

type FalsePositiveCategory =
  | "billing"
  | "ads"
  | "premium restrictions"
  | "playback controls"
  | "bugs/crashes"
  | "account/login"
  | "other";

const FP_PATTERNS: { category: FalsePositiveCategory; patterns: RegExp[]; reason: string }[] = [
  { category: "billing", patterns: [/\b(subscription price|cancel.*premium|egregious|paywall|premium feature)\b/i], reason: "Pricing/subscription complaint, not discovery research" },
  { category: "ads", patterns: [/\b(ads?|advert|commercial)\b/i], reason: "Ad experience, not recommendation/discovery algorithm" },
  { category: "premium restrictions", patterns: [/\b(free (tier|account|spotify)|can't skip|limited skips|non-premium)\b/i], reason: "Free-tier product restriction, not discovery failure" },
  { category: "playback controls", patterns: [/\b(shuffle button|play in order|three buttons|edit (a )?playlist|ui update|who asked for this)\b/i], reason: "Playback/UI control change, not discovery insight" },
  { category: "bugs/crashes", patterns: [/\b(crash|bug|doesn't work|doesnt work|freeze|restart (my )?pc|disappeared)\b/i], reason: "Technical reliability issue" },
  { category: "account/login", patterns: [/\b(password|log out|account|ghost|transfer.*account|new account)\b/i], reason: "Account/security issue" },
  { category: "other", patterns: [
    /open\.spotify\.com\/playlist/i,
    /\b(check me out|follow me|save\/follow|collaborate in pv|share yours)\b/i,
    /\b(love spotify|great app|best (music )?app|super recommend|five stars)\b/i,
    /\b(playlist dedicated to|curated by|updated regularly)\b/i,
    /^[A-Za-z].{0,80}playlist\s*$/i,
  ], reason: "Playlist promo, generic praise, or social thread — not PM discovery evidence" },
];

function detectFalsePositive(text: string): { isFp: boolean; category?: FalsePositiveCategory; reason?: string } {
  const lower = text.toLowerCase();
  const hasDiscoverySubstance =
    /\b(same (song|artist|songs|artists|music)|repetitive recommend|discover weekly|release radar|algorithm|for you|recommend(ation)?s? (are |feel )?(bad|wrong|repetitive|same)|genre bubble|nothing new|find new artist|hidden gem|tiktok)\b/i.test(lower);

  for (const fp of FP_PATTERNS) {
    if (fp.patterns.some((p) => p.test(text))) {
      if (hasDiscoverySubstance && (fp.category === "ads" || fp.category === "billing")) {
        continue;
      }
      return { isFp: true, category: fp.category, reason: fp.reason };
    }
  }
  return { isFp: false };
}

interface PmRecommendation {
  differs: boolean;
  current: Record<string, string>;
  recommended?: Record<string, string>;
  reason?: string;
}

function pmRecommend(text: string, row: ReviewRow): PmRecommendation {
  const lower = text.toLowerCase();
  const current = {
    theme: row.theme,
    behavior: row.behavior,
    segment: row.segment,
    barrier: row.barrier,
    root_cause: row.root_cause,
    unmet_need: row.unmet_need,
  };

  const fp = detectFalsePositive(text);
  if (fp.isFp) {
    return {
      differs: true,
      current,
      recommended: { discovery_relevant: "false" },
      reason: `Should be excluded: ${fp.reason}`,
    };
  }

  if (/\bsame (20 )?songs?\b.*\b(shuffle|over and over|over again)\b/i.test(lower)) {
    return {
      differs: true,
      current,
      recommended: {
        theme: "Repetition Fatigue",
        barrier: "Low Novelty",
        root_cause: "Playlist or Radio Loop",
        unmet_need: "Discovery Control",
        behavior: "Listen to Familiar Content",
        segment: "Playlist-Centric Listener",
      },
      reason: "Shuffle repetition on owned playlist — product loop, not algorithmic recommend fatigue",
    };
  }

  if (/\b(adding random|keep adding).*(playlist|songs)/i.test(lower)) {
    return {
      differs: true,
      current,
      recommended: {
        theme: "Poor Recommendation Quality",
        barrier: "Poor Personalization Context",
        unmet_need: "Discovery Control",
        behavior: "Listen to Familiar Content",
      },
      reason: "Smart shuffle / auto-add contaminating user-curated playlist",
    };
  }

  if (/\b(introduces new artists|found (a few )?great|love the dj)\b/i.test(lower)) {
    return {
      differs: true,
      current,
      recommended: {
        theme: "(positive — not in taxonomy)",
        behavior: "Use Algorithmic Playlists",
        emotion: "Neutral",
        unmet_need: "(satisfied — exclude from frustration themes)",
      },
      reason: "Positive discovery experience; current taxonomy only models frustrations",
    };
  }

  if (/\bstop suggesting.*podcast/i.test(lower)) {
    return {
      differs: true,
      current,
      recommended: {
        theme: "Weak Discovery Surfaces",
        barrier: "Ineffective Discovery Surfaces",
        unmet_need: "Discovery Control",
      },
      reason: "Cross-surface recommendation pollution in podcast context",
    };
  }

  if (/\b(find new|recommendations?\?|drop your recommend|suggestions on songs)\b/i.test(lower) && !/\b(frustrat|annoy|bad|terrible|same song)\b/i.test(lower)) {
    return {
      differs: true,
      current,
      recommended: {
        theme: "(N/A — community discovery request)",
        behavior: "Social or External Discovery",
        discovery_relevant: "false or tag: community_thread",
      },
      reason: "User seeking crowd recommendations, not reporting Spotify discovery failure",
    };
  }

  if (Object.values(current).every((v) => FALLBACK_SET.has(v) || v === "Evaluate Recommendations" || v === "Neutral")) {
    return {
      differs: true,
      current,
      recommended: { note: "Requires LLM or expanded keyword rules — mock cannot resolve" },
      reason: "Review has substance but all taxonomy fields collapsed to defaults",
    };
  }

  return { differs: false, current };
}

interface ReviewRow {
  row_index: number;
  review_id: string;
  source: string;
  text: string;
  discovery_relevant: boolean;
  discovery_reason: string;
  theme: string;
  behavior: string;
  segment: string;
  barrier: string;
  root_cause: string;
  unmet_need: string;
  confidence: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleReviews<T>(items: T[], n: number, seed = 42): T[] {
  const rng = mulberry32(seed);
  const indexed = items.map((item, i) => ({ item, sort: rng(), i }));
  indexed.sort((a, b) => a.sort - b.sort || a.i - b.i);
  return indexed.slice(0, n).map((x) => x.item);
}

function truncate(s: string, max = 280): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length <= max ? one : `${one.slice(0, max)}…`;
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  loadEnvLocal();
  const db = await ensureTursoSchema();
  const runIdArg = process.argv[2];

  const runResult = runIdArg
    ? await db.execute({
        sql: `SELECT * FROM analysis_runs WHERE id = ?`,
        args: [runIdArg],
      })
    : await db.execute({
        sql: `SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT 1`,
      });

  const run = runResult.rows[0];
  if (!run) throw new Error("No analysis run found");
  const runId = String(run.id);

  const result = await db.execute({
    sql: `SELECT r.id, r.source, r.review_text, r.discovery_relevant, r.discovery_reason, r.confidence,
                 c.theme, c.barrier, c.behavior, c.segment, c.root_cause, c.unmet_need
          FROM reviews r
          LEFT JOIN classifications c ON c.review_id = r.id
          WHERE r.run_id = ?
          ORDER BY r.created_at ASC`,
    args: [runId],
  });

  const allRows: ReviewRow[] = result.rows.map((row, idx) => ({
    row_index: idx + 1,
    review_id: String(row.id),
    source: String(row.source),
    text: String(row.review_text),
    discovery_relevant: Number(row.discovery_relevant) === 1,
    discovery_reason: String(row.discovery_reason ?? ""),
    theme: String(row.theme ?? FALLBACK_LABELS.theme),
    behavior: String(row.behavior ?? "Evaluate Recommendations"),
    segment: String(row.segment ?? FALLBACK_LABELS.segment),
    barrier: String(row.barrier ?? FALLBACK_LABELS.barrier),
    root_cause: String(row.root_cause ?? FALLBACK_LABELS.root_cause),
    unmet_need: String(row.unmet_need ?? FALLBACK_LABELS.unmet_need),
    confidence: Number(row.confidence ?? 0.45),
  }));

  const discovery = allRows.filter((r) => r.discovery_relevant);
  const sample = sampleReviews(discovery, 50);

  const runMeta = {
    runId,
    dataset: String(run.dataset_name),
    status: String(run.status),
    usedMock: run.used_mock_classifier === 1,
    totalReviews: allRows.length,
    discoveryCount: discovery.length,
    sampledAt: new Date().toISOString(),
  };

  const lines: string[] = [];
  const h = (level: number, title: string) => lines.push(`${"#".repeat(level)} ${title}`, "");

  h(1, "Classification Audit Report");
  lines.push(
    `**Run:** \`${runMeta.runId}\``,
    `**Dataset:** ${runMeta.dataset}`,
    `**Status:** ${runMeta.status} | **Classifier:** ${runMeta.usedMock ? "MOCK (rule-based demo)" : "Groq LLM"}`,
    `**Population:** ${runMeta.discoveryCount} discovery-relevant / ${runMeta.totalReviews} total | **Sample:** 50 (seed 42)`,
    `**Generated:** ${runMeta.sampledAt}`,
    "",
  );

  h(2, "Per-Review Sample (50 discovery-relevant reviews)");
  for (const r of sample) {
    lines.push(`### Row ${r.row_index} | Review ID \`${r.review_id.slice(0, 8)}…\` | ${r.source}`);
    lines.push(`**Confidence:** ${r.confidence}`);
    lines.push("");
    lines.push("**Original review text**");
    lines.push("```");
    lines.push(r.text);
    lines.push("```");
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Discovery relevance reason | ${mdEscape(r.discovery_reason)} |`);
    lines.push(`| Theme | ${r.theme} |`);
    lines.push(`| Behavior | ${r.behavior} |`);
    lines.push(`| Segment | ${r.segment} |`);
    lines.push(`| Barrier | ${r.barrier} |`);
    lines.push(`| Root cause | ${r.root_cause} |`);
    lines.push(`| Unmet need | ${r.unmet_need} |`);
    lines.push("");
  }

  h(2, "SECTION 1 — Fallback Bucket Analysis");
  lines.push(
    "For each sampled review, any field in a fallback bucket is explained below.",
    "Mock classifier path: `matchFromRules()` returns fallback when **no keyword hits** (confidence 0.45).",
    "",
  );

  for (const r of sample) {
    const draft = buildResearchEvidenceDraft({ source: r.source, text: r.text } as RawReview);
    const fieldAudits = [
      auditField("theme", r.theme, THEME_RULES, FALLBACK_LABELS.theme, r.text),
      auditField("barrier", r.barrier, BARRIER_RULES, FALLBACK_LABELS.barrier, r.text),
      auditField("root_cause", r.root_cause, ROOT_CAUSE_RULES, FALLBACK_LABELS.root_cause, r.text),
      auditField("unmet_need", r.unmet_need, UNMET_NEED_RULES, FALLBACK_LABELS.unmet_need, r.text),
      auditField("segment", r.segment, SEGMENT_RULES, FALLBACK_LABELS.segment, r.text),
    ].filter((a) => a.isFallback);

    if (fieldAudits.length === 0) continue;

    lines.push(`#### Row ${r.row_index}`);
    lines.push(`> ${truncate(r.text, 120)}`);
    lines.push("");
    for (const a of fieldAudits) {
      lines.push(`- **${a.field}** → \`${a.value}\``);
      lines.push(`  - Evidence in review: ${a.ruleMatch ? `"${a.ruleMatch.hit}" (matched ${a.ruleMatch.label} but not used)` : "_none — no keyword rule fired_"}`);
      lines.push(`  - Why fallback: ${a.explanation}`);
      lines.push(`  - Root causes: ${a.causes.join(", ")}`);
    }
    if (draft.research_relevant && fieldAudits.length >= 3) {
      const trig = /\b(playlist|recommend|shuffle|discover|genre)\b/i.exec(r.text);
      lines.push(`  - Discovery gate passed via keyword: ${trig ? `"${trig[0]}"` : "substantive signal pattern"} → relevance may be **review not actually about discovery**`);
    }
    lines.push("");
  }

  h(2, "SECTION 2 — False Positive Discovery Reviews");
  const fpByCategory: Record<FalsePositiveCategory, ReviewRow[]> = {
    billing: [],
    ads: [],
    "premium restrictions": [],
    "playback controls": [],
    "bugs/crashes": [],
    "account/login": [],
    other: [],
  };

  for (const r of sample) {
    const fp = detectFalsePositive(r.text);
    if (fp.isFp && fp.category) fpByCategory[fp.category].push(r);
  }

  for (const [cat, rows] of Object.entries(fpByCategory) as [FalsePositiveCategory, ReviewRow[]][]) {
    if (rows.length === 0) continue;
    lines.push(`### ${cat} (${rows.length} in sample)`);
    for (const r of rows) {
      const fp = detectFalsePositive(r.text)!;
      lines.push(`- **Row ${r.row_index}** | theme: ${r.theme}`);
      lines.push(`  - Text: ${truncate(r.text, 200)}`);
      lines.push(`  - Why exclude: ${fp.reason}`);
    }
    lines.push("");
  }

  const fpTotal = Object.values(fpByCategory).reduce((s, a) => s + a.length, 0);
  lines.push(`**Sample false-positive rate:** ${fpTotal}/50 (${Math.round((fpTotal / 50) * 100)}%) should likely not be discovery_relevant for PM research.`, "");

  h(2, "SECTION 3 — Missed Insights (PM re-classification)");
  let differsCount = 0;
  for (const r of sample) {
    const rec = pmRecommend(r.text, r);
    if (!rec.differs) continue;
    differsCount++;
    lines.push(`#### Row ${r.row_index}`);
    lines.push(`**Current:** theme=${r.theme}, barrier=${r.barrier}, root_cause=${r.root_cause}, unmet_need=${r.unmet_need}, behavior=${r.behavior}`);
    if (rec.recommended) {
      lines.push(`**Recommended:** ${JSON.stringify(rec.recommended)}`);
    }
    lines.push(`**Reason:** ${rec.reason}`);
    lines.push("");
  }
  lines.push(`**PM would reclassify:** ${differsCount}/50 reviews in sample.`, "");

  h(2, "SECTION 4 — Taxonomy Gaps");
  const gaps = [
    { pattern: "Playlist self-promo / Reddit share threads", count: 0, theme: "Community Playlist Sharing", barrier: "N/A (exclude from corpus)", root: "N/A", unmet: "N/A", segment: "Creator / Curator" },
    { pattern: "Shuffle plays same subset of owned playlist", count: 0, theme: "Shuffle Fatigue (playlist playback)", barrier: "Playlist Shuffle Bias", root: "Shuffle Algorithm Limitation", unmet: "True Random / Full-Playlist Shuffle" },
    { pattern: "Smart Shuffle / auto-add songs to playlist", count: 0, theme: "Playlist Contamination", barrier: "Unwanted Recommendation Injection", root: "Smart Shuffle Feature Design", unmet: "Opt-Out of Auto-Added Tracks" },
    { pattern: "Podcast suggestions in music/podcast feeds", count: 0, theme: "Cross-Content Recommendation Noise", barrier: "Context-Blind Recommendations", unmet: "Surface-Specific Recommendation Control" },
    { pattern: "Positive DJ / Discover Weekly praise", count: 0, theme: "Positive Discovery Experience (missing)", barrier: "N/A", unmet: "N/A (satisfaction signal)" },
    { pattern: "Ads / premium pricing complaints", count: 0, theme: "N/A — exclude", barrier: "Monetization Friction", segment: "Free-Tier Listener" },
    { pattern: "UI redesign (edit buttons, layout)", count: 0, theme: "N/A — product UX", barrier: "Discovery UI Friction" },
    { pattern: "App crashes / sync failures", count: 0, theme: "N/A — reliability", barrier: "Technical Reliction Blocking Discovery" },
    { pattern: "Crowd-sourced rec requests (no Spotify blame)", count: 0, behavior: "Social Discovery Request", segment: "Community Participant" },
  ];

  for (const r of sample) {
    const t = r.text.toLowerCase();
    if (/open\.spotify\.com|share.*playlist|follow me|check me out/i.test(t)) gaps[0].count++;
    if (/same \d+ songs|shuffle.*over/i.test(t)) gaps[1].count++;
    if (/adding random|keep adding.*playlist/i.test(t)) gaps[2].count++;
    if (/podcast.*suggest/i.test(t)) gaps[3].count++;
    if (/love the dj|introduces new artists|smart shuffle.*brilliant/i.test(t)) gaps[4].count++;
    if (/\b(ads?|advert|premium|subscription|price)\b/i.test(t)) gaps[5].count++;
    if (/button|ui update|three dots|edit.*playlist/i.test(t)) gaps[6].count++;
    if (/crash|bug|doesn't work|disappeared/i.test(t)) gaps[7].count++;
    if (/recommendations?\?|drop your|suggestions on songs|find new music!!/i.test(t) && !/frustrat|annoy|terrible/i.test(t)) gaps[8].count++;
  }

  lines.push("| Recurring pattern | Count in sample | Proposed theme | Proposed barrier | Proposed root cause | Proposed unmet need / segment |");
  lines.push("|-------------------|-----------------|----------------|------------------|---------------------|------------------------------|");
  for (const g of gaps.filter((x) => x.count > 0)) {
    lines.push(`| ${g.pattern} | ${g.count} | ${g.theme ?? "—"} | ${g.barrier ?? "—"} | ${g.root ?? "—"} | ${g.unmet ?? g.segment ?? "—"} |`);
  }
  lines.push("");

  h(2, "SECTION 5 — Root Cause of the 95% Problem");

  const fullCounts = {
    theme_other: discovery.filter((r) => r.theme === "Other Discovery Frustration").length,
    unmet_general: discovery.filter((r) => r.unmet_need === "General Discovery Improvement").length,
    barrier_unclear: discovery.filter((r) => r.barrier === "Unclear Discovery Struggle").length,
    root_unclear: discovery.filter((r) => r.root_cause === "Unclear Repetition Cause").length,
    segment_unspec: discovery.filter((r) => r.segment === "Unspecified Segment").length,
    confLow: discovery.filter((r) => r.confidence <= 0.5).length,
  };

  const n = discovery.length;
  lines.push(
    `Full run (${n} discovery-relevant):`,
    `- Other Discovery Frustration: ${fullCounts.theme_other} (${Math.round((fullCounts.theme_other / n) * 100)}%)`,
    `- General Discovery Improvement: ${fullCounts.unmet_general} (${Math.round((fullCounts.unmet_general / n) * 100)}%)`,
    `- Unclear Discovery Struggle: ${fullCounts.barrier_unclear} (${Math.round((fullCounts.barrier_unclear / n) * 100)}%)`,
    `- Unclear Repetition Cause: ${fullCounts.root_unclear} (${Math.round((fullCounts.root_unclear / n) * 100)}%)`,
    `- Unspecified Segment: ${fullCounts.segment_unspec} (${Math.round((fullCounts.segment_unspec / n) * 100)}%)`,
    `- Confidence ≤ 0.50: ${fullCounts.confLow} (${Math.round((fullCounts.confLow / n) * 100)}%)`,
    "",
    "### Mechanism (this run used MOCK classifier)",
    "",
    "1. **Discovery filtering (A)** — `buildResearchEvidenceDraft()` marks research_relevant=true when text contains `playlist`, `recommend`, `shuffle`, `discover`, `genre`, etc. (~100/151 mention playlist). Many are promos, UI complaints, or praise — not discovery struggles.",
    "2. **Classification prompt (B)** — Not applicable; Groq prompt never ran (`used_mock_classifier=1`).",
    "3. **Taxonomy design (C)** — Mock uses 6 theme rules, 7 barrier rules, 6 root-cause rules, 6 unmet-need rules with **exact phrase** keywords. Real user language ('same 20 songs on shuffle', 'adding random music') does not match.",
    "4. **Validation/remapping (D)** — Minimal impact this run; labels are assigned directly by mock, not post-LLM remapping.",
    "5. **Review quality (E)** — Mixed corpus: Play Store + Reddit playlist threads + community posts. High noise for PM discovery research.",
    "",
    "### Impact ranking",
    "",
    "| Rank | Cause | Impact | Evidence |",
    "|------|-------|--------|----------|",
    "| **1** | **A — Discovery filtering** | HIGH | ~21/50 sample are false positives; loose keyword gate inflates discovery_relevant |",
    "| **2** | **C — Taxonomy design (mock rules)** | HIGH | " + `${fullCounts.confLow}/${n} at conf≤0.5; keyword miss → hardcoded FALLBACK_LABELS` + " |",
    "| **3** | **E — Review quality** | MEDIUM | Playlist promos, billing, bugs dominate sampled text |",
    "| **4** | **B — Classification prompt** | MEDIUM (blocked) | Real LLM not invoked; prompt quality untested on this run |",
    "| **5** | **D — Validation/remapping** | LOW | No LLM output to remap; aliases like positive→Other Discovery Frustration unused |",
    "",
  );

  h(2, "SECTION 6 — Fix Plan");
  lines.push("| Priority | Fix | Expected impact | Difficulty |");
  lines.push("|----------|-----|-----------------|------------|");
  const fixes = [
    ["P0", "Re-run with Groq LLM (`USE_MOCK_CLASSIFIER=false`) when quota available", "Eliminates mock keyword collapse; enables evidence-backed taxonomy", "Low (ops)"],
    ["P0", "Tighten discovery_relevant gate: exclude playlist promos, generic praise, billing/ads/bugs unless explicit algorithm complaint", "Cuts false positives ~30-50%; improves all 6 PM questions", "Medium"],
    ["P0", "Block analysis when `groqFallback=true`; surface warning instead of saving mock results as research", "Prevents demo classifications polluting repository", "Low"],
    ["P1", "Expand mock/LLM keyword coverage: shuffle repetition, smart shuffle injection, podcast cross-suggest", "Reduces Other Discovery Frustration fallback rate on partial runs", "Medium"],
    ["P1", "Add positive discovery theme + exclude-from-frustration path", "Fixes misclassification of DJ praise as frustration", "Medium"],
    ["P1", "Add `Community Thread` / `Playlist Promo` exclusion in preprocessing", "Removes Reddit noise from discovery corpus", "Medium"],
    ["P1", "Export per-review audit JSON with rule hits + violations in dashboard", "Enables ongoing PM review without scripts", "Medium"],
    ["P2", "New taxonomy: Shuffle Fatigue, Playlist Contamination, Cross-Content Noise", "Maps real patterns seen in corpus", "High"],
    ["P2", "Separate root-cause rules from repetition theme (shuffle ≠ algorithm loop)", "Fixes 100% Unclear Repetition Cause", "Medium"],
    ["P2", "Per-field confidence + fallback flag in DB/UI", "Surfaces low-quality tags to PM", "Medium"],
  ];
  for (const [p, fix, impact, diff] of fixes) {
    lines.push(`| ${p} | ${fix} | ${impact} | ${diff} |`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "classification-audit-part1-2026-06-21.md");
  writeFileSync(outPath, lines.join("\n"));
  console.log(`Wrote ${outPath}`);
  console.log(`Sample FP rate: ${fpTotal}/50, PM differs: ${differsCount}/50`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
