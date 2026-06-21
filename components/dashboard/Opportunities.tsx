import type { OpportunityWithEvidence, QuoteEvidence } from "@/lib/types";
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

function impactConfig(index: number) {
  return IMPACT_CONFIG[Math.min(index, IMPACT_CONFIG.length - 1)];
}

export default function Opportunities({
  opportunities,
  onOpenDetail,
  onQuoteClick,
}: OpportunitiesProps) {
  return (
    <section className="space-y-4">
      <div className="px-1">
        <h3 className="text-base font-semibold text-on-surface">
          Product opportunities
        </h3>
        <p className="mt-1 text-xs text-on-surface-variant">
          Derived from top unmet needs — each links to supporting review quotes.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        {opportunities.map((opportunity, index) => {
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
