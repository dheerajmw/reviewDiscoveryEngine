"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { estimateGroqClassification } from "@/lib/classify-client";
import { GROQ_RATE_LIMITS } from "@/lib/groq-limits";
import { persistQueuedBatches } from "@/lib/runs-client";
import {
  buildSplitDatasetName,
  getSplitOptions,
  splitReviews,
} from "@/lib/review-split";
import type { CurationStats, RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface QuotaSplitPanelProps {
  reviews: RawReview[];
  curationStats: CurationStats;
  loadedFileName: string | null;
  onSaved?: (runIds: string[]) => void;
  onError?: (message: string) => void;
}

export default function QuotaSplitPanel({
  reviews,
  curationStats,
  loadedFileName,
  onSaved,
  onError,
}: QuotaSplitPanelProps) {
  const estimate = estimateGroqClassification(reviews.length);
  const splitOptions = useMemo(() => getSplitOptions(reviews.length), [reviews.length]);
  const recommendedParts =
    splitOptions.find((option) => option.allWithinQuota)?.parts ??
    splitOptions[splitOptions.length - 1]?.parts ??
    2;

  const [selectedParts, setSelectedParts] = useState(recommendedParts);
  const [saving, setSaving] = useState(false);
  const [savedRunIds, setSavedRunIds] = useState<string[] | null>(null);

  const selectedOption =
    splitOptions.find((option) => option.parts === selectedParts) ??
    splitOptions[0];

  const handleSave = async () => {
    setSaving(true);

    try {
      const chunks = splitReviews(reviews, selectedParts);
      const baseName =
        loadedFileName ?? `Analysis ${new Date().toLocaleDateString()}`;
      const batches = chunks.map((chunk, index) => ({
        datasetName: buildSplitDatasetName(baseName, index + 1, chunks.length),
        reviews: chunk,
      }));

      const runIds = await persistQueuedBatches({
        batches,
        curation: curationStats,
      });
      setSavedRunIds(runIds);
      onSaved?.(runIds);
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : "Failed to save split batches to repository.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (savedRunIds) {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-on-surface"
      >
        <div className="flex items-start gap-2">
          <Icon name="check_circle" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-on-surface">
              Saved {savedRunIds.length} batches to Research Repository
            </p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Each part is queued as a pending run. Analyze one part per day from
              the repository to stay within the Groq free-tier limit.
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
    <div
      role="region"
      aria-label="Split reviews for daily LLM limit"
      className="rounded-lg border border-warning-container bg-warning-container px-4 py-4 text-sm text-on-warning-container"
    >
      <div className="flex items-start gap-2">
        <Icon name="warning" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Exceeds Groq free-tier daily limit</p>
          <p className="mt-1 text-xs leading-relaxed">
            {reviews.length.toLocaleString()} reviews needs ~
            {estimate.estimatedTokens.toLocaleString()} tokens/day (limit{" "}
            {GROQ_RATE_LIMITS.tokensPerDay.toLocaleString()}). Split into smaller
            batches and save each part to the repository — analyze one part per
            day.
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide">
            Split into
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {splitOptions.map((option) => {
              const active = option.parts === selectedParts;
              return (
                <button
                  key={option.parts}
                  type="button"
                  disabled={saving}
                  onClick={() => setSelectedParts(option.parts)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant/80 bg-surface-container-lowest text-on-surface hover:border-primary/40"
                  }`}
                >
                  {option.parts} parts
                  {option.allWithinQuota ? (
                    <Icon name="check" className="text-sm" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedOption ? (
            <ul className="mt-3 space-y-1.5 text-xs">
              {selectedOption.chunkSizes.map((size, index) => {
                const partEstimate = selectedOption.estimates[index];
                const within = !partEstimate.exceedsDailyTokenQuota;
                return (
                  <li
                    key={`part-${index + 1}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-container-lowest/80 px-2.5 py-1.5 text-on-surface"
                  >
                    <span>
                      Part {index + 1}:{" "}
                      <span className="font-medium">{size} reviews</span>
                    </span>
                    <span className={within ? "text-primary" : "text-error"}>
                      ~{partEstimate.estimatedTokens.toLocaleString()} tokens
                      {within ? " · within limit" : " · over limit"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                Saving {selectedParts} parts…
              </>
            ) : (
              <>
                <Icon name="library_add" />
                Save {selectedParts} parts to Repository
              </>
            )}
          </button>

          <p className="mt-2 text-[11px] leading-relaxed opacity-90">
            Alternatively: enable{" "}
            <code className="font-mono">USE_MOCK_CLASSIFIER=true</code> for demo
            mode without Groq tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
