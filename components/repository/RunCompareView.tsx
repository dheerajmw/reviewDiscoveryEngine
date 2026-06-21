"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { compareRuns, fetchAnalysisRuns } from "@/lib/runs-client";
import type { AnalysisRunSummary, RunComparisonResult } from "@/lib/types";
import RepositoryLayout from "@/components/layout/RepositoryLayout";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";

function ComparisonTable({
  title,
  rows,
  labelA,
  labelB,
}: {
  title: string;
  rows: RunComparisonResult["themes"];
  labelA: string;
  labelB: string;
}) {
  if (!rows.length) return null;

  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant">
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">{labelA}</th>
              <th className="px-3 py-2 font-medium">{labelB}</th>
              <th className="px-3 py-2 font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-outline-variant/50">
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">{row.runAPct}%</td>
                <td className="px-3 py-2">{row.runBPct}%</td>
                <td
                  className={`px-3 py-2 font-medium ${
                    row.deltaPct > 0 ? "text-error" : "text-primary"
                  }`}
                >
                  {row.deltaPct > 0 ? "+" : ""}
                  {row.deltaPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function RunCompareView() {
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [runA, setRunA] = useState("");
  const [runB, setRunB] = useState("");
  const [comparison, setComparison] = useState<RunComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisRuns()
      .then(setRuns)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load runs."),
      );
  }, []);

  const handleCompare = async () => {
    if (!runA || !runB || runA === runB) return;
    setLoading(true);
    setError(null);
    try {
      const result = await compareRuns(runA, runB);
      setComparison(result);
    } catch (err) {
      setComparison(null);
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  };

  const labelA = comparison?.runA.dataset_name ?? "Run A";
  const labelB = comparison?.runB.dataset_name ?? "Run B";

  return (
    <RepositoryLayout
      active="compare"
      title="Compare analysis runs"
      subtitle="Dataset comparison"
    >
      <div className="max-w-4xl space-y-6">
        <p className="text-sm text-on-surface-variant">
          See how themes, barriers, and segments shift between datasets.
        </p>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-on-surface">Run A</span>
            <select
              value={runA}
              onChange={(e) => setRunA(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            >
              <option value="">Select run…</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.dataset_name} ({r.total_reviews} reviews)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-on-surface">Run B</span>
            <select
              value={runB}
              onChange={(e) => setRunB(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            >
              <option value="">Select run…</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.dataset_name} ({r.total_reviews} reviews)
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCompare}
            disabled={!runA || !runB || runA === runB || loading}
            className="sm:col-span-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            <Icon name="compare" />
            {loading ? "Comparing…" : "Compare runs"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {comparison && (
          <div className="space-y-6 animate-fade-in-up">
            <ComparisonTable
              title="Theme changes"
              rows={comparison.themes}
              labelA={labelA}
              labelB={labelB}
            />
            <ComparisonTable
              title="Barrier changes"
              rows={comparison.barriers}
              labelA={labelA}
              labelB={labelB}
            />
            <ComparisonTable
              title="Segment changes"
              rows={comparison.segments}
              labelA={labelA}
              labelB={labelB}
            />
            <ComparisonTable
              title="Root cause changes"
              rows={comparison.rootCauses}
              labelA={labelA}
              labelB={labelB}
            />
            <ComparisonTable
              title="Unmet need changes"
              rows={comparison.unmetNeeds}
              labelA={labelA}
              labelB={labelB}
            />
          </div>
        )}
      </div>
    </RepositoryLayout>
  );
}
