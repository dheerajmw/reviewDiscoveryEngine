"use client";

import { useState } from "react";
import { CORPUS_FILES, DEFAULT_CORPUS_ID } from "@/lib/corpus-manifest";
import { loadCorpusFile } from "@/lib/corpus-client";
import type { RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface CorpusLoaderProps {
  onLoadStart?: () => void;
  onLoaded: (reviews: RawReview[], fileName: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
  variant?: "compact" | "banner";
}

export default function CorpusLoader({
  onLoadStart,
  onLoaded,
  onError,
  disabled = false,
  compact = false,
  variant,
}: CorpusLoaderProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLoad = async (fileId: string) => {
    if (disabled || loadingId) return;

    setLoadingId(fileId);
    onLoadStart?.();

    try {
      const result = await loadCorpusFile(fileId);
      onLoaded(result.reviews, result.file);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load corpus.");
    } finally {
      setLoadingId(null);
    }
  };

  const defaultFile = CORPUS_FILES.find((f) => f.id === DEFAULT_CORPUS_ID)!;
  const sourceFiles = CORPUS_FILES.filter((f) => f.id !== DEFAULT_CORPUS_ID);
  const isLoading = loadingId !== null;

  if (variant === "banner") {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={() => void handleLoad(DEFAULT_CORPUS_ID)}
          className="flex w-full items-center justify-between gap-4 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-secondary-container p-2">
              <Icon
                name="folder_open"
                className="text-xl text-on-secondary-container"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">
                Available Corpus
              </p>
              <p className="text-xs text-on-surface-variant">
                {defaultFile.reviewCount.toLocaleString()} total reviews indexed
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="-space-x-2 flex">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-container bg-primary ring-2 ring-surface"
                title="Play Store"
              >
                <Icon name="shop_two" className="text-sm text-on-primary" filled />
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-container bg-[#ff4500] ring-2 ring-surface"
                title="Reddit"
              >
                <Icon name="forum" className="text-sm text-white" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-container bg-outline-variant ring-2 ring-surface">
                <span className="text-[10px] font-bold text-on-surface">+3</span>
              </div>
            </div>
            {loadingId === DEFAULT_CORPUS_ID ? (
              <div className="ml-3 h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            ) : (
              <Icon
                name="chevron_right"
                className="ml-3 text-on-surface-variant"
              />
            )}
          </div>
        </button>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-outline-variant/60 pt-3">
          {sourceFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              disabled={disabled || isLoading}
              onClick={() => void handleLoad(file.id)}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-[10px] font-medium text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingId === file.id ? (
                <div className="h-2.5 w-2.5 animate-spin rounded-full border border-outline-variant border-t-primary" />
              ) : null}
              {file.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex h-full min-h-[88px] flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-on-surface">Saved corpus</p>
          <button
            type="button"
            disabled={disabled || isLoading}
            onClick={() => void handleLoad(DEFAULT_CORPUS_ID)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingId === DEFAULT_CORPUS_ID ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <Icon name="dataset" className="text-xs" />
            )}
            All ({defaultFile.reviewCount.toLocaleString()})
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sourceFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              disabled={disabled || isLoading}
              onClick={() => void handleLoad(file.id)}
              className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low px-2 py-1 text-[10px] font-medium text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingId === file.id ? (
                <div className="h-2.5 w-2.5 animate-spin rounded-full border border-outline-variant border-t-primary" />
              ) : null}
              {file.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-outline-variant pt-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
          <Icon name="library_books" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-on-surface">
            Review corpus
          </h3>
          <p className="text-xs text-on-surface-variant">
            Pre-fetched Spotify reviews — Play Store, App Store, Reddit, and
            more
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => void handleLoad(DEFAULT_CORPUS_ID)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-all hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <Icon name="dataset" className="text-xl text-primary" />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Load full corpus
            </p>
            <p className="text-xs text-on-surface-variant">
              {defaultFile.reviewCount.toLocaleString()} reviews · all sources
            </p>
          </div>
        </div>
        {loadingId === DEFAULT_CORPUS_ID ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        ) : (
          <Icon name="arrow_forward" className="text-primary" />
        )}
      </button>

      <p className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
        Or load by source
      </p>
      <div className="flex flex-wrap gap-2">
        {sourceFiles.map((file) => (
          <button
            key={file.id}
            type="button"
            disabled={disabled || isLoading}
            onClick={() => void handleLoad(file.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingId === file.id ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            ) : (
              <Icon name="description" className="text-sm" />
            )}
            {file.label}
            <span className="text-on-surface-variant">({file.reviewCount})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
