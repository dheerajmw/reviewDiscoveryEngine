"use client";

import { useEffect, useState } from "react";
import { fetchAnalysisRun } from "@/lib/runs-client";
import QuoteExplorer from "@/components/repository/QuoteExplorer";
import RepositoryLayout from "@/components/layout/RepositoryLayout";

export default function QuotesPageClient({ runId }: { runId: string }) {
  const [datasetName, setDatasetName] = useState("Analysis run");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysisRun(runId)
      .then((stored) => setDatasetName(stored.run.dataset_name))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <RepositoryLayout
        active="quotes"
        title="Quote explorer"
        subtitle="Loading…"
        runId={runId}
      >
        <p className="text-sm text-on-surface-variant">Loading…</p>
      </RepositoryLayout>
    );
  }

  return <QuoteExplorer runId={runId} datasetName={datasetName} />;
}
