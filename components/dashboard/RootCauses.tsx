import type { EvidenceBackedFinding } from "@/lib/types";
import Card from "@/components/ui/Card";

interface RootCausesProps {
  findings: EvidenceBackedFinding[];
}

export default function RootCauses({ findings }: RootCausesProps) {
  if (findings.length === 0) return null;

  return (
    <Card title="Root causes">
      <ol className="grid gap-4 md:grid-cols-2">
        {findings.map((finding, index) => (
          <li
            key={finding.id}
            className="flex gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-on-surface">{finding.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                {finding.summary}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
