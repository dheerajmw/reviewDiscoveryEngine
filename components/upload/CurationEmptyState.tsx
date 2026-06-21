"use client";

import { useEffect, useRef, useState } from "react";
import type { CurationStats } from "@/lib/types";
import Icon from "@/components/ui/Icon";
import CurationSummary from "./CurationSummary";

const AUTO_RETURN_SECONDS = 15;

interface CurationEmptyStateProps {
  stats: CurationStats;
  fileName?: string | null;
  onReturn: () => void;
}

export default function CurationEmptyState({
  stats,
  fileName,
  onReturn,
}: CurationEmptyStateProps) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETURN_SECONDS);
  const onReturnRef = useRef(onReturn);

  useEffect(() => {
    onReturnRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReturnRef.current();
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-start gap-3 rounded-xl border border-warning-container bg-warning-container px-4 py-4 text-on-warning-container">
        <Icon name="info" className="mt-0.5 shrink-0 text-lg" />
        <div>
          <p className="text-sm font-semibold">
            No discovery or recommendation reviews found
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Cleanup finished, but none of the loaded reviews discuss music
            discovery, recommendations, playlists, or algorithm behavior. This
            app only analyzes that topic — billing, login, crash, and generic
            praise reviews are removed. Select a larger set of reviews so more
            discovery-related posts are likely to remain after cleanup.
          </p>
          {fileName && (
            <p className="mt-2 text-xs opacity-90">
              Dataset: <span className="font-medium">{fileName}</span>
            </p>
          )}
        </div>
      </div>

      <CurationSummary stats={stats} />

      <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        <p className="font-medium text-on-surface">What to try next</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
          <li>
            Increase the review limit per source or fetch from more sources —
            a larger set improves the chance that discovery-related reviews
            survive cleanup
          </li>
          <li>
            Use a corpus with more Reddit or community posts (more
            discovery/recommendation language)
          </li>
          <li>
            Try the bundled samples such as{" "}
            <code className="font-mono">sample100.csv</code> or{" "}
            <code className="font-mono">all-reviews.csv</code>
          </li>
          <li>
            When live-fetching, include Reddit or broaden search terms toward
            recommendations and discovery
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-on-surface-variant">
          Returning to upload in{" "}
          <span className="font-medium text-on-surface">{secondsLeft}s</span>
        </p>
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          <Icon name="upload_file" className="text-base" />
          Choose another dataset
        </button>
      </div>
    </div>
  );
}
