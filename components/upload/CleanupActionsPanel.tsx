"use client";

import { useState } from "react";
import Link from "next/link";
import { MIN_PARTIAL_ANALYSIS_REVIEWS } from "@/lib/classify-cache-client";
import { persistQueuedBatches } from "@/lib/runs-client";
import type { CurationStats, RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface CleanupActionsPanelProps {
  reviews: RawReview[];
  curationStats: CurationStats;
  loadedFileName: string | null;
  cachedCount: number | null;
  analysisInterrupted?: boolean;
  busy?: boolean;
  onProceedPartial: () => void;
  onError?: (message: string) => void;
}

export default function CleanupActionsPanel({
  reviews,
  curationStats,
  loadedFileName,
  cachedCount,
  analysisInterrupted = false,
  busy = false,
  onProceedPartial,
  onError,
}: CleanupActionsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);

  const canProceedPartial =
    cachedCount != null && cachedCount >= MIN_PARTIAL_ANALYSIS_REVIEWS;

  const proceedLabel =
    cachedCount != null && cachedCount < reviews.length
      ? `Proceed with ${cachedCount.toLocaleString()} classified`
      : `Build dashboard from cache (${cachedCount?.toLocaleString() ?? 0})`;

  const handleSaveForLater = async () => {
    setSaving(true);
    try {
      const datasetName =
        loadedFileName ?? `Analysis ${new Date().toLocaleDateString()}`;
      const runIds = await persistQueuedBatches({
        batches: [{ datasetName, reviews }],
        curation: curationStats,
      });
      setSavedRunId(runIds[0] ?? null);
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : "Failed to save reviews to repository.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (savedRunId) {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-on-surface"
      >
        <div className="flex items-start gap-2">
          <Icon name="check_circle" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-on-surface">
              Saved to Research Repository for later analysis
            </p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Open the repository and run Analyze when you have LLM quota
              available. Classifications already in cache will skip the API.
            </p>
            <Link
              href="/history"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Open Research Repository
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-4">
      <div className="flex items-start gap-2">
        <Icon name="tune" className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-on-surface">Analysis options</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Save this batch to analyze later, or continue with reviews already
            classified if a run was interrupted.
          </p>
          {cachedCount != null && cachedCount > 0 ? (
            <p className="mt-2 text-xs text-on-surface">
              <span className="font-medium text-primary">
                {cachedCount.toLocaleString()}
              </span>{" "}
              of {reviews.length.toLocaleString()} reviews already classified in
              cache
              {analysisInterrupted ? " from the interrupted run" : ""}.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy || saving}
          onClick={() => void handleSaveForLater()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Saving…
            </>
          ) : (
            <>
              <Icon name="library_add" />
              Save for later
            </>
          )}
        </button>

        {canProceedPartial ? (
          <button
            type="button"
            disabled={busy || saving}
            onClick={onProceedPartial}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-secondary bg-secondary-container px-4 py-3 text-sm font-semibold text-on-secondary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="partial_coverage" />
            {proceedLabel}
          </button>
        ) : null}
      </div>

      {analysisInterrupted &&
      cachedCount != null &&
      cachedCount > 0 &&
      cachedCount < MIN_PARTIAL_ANALYSIS_REVIEWS ? (
        <p className="text-xs text-on-surface-variant">
          At least {MIN_PARTIAL_ANALYSIS_REVIEWS} cached classifications are
          needed for a partial dashboard. Retry Analyze or save for later.
        </p>
      ) : null}
    </div>
  );
}
