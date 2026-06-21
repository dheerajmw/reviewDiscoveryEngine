import type {
  AnalysisRunSummary,
  AnalysisBundle,
  ClassifiedReview,
  CurationStats,
  QuoteRecord,
  QuoteSearchFilters,
  RunComparisonResult,
  StoredAnalysisRun,
} from "./types";

export async function fetchAnalysisRuns(): Promise<AnalysisRunSummary[]> {
  const response = await fetch("/api/runs");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load analysis history.");
  }
  return data.runs as AnalysisRunSummary[];
}

export async function persistAnalysisRun(input: {
  datasetName: string;
  classified: ClassifiedReview[];
  analysis: AnalysisBundle;
  usedMockClassifier: boolean;
  curation?: CurationStats;
}): Promise<string> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to persist analysis run.");
  }
  return data.runId as string;
}

export async function fetchAnalysisRun(runId: string): Promise<StoredAnalysisRun> {
  const response = await fetch(`/api/runs/${runId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load analysis run.");
  }
  return data as StoredAnalysisRun;
}

export async function compareRuns(
  runIdA: string,
  runIdB: string,
): Promise<RunComparisonResult> {
  const response = await fetch(
    `/api/runs/compare?a=${encodeURIComponent(runIdA)}&b=${encodeURIComponent(runIdB)}`,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to compare runs.");
  }
  return data as RunComparisonResult;
}

export async function searchQuotes(
  runId: string,
  filters: QuoteSearchFilters,
): Promise<{
  quotes: QuoteRecord[];
  filterOptions: {
    themes: string[];
    segments: string[];
    rootCauses: string[];
    unmetNeeds: string[];
    barriers: string[];
  };
}> {
  const params = new URLSearchParams({ runId });
  if (filters.theme) params.set("theme", filters.theme);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.root_cause) params.set("root_cause", filters.root_cause);
  if (filters.unmet_need) params.set("unmet_need", filters.unmet_need);
  if (filters.barrier) params.set("barrier", filters.barrier);
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`/api/quotes?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to search quotes.");
  }
  return data;
}
