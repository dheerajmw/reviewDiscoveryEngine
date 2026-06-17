import type { InsightResult } from "@/lib/types";

interface InsightsPreviewProps {
  insights: InsightResult;
}

export default function InsightsPreview({ insights }: InsightsPreviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-medium text-zinc-900">
          Executive summary
        </h3>
        <p className="text-sm leading-relaxed text-zinc-700">
          {insights.summary}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Root causes</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          {insights.rootCauses.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">
          Discovery problems
        </h3>
        <ul className="space-y-2 text-sm leading-relaxed text-zinc-700">
          {insights.discoveryProblems.map((problem) => (
            <li key={problem} className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{problem}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">
          Product opportunities
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.opportunities.map((opportunity) => (
            <article
              key={opportunity.title}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
            >
              <h4 className="text-sm font-medium text-zinc-900">
                {opportunity.title}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                {opportunity.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
