"use client";

import { useMemo, useState } from "react";
import type { OpportunityWithEvidence, QuoteEvidence } from "@/lib/types";
import {
  sortOpportunities,
  type OpportunitySortMode,
} from "@/lib/opportunity-evidence";
import Icon from "@/components/ui/Icon";
import type { DrawerSelection } from "./evidence/FindingDetailDrawer";
import EvidenceMeta from "./evidence/EvidenceMeta";
import FindingQuoteList from "./evidence/FindingQuoteList";

interface OpportunitiesProps {
  opportunities: OpportunityWithEvidence[];
  onOpenDetail: (selection: DrawerSelection) => void;
  onQuoteClick: (quote: QuoteEvidence) => void;
}

const IMPACT_CONFIG = [
  {
    tag: "High Impact",
    icon: "auto_graph",
    iconBg: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary",
    badge: "bg-primary-container text-on-primary-container",
  },
  {
    tag: "Medium Impact",
    icon: "filter_alt",
    iconBg:
      "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-on-secondary",
    badge: "bg-secondary-container text-on-secondary-container",
  },
  {
    tag: "Exploratory",
    icon: "compare_arrows",
    iconBg:
      "bg-tertiary-container/10 text-tertiary-container group-hover:bg-tertiary-container group-hover:text-white",
    badge: "bg-primary-container text-on-primary-container",
  },
] as const;

const SORT_OPTIONS: { value: OpportunitySortMode; label: string }[] = [
  { value: "frequency", label: "Review frequency" },
  { value: "business_impact", label: "Business impact" },
];

const RETENTION_SIGNAL_STYLES: Record<
  OpportunityWithEvidence["retention_signal"],
  string
> = {
  "High churn risk if unaddressed":
    "bg-error-container text-on-error-container",
  "Engagement growth opportunity":
    "bg-tertiary-container/20 text-tertiary-container",
  "Cross-segment retention impact":
    "bg-secondary-container text-on-secondary-container",
};

function impactConfig(index: number) {
  return IMPACT_CONFIG[Math.min(index, IMPACT_CONFIG.length - 1)];
}

export default function Opportunities({
  opportunities,
  onOpenDetail,
  onQuoteClick,
}: OpportunitiesProps) {
  const [sortMode, setSortMode] = useState<OpportunitySortMode>("frequency");

  const sortedOpportunities = useMemo(
    () => sortOpportunities(opportunities, sortMode),
    [opportunities, sortMode],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-on-surface">
            Product opportunities
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Derived from top unmet needs — each links to supporting review
            quotes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
            Sort by
          </span>
          <div className="flex rounded-lg border border-outline-variant p-0.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  sortMode === option.value
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        {sortedOpportunities.map((opportunity, index) => {
          const config = impactConfig(index);
          return (
            <article
              key={opportunity.title}
              className="group stitch-dash-card flex flex-col p-6 transition-colors hover:border-primary"
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`rounded p-2 transition-colors ${config.iconBg}`}
                >
                  <Icon name={config.icon} />
                </div>
                <span
                  className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}
                >
                  {config.tag}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOpenDetail({ type: "opportunity", finding: opportunity })
                }
                className="mb-2 text-left"
              >
                <h4 className="text-lg font-semibold text-on-surface group-hover:text-primary">
                  {opportunity.title}
                </h4>
              </button>
              <p className="flex-1 text-sm leading-relaxed text-on-surface-variant">
                {opportunity.description}
              </p>

              <div className="mt-4 space-y-3 border-t border-outline-variant pt-4">
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                    Driven by
                  </p>
                  <ul className="flex flex-wrap gap-1">
                    {opportunity.supporting_unmet_needs.map((need) => (
                      <li
                        key={need}
                        className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] text-on-secondary-container"
                      >
                        {need}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                    Affected segment
                  </p>
                  <p className="text-sm text-on-surface">
                    {opportunity.affected_segments.join(", ")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                    Retention signal
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${RETENTION_SIGNAL_STYLES[opportunity.retention_signal]}`}
                  >
                    {opportunity.retention_signal}
                  </span>
                </div>
                <EvidenceMeta
                  evidenceCount={opportunity.evidence_count}
                  confidence={opportunity.confidence}
                  sourceDistribution={opportunity.source_distribution}
                />
                <FindingQuoteList
                  quotes={opportunity.quotes}
                  limit={2}
                  onQuoteClick={onQuoteClick}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
