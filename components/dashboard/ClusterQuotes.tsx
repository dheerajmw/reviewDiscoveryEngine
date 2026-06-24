import type { ClusterEvidence } from "@/lib/types";
import { formatReviewQuoteText } from "@/lib/spotify-community-text";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";

interface ClusterQuotesProps {
  title: string;
  subtitle?: string;
  clusters: ClusterEvidence[];
  maxClusters?: number;
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default function ClusterQuotes({
  title,
  subtitle,
  clusters,
  maxClusters = 4,
}: ClusterQuotesProps) {
  const visible = clusters.filter((c) => c.quotes.length > 0).slice(0, maxClusters);

  if (visible.length === 0) {
    return (
      <Card title={title} subtitle={subtitle}>
        <p className="text-sm text-on-surface-variant">No representative quotes.</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {visible.map((cluster) => (
          <div key={cluster.label}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-on-surface">
                {cluster.label}
              </h4>
              <span className="text-xs font-mono text-on-surface-variant">
                {cluster.pct}% · {cluster.count} reviews
              </span>
            </div>
            <ul className="space-y-2">
              {cluster.quotes.map((quote, i) => (
                <li
                  key={`${cluster.label}-${i}`}
                  className="flex gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant"
                >
                  <Icon name="format_quote" className="shrink-0 text-primary/60" />
                  <div>
                    <p className="leading-relaxed">&ldquo;{truncate(formatReviewQuoteText(quote.source, quote.text))}&rdquo;</p>
                    <p className="mt-1 text-xs capitalize text-outline">
                      {quote.source} · {quote.segment}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
