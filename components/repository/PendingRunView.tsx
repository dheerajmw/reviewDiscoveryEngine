"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAggregation } from "@/lib/aggregate-client";
import { classifyAllReviews } from "@/lib/classify-client";
import { fetchFindings } from "@/lib/findings-client";
import { completeQueuedAnalysisRun } from "@/lib/runs-client";
import type { AnalysisRunSummary, RawReview } from "@/lib/types";
import RepositoryLayout from "@/components/layout/RepositoryLayout";
import LoadingState from "@/components/ui/LoadingState";
import Icon from "@/components/ui/Icon";

interface PendingRunViewProps {
  runId: string;
  runMeta: AnalysisRunSummary;
  reviews: RawReview[];
}

export default function PendingRunView({
  runId,
  runMeta,
  reviews,
}: PendingRunViewProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setProgress({ completed: 0, total: reviews.length });

    try {
      const { classified, mock: usedMockClassifier } = await classifyAllReviews(
        reviews,
        (completed, total) => setProgress({ completed, total }),
      );
      const aggregation = await fetchAggregation(classified);
      const findings = await fetchFindings(aggregation);

      await completeQueuedAnalysisRun({
        runId,
        classified,
        analysis: { aggregation, findings },
        usedMockClassifier,
        curation: {
          total_loaded: runMeta.total_reviews,
          included: reviews.length,
          excluded: runMeta.excluded_reviews,
          duplicates_removed: 0,
          borderline_reviewed: 0,
          by_reason: {},
        },
      });

      router.refresh();
      router.push(`/runs/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setAnalyzing(false);
    }
  };

  return (
    <RepositoryLayout
      active="dashboard"
      title={runMeta.dataset_name}
      subtitle="Queued for analysis"
      runId={runId}
    >
      {analyzing ? (
        <LoadingState
          step="classifying"
          completed={progress.completed}
          total={progress.total}
          curationNote={`Analyzing ${runMeta.dataset_name}`}
          curationComplete
        />
      ) : (
        <div className="mx-auto max-w-2xl rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning-container text-on-warning-container">
              <Icon name="schedule" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">
                Ready for LLM analysis
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                This batch was saved from a split dataset and is waiting in the
                repository. Run analysis when you have Groq quota available
                (typically one part per day on the free tier).
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-on-surface-variant">Reviews</dt>
              <dd className="font-semibold text-on-surface">
                {reviews.length.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">Status</dt>
              <dd className="font-semibold capitalize text-on-surface">
                {runMeta.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">Saved</dt>
              <dd className="font-semibold text-on-surface">
                {new Date(runMeta.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container"
            >
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleAnalyze()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-all hover:opacity-90"
          >
            <Icon name="analytics" />
            Analyze this batch
          </button>

          <button
            type="button"
            onClick={() => router.push("/history")}
            className="mt-3 w-full text-center text-xs font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            Back to Research Repository
          </button>
        </div>
      )}
    </RepositoryLayout>
  );
}
