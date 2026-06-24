import type { ReactNode } from "react";
import type { EvidenceBackedFinding, QuoteEvidence } from "@/lib/types";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import type { DrawerSelection } from "./evidence/FindingDetailDrawer";
import FindingQuoteList from "./evidence/FindingQuoteList";

interface RootCausesProps {
  findings: EvidenceBackedFinding[];
  onOpenDetail: (selection: DrawerSelection) => void;
  onQuoteClick: (quote: QuoteEvidence) => void;
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <div className="text-sm leading-relaxed text-on-surface">{children}</div>
    </div>
  );
}

export default function RootCauses({
  findings,
  onOpenDetail,
  onQuoteClick,
}: RootCausesProps) {
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
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <FieldBlock label="Label">
                  <button
                    type="button"
                    onClick={() => onOpenDetail({ type: "finding", finding })}
                    className="text-left font-medium text-on-surface hover:text-primary"
                  >
                    {finding.title}
                  </button>
                </FieldBlock>
                <button
                  type="button"
                  onClick={() => onOpenDetail({ type: "finding", finding })}
                  className="shrink-0 text-primary"
                  aria-label={`Open details for ${finding.title}`}
                >
                  <Icon name="open_in_new" />
                </button>
              </div>

              {finding.pct !== undefined && (
                <FieldBlock label="Percentage">
                  {finding.pct}% of repetition-related reviews
                </FieldBlock>
              )}

              {finding.mechanism && (
                <FieldBlock label="Mechanism">{finding.mechanism}</FieldBlock>
              )}

              {finding.product_implication && (
                <FieldBlock label="Product implication">
                  {finding.product_implication}
                </FieldBlock>
              )}

              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                  Evidence
                </p>
                <FindingQuoteList
                  quotes={finding.quotes}
                  limit={2}
                  onQuoteClick={onQuoteClick}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
