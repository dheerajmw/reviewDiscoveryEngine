import type { ClusterEvidence } from "@/lib/types";
import { averageQuoteConfidence } from "@/lib/finding-evidence";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import EvidenceMeta from "./EvidenceMeta";
import FindingQuoteList from "./FindingQuoteList";

interface ClusterEvidencePanelProps {
  title: string;
  subtitle?: string;
  clusters: ClusterEvidence[];
  maxClusters?: number;
  onClusterClick?: (cluster: ClusterEvidence) => void;
  onQuoteClick?: (quote: import("@/lib/types").QuoteEvidence) => void;
}

export default function ClusterEvidencePanel({
  title,
  subtitle,
  clusters,
  maxClusters = 6,
  onClusterClick,
  onQuoteClick,
}: ClusterEvidencePanelProps) {
  const visible = clusters.filter((c) => c.count > 0).slice(0, maxClusters);

  if (visible.length === 0) {
    return (
      <Card title={title} subtitle={subtitle}>
        <p className="text-sm text-on-surface-variant">No evidence clusters.</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {visible.map((cluster) => {
          const confidence = averageQuoteConfidence(cluster.quotes);
          const sourceDistribution = cluster.quotes.reduce<
            Record<string, number>
          >((acc, q) => {
            acc[q.source] = (acc[q.source] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <div
              key={cluster.label}
              className="rounded-xl border border-outline-variant/60 p-4"
            >
              <button
                type="button"
                onClick={() => onClusterClick?.(cluster)}
                className="mb-3 flex w-full items-start justify-between gap-2 text-left"
              >
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">
                    {cluster.label}
                  </h4>
                  <EvidenceMeta
                    evidenceCount={cluster.count}
                    confidence={confidence}
                    sourceDistribution={sourceDistribution}
                    pct={cluster.pct}
                  />
                </div>
                <Icon name="chevron_right" className="shrink-0 text-primary" />
              </button>
              <FindingQuoteList
                quotes={cluster.quotes}
                limit={3}
                onQuoteClick={onQuoteClick}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
