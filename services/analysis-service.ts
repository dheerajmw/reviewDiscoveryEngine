import {
  boolFromDb,
  boolToDb,
  ensureTursoSchema,
  newId,
  parseJsonColumn,
  toJson,
} from "@/lib/turso";
import type {
  AggregationResult,
  AnalysisBundle,
  AnalysisRunSummary,
  ClassifiedReview,
  ResearchFindings,
  RunComparisonResult,
  RunComparisonRow,
  StoredAnalysisRun,
} from "@/lib/types";
import {
  getClassifiedReviewsForRun,
  saveRepresentativeQuotes,
  saveReviewsWithClassifications,
} from "./review-service";

async function getDb() {
  return ensureTursoSchema();
}

function mapRunRow(row: Record<string, unknown>): AnalysisRunSummary {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    dataset_name: String(row.dataset_name),
    total_reviews: Number(row.total_reviews),
    discovery_reviews: Number(row.discovery_reviews),
    excluded_reviews: Number(row.excluded_reviews),
    analysis_mode: String(row.analysis_mode),
    status: row.status as AnalysisRunSummary["status"],
    used_mock_classifier: boolFromDb(row.used_mock_classifier),
  };
}

export async function createAnalysisRun(input: {
  datasetName: string;
  totalReviews: number;
  discoveryReviews: number;
  excludedReviews: number;
  status?: AnalysisRunSummary["status"];
}): Promise<string> {
  const db = await getDb();
  const id = newId();

  await db.execute({
    sql: `INSERT INTO analysis_runs (id, dataset_name, total_reviews, discovery_reviews, excluded_reviews, analysis_mode, status)
          VALUES (?, ?, ?, ?, ?, 'single', ?)`,
    args: [
      id,
      input.datasetName,
      input.totalReviews,
      input.discoveryReviews,
      input.excludedReviews,
      input.status ?? "pending",
    ],
  });

  return id;
}

export async function updateRunStatus(
  runId: string,
  status: AnalysisRunSummary["status"],
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE analysis_runs SET status = ? WHERE id = ?`,
    args: [status, runId],
  });
}

async function insertFinding(
  runId: string,
  bundle: AnalysisBundle,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO findings (
            id, run_id, mode, executive_summary, top_frustrations, listening_behaviors,
            repetition_causes, segment_challenges, unmet_needs, aggregation_data,
            interpretation_data, research_findings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newId(),
      runId,
      "all",
      bundle.findings.why_discovery_fails,
      toJson(bundle.findings.top_frustrations),
      toJson(bundle.findings.listening_behaviors),
      toJson(bundle.findings.repetition_causes),
      toJson(bundle.findings.segment_challenges),
      toJson(bundle.findings.unmet_needs),
      toJson(bundle.aggregation),
      toJson({}),
      toJson(bundle.findings),
    ],
  });
}

export async function persistAnalysisRun(input: {
  datasetName: string;
  classified: ClassifiedReview[];
  analysis: AnalysisBundle;
  usedMockClassifier: boolean;
  curation?: AnalysisBundle["curation"];
}): Promise<string> {
  const { analysis, classified, curation } = input;
  const agg = analysis.aggregation;

  const runId = await createAnalysisRun({
    datasetName: input.datasetName,
    totalReviews: curation?.total_loaded ?? agg.totalReviews,
    discoveryReviews: classified.length,
    excludedReviews:
      (curation?.excluded ?? 0) + (curation?.duplicates_removed ?? 0) + agg.excludedCount,
    status: "classifying",
  });

  try {
    await saveReviewsWithClassifications(runId, classified);
    await updateRunStatus(runId, "aggregating");

    await insertFinding(runId, analysis);

    await saveRepresentativeQuotes(runId, classified, analysis.aggregation);

    const db = await getDb();
    await db.execute({
      sql: `UPDATE analysis_runs
            SET status = 'completed', comparison_data = ?, used_mock_classifier = ?, used_mock_insights = 0
            WHERE id = ?`,
      args: [toJson({}), boolToDb(input.usedMockClassifier), runId],
    });

    return runId;
  } catch (error) {
    await updateRunStatus(runId, "failed");
    throw error;
  }
}

export async function listAnalysisRuns(
  limit = 50,
): Promise<AnalysisRunSummary[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => mapRunRow(row as Record<string, unknown>));
}

function rowToBundle(row: Record<string, unknown>): AnalysisBundle {
  return {
    aggregation: parseJsonColumn<AggregationResult>(row.aggregation_data, {
      totalReviews: 0,
      discoveryRelevantCount: 0,
      excludedCount: 0,
      themeFrequency: {},
      behaviorFrequency: {},
      emotionFrequency: {},
      segmentBreakdown: {},
      barrierAnalysis: {},
      rootCauseFrequency: {},
      unmetNeedFrequency: {},
      sourceBreakdown: {},
      segmentThemeCrossTab: { rowLabel: "", segments: [], columns: [], matrix: {} },
      segmentBarrierCrossTab: { rowLabel: "", segments: [], columns: [], matrix: {} },
      segmentUnmetNeedCrossTab: { rowLabel: "", segments: [], columns: [], matrix: {} },
      themeEvidence: [],
      behaviorEvidence: [],
      rootCauseEvidence: [],
      unmetNeedEvidence: [],
      repetitionEvidence: [],
    }),
    findings: parseJsonColumn<ResearchFindings>(row.research_findings, {
      why_discovery_fails: String(row.executive_summary ?? ""),
      top_frustrations: parseJsonColumn<string[]>(row.top_frustrations, []),
      listening_behaviors: parseJsonColumn<string[]>(row.listening_behaviors, []),
      repetition_causes: parseJsonColumn<string[]>(row.repetition_causes, []),
      segment_challenges: parseJsonColumn<Record<string, string[]>>(
        row.segment_challenges,
        {},
      ),
      unmet_needs: parseJsonColumn<string[]>(row.unmet_needs, []),
    }),
  };
}

async function loadAnalysisForRun(runId: string): Promise<AnalysisBundle> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM findings WHERE run_id = ? ORDER BY CASE mode WHEN 'all' THEN 0 ELSE 1 END LIMIT 1`,
    args: [runId],
  });

  const row = result.rows[0];
  if (!row) throw new Error("Findings not found for run.");

  return rowToBundle(row as Record<string, unknown>);
}

export async function getAnalysisRunById(
  runId: string,
): Promise<StoredAnalysisRun> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM analysis_runs WHERE id = ?`,
    args: [runId],
  });

  const run = result.rows[0];
  if (!run) throw new Error("Run not found.");

  const [analysis, classified] = await Promise.all([
    loadAnalysisForRun(runId),
    getClassifiedReviewsForRun(runId),
  ]);

  return {
    run: mapRunRow(run as Record<string, unknown>),
    classified,
    analysis,
  };
}

function compareFrequencyMaps(
  freqA: Record<string, { count: number; pct: number }>,
  freqB: Record<string, { count: number; pct: number }>,
  topN = 10,
): RunComparisonRow[] {
  const labels = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  return [...labels]
    .map((label) => ({
      label,
      runAPct: freqA[label]?.pct ?? 0,
      runBPct: freqB[label]?.pct ?? 0,
      runACount: freqA[label]?.count ?? 0,
      runBCount: freqB[label]?.count ?? 0,
      deltaPct: (freqB[label]?.pct ?? 0) - (freqA[label]?.pct ?? 0),
    }))
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, topN);
}

export async function compareAnalysisRuns(
  runIdA: string,
  runIdB: string,
): Promise<RunComparisonResult> {
  const [storedA, storedB] = await Promise.all([
    getAnalysisRunById(runIdA),
    getAnalysisRunById(runIdB),
  ]);

  const aggA = storedA.analysis.aggregation;
  const aggB = storedB.analysis.aggregation;

  return {
    runA: storedA.run,
    runB: storedB.run,
    themes: compareFrequencyMaps(aggA.themeFrequency, aggB.themeFrequency),
    barriers: compareFrequencyMaps(aggA.barrierAnalysis, aggB.barrierAnalysis),
    segments: compareFrequencyMaps(aggA.segmentBreakdown, aggB.segmentBreakdown),
    rootCauses: compareFrequencyMaps(
      aggA.rootCauseFrequency,
      aggB.rootCauseFrequency,
    ),
    unmetNeeds: compareFrequencyMaps(
      aggA.unmetNeedFrequency,
      aggB.unmetNeedFrequency,
    ),
  };
}

export async function deleteAnalysisRun(runId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `DELETE FROM analysis_runs WHERE id = ?`,
    args: [runId],
  });
}
