import type { InsightResult } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface OpportunitiesProps {
  insights: InsightResult;
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

export default function Opportunities({ insights }: OpportunitiesProps) {
  return (
    <section className="space-y-4">
      <h3 className="px-1 text-base font-semibold text-on-surface">
        Product opportunities
      </h3>
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        {insights.opportunities.map((opportunity, index) => {
          const config = impactConfig(index);
          return (
            <article
              key={opportunity.title}
              className="group flex cursor-default flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-colors hover:border-primary"
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
              <h4 className="mb-2 text-lg font-semibold text-on-surface">
                {opportunity.title}
              </h4>
              <p className="flex-1 text-sm leading-relaxed text-on-surface-variant">
                {opportunity.description}
              </p>
              <div className="mt-6 flex items-center justify-end border-t border-outline-variant pt-4">
                <Icon
                  name="chevron_right"
                  className="text-primary opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
