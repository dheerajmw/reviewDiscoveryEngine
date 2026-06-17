import type { AggregationResult } from "@/lib/types";

interface FrequencyListProps {
  title: string;
  data: Record<string, { count: number; pct: number }>;
}

function FrequencyList({ title, data }: FrequencyListProps) {
  const entries = Object.entries(data).sort((a, b) => b[1].count - a[1].count);

  if (entries.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">No data</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-900">{title}</h3>
      <ul className="flex flex-col gap-3">
        {entries.map(([label, { count, pct }]) => (
          <li key={label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-zinc-800">{label}</span>
              <span className="text-zinc-500">
                {pct}% ({count})
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-800"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface AggregationPreviewProps {
  aggregation: AggregationResult;
}

export default function AggregationPreview({
  aggregation,
}: AggregationPreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-zinc-900">
        Pattern summary across {aggregation.totalReviews} reviews
      </p>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <FrequencyList
          title="Theme distribution"
          data={aggregation.themeFrequency}
        />
        <FrequencyList
          title="User segments"
          data={aggregation.segmentBreakdown}
        />
        <FrequencyList
          title="Discovery barriers"
          data={aggregation.barrierAnalysis}
        />
      </div>
    </div>
  );
}
