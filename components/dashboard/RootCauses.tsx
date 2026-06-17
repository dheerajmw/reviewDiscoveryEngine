import type { InsightResult } from "@/lib/types";
import Card from "@/components/ui/Card";

interface RootCausesProps {
  insights: InsightResult;
}

export default function RootCauses({ insights }: RootCausesProps) {
  return (
    <Card title="Root causes">
      <ol className="grid gap-4 md:grid-cols-2">
        {insights.rootCauses.map((cause, index) => (
          <li
            key={cause}
            className="flex gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {cause}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
