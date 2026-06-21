"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAnalysisRun } from "@/lib/runs-client";
import type { StoredAnalysisRun } from "@/lib/types";
import Dashboard from "@/components/dashboard/Dashboard";
import PendingRunView from "@/components/repository/PendingRunView";
import RepositoryLayout from "@/components/layout/RepositoryLayout";
import Icon from "@/components/ui/Icon";

interface RunDashboardLoaderProps {
  runId: string;
}

export default function RunDashboardLoader({ runId }: RunDashboardLoaderProps) {
  const router = useRouter();
  const [stored, setStored] = useState<StoredAnalysisRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisRun(runId)
      .then(setStored)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load run."),
      );
  }, [runId]);

  if (error) {
    return (
      <RepositoryLayout
        active="dashboard"
        title="Analysis run"
        subtitle="Error"
        runId={runId}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <Icon name="error_outline" className="text-4xl text-error" />
          <p className="mt-4 text-sm text-on-surface-variant">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="mt-4 text-sm font-medium text-primary"
          >
            Back to repository
          </button>
        </div>
      </RepositoryLayout>
    );
  }

  if (!stored) {
    return (
      <RepositoryLayout
        active="dashboard"
        title="Analysis run"
        subtitle="Loading…"
        runId={runId}
      >
        <p className="text-sm text-on-surface-variant">Loading from repository…</p>
      </RepositoryLayout>
    );
  }

  if (stored.run.status === "pending" && stored.pendingReviews?.length) {
    return (
      <PendingRunView
        runId={runId}
        runMeta={stored.run}
        reviews={stored.pendingReviews}
      />
    );
  }

  return (
    <Dashboard
      runId={runId}
      runMeta={stored.run}
      classified={stored.classified}
      analysis={stored.analysis}
      usedMockClassifier={stored.run.used_mock_classifier}
      onReupload={() => router.push("/")}
    />
  );
}
