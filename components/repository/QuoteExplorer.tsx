"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { searchQuotes } from "@/lib/runs-client";
import { formatReviewQuoteText } from "@/lib/spotify-community-text";
import type { QuoteRecord, QuoteSearchFilters } from "@/lib/types";
import RepositoryLayout from "@/components/layout/RepositoryLayout";
import Icon from "@/components/ui/Icon";
import SourceBadge from "@/components/ui/SourceBadge";

interface QuoteExplorerProps {
  runId: string;
  datasetName: string;
}

export default function QuoteExplorer({ runId, datasetName }: QuoteExplorerProps) {
  const [filters, setFilters] = useState<QuoteSearchFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    themes: [] as string[],
    segments: [] as string[],
    rootCauses: [] as string[],
    unmetNeeds: [] as string[],
    barriers: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchQuotes(runId, {
        ...filters,
        search: searchInput || undefined,
      });
      setQuotes(result.quotes);
      setFilterOptions(result.filterOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotes.");
    } finally {
      setLoading(false);
    }
  }, [runId, filters, searchInput]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  return (
    <RepositoryLayout
      active="quotes"
      title="Quote explorer"
      subtitle={datasetName}
      runId={runId}
    >
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant">
            Search representative quotes by theme, segment, root cause, or unmet need.
          </p>
          <Link
            href={`/runs/${runId}`}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Icon name="arrow_back" className="text-base" />
            Back to dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="search"
            placeholder="Search quote text…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm sm:col-span-2 lg:col-span-3"
          />
          <FilterSelect
            label="Theme"
            value={filters.theme ?? ""}
            options={filterOptions.themes}
            onChange={(v) => setFilters((f) => ({ ...f, theme: v || undefined }))}
          />
          <FilterSelect
            label="Segment"
            value={filters.segment ?? ""}
            options={filterOptions.segments}
            onChange={(v) => setFilters((f) => ({ ...f, segment: v || undefined }))}
          />
          <FilterSelect
            label="Root cause"
            value={filters.root_cause ?? ""}
            options={filterOptions.rootCauses}
            onChange={(v) =>
              setFilters((f) => ({ ...f, root_cause: v || undefined }))
            }
          />
          <FilterSelect
            label="Unmet need"
            value={filters.unmet_need ?? ""}
            options={filterOptions.unmetNeeds}
            onChange={(v) =>
              setFilters((f) => ({ ...f, unmet_need: v || undefined }))
            }
          />
          <FilterSelect
            label="Barrier"
            value={filters.barrier ?? ""}
            options={filterOptions.barriers}
            onChange={(v) => setFilters((f) => ({ ...f, barrier: v || undefined }))}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading quotes…</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No quotes match your filters.</p>
        ) : (
          <ul className="space-y-3">
            {quotes.map((quote) => (
              <li
                key={quote.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {quote.theme && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {quote.theme}
                    </span>
                  )}
                  {quote.source && <SourceBadge source={quote.source} />}
                  {quote.segment && (
                    <span className="text-xs text-on-surface-variant">
                      {quote.segment}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-on-surface">
                  &ldquo;{formatReviewQuoteText(quote.source, quote.quote_text)}&rdquo;
                </p>
                {(quote.root_cause || quote.unmet_need || quote.barrier) && (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    {[quote.barrier, quote.root_cause, quote.unmet_need]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {quote.classification_reasons &&
                  Object.keys(quote.classification_reasons).length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-outline-variant/60 pt-2">
                      {(["theme", "root_cause", "unmet_need", "barrier"] as const)
                        .filter((field) => quote.classification_reasons?.[field])
                        .map((field) => (
                          <p key={field} className="text-xs text-on-surface-variant">
                            <span className="font-medium capitalize text-on-surface">
                              {field.replace("_", " ")}:
                            </span>{" "}
                            {quote.classification_reasons?.[field]}
                          </p>
                        ))}
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </RepositoryLayout>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-on-surface-variant">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
