import Icon from "@/components/ui/Icon";

interface EvidenceMetaProps {
  evidenceCount: number;
  confidence: number;
  sourceDistribution?: Record<string, number>;
  pct?: number;
}

export default function EvidenceMeta({
  evidenceCount,
  confidence,
  sourceDistribution,
  pct,
}: EvidenceMetaProps) {
  const sources = Object.entries(sourceDistribution ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {pct !== undefined && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
          {pct}%
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-on-surface-variant">
        <Icon name="groups" className="text-sm" />
        {evidenceCount} reviews
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-on-surface-variant">
        <Icon name="verified" className="text-sm text-primary" />
        {Math.round(confidence * 100)}% confidence
      </span>
      {sources.slice(0, 4).map(([source, count]) => (
        <span
          key={source}
          className="rounded-full border border-outline-variant px-2 py-0.5 capitalize text-on-surface-variant"
        >
          {source} · {count}
        </span>
      ))}
    </div>
  );
}
