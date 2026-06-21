"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAnalysisRuns } from "@/lib/runs-client";
import type { AnalysisRunSummary } from "@/lib/types";
import RepositoryLayout from "@/components/layout/RepositoryLayout";
import Icon from "@/components/ui/Icon";

function formatRunDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    day: "numeric",
  });
}

function statusLabel(status: AnalysisRunSummary["status"]): string {
  if (status === "pending") return "queued";
  return status;
}

function statusTone(status: AnalysisRunSummary["status"]): string {
  if (status === "pending") return "text-warning";
  if (status === "completed") return "text-primary";
  return "text-on-surface-variant";
}

export default function AnalysisHistory() {
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisRuns()
      .then(setRuns)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load history."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <RepositoryLayout
      active="repository"
      title="Analysis history"
      subtitle="Research Repository"
    >
      <div className="mb-8 max-w-4xl">
        <p className="text-sm text-on-surface-variant">
          Persistent research runs — reopen, compare, and export findings.
        </p>
      </div>

      <div className="max-w-4xl">
        {loading && (
          <p className="text-sm text-on-surface-variant">Loading runs…</p>
        )}

        {error && (
          <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container">
            {error}
            {error.includes("not configured") && (
              <p className="mt-2 text-xs">
                Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local for cloud,
                or use the default local file at data/research.db.
              </p>
            )}
          </div>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <Icon name="folder_open" className="mx-auto text-4xl text-outline" />
            <p className="mt-4 text-sm text-on-surface-variant">
              No analysis runs yet. Upload a CSV to start your research repository.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            >
              <Icon name="upload_file" />
              New analysis
            </Link>
          </div>
        )}

        <ul className="space-y-3">
          {runs.map((run, index) => (
            <li key={run.id}>
              <Link
                href={`/runs/${run.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-low"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name="analytics" />
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">
                      {run.dataset_name}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      Run #{runs.length - index} · {formatRunDate(run.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {run.total_reviews} reviews
                  </p>
                  <p className={`text-xs capitalize ${statusTone(run.status)}`}>
                    {run.discovery_reviews} discovery · {statusLabel(run.status)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </RepositoryLayout>
  );
}
