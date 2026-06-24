import type { CurationStats } from "@/lib/types";
import { CURATION_FILTER_DESCRIPTION } from "@/lib/filter-stages";

const REASON_LABELS: Record<string, string> = {
  duplicate: "Duplicates",
  too_short: "Too short",
  billing_or_pricing: "Billing / pricing",
  login_or_account: "Login / account",
  technical_issue: "Technical issues",
  advertising: "Advertising",
  customer_support: "Customer support",
  off_topic: "Off-topic",
  not_discovery_related: "Not discovery-related",
  playlist_promotion: "Playlist promotion",
  social_spam: "Social spam",
  praise_only: "Generic praise only",
};

interface CurationSummaryProps {
  stats: CurationStats;
  compact?: boolean;
  fetchFilterNote?: string;
}

export default function CurationSummary({
  stats,
  compact = false,
  fetchFilterNote,
}: CurationSummaryProps) {
  const topReasons = Object.entries(stats.by_reason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (compact) {
    return (
      <p className="text-xs text-on-surface-variant">
        {stats.total_loaded.toLocaleString()} loaded →{" "}
        <span className="font-medium text-on-surface">
          {stats.included.toLocaleString()}
        </span>{" "}
        sent to analysis
        {stats.excluded + stats.duplicates_removed > 0 && (
          <>
            {" "}
            · {(stats.excluded + stats.duplicates_removed).toLocaleString()}{" "}
            filtered out
          </>
        )}
      </p>
    );
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm"
    >
      <p className="font-medium text-on-surface">Review curation</p>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
        {CURATION_FILTER_DESCRIPTION}
      </p>
      {fetchFilterNote && (
        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
          <span className="font-medium text-on-surface">Fetch filter:</span>{" "}
          {fetchFilterNote}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
        {stats.total_loaded.toLocaleString()} loaded
        {stats.duplicates_removed > 0 && (
          <> · {stats.duplicates_removed.toLocaleString()} duplicates removed</>
        )}
        {" → "}
        <span className="font-medium text-primary">
          {stats.included.toLocaleString()} discovery-relevant
        </span>{" "}
        sent to LLM classification
        {stats.excluded > 0 && (
          <>
            {" "}
            · {stats.excluded.toLocaleString()} excluded before analysis
          </>
        )}
      </p>
      {topReasons.length > 0 && (
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Excluded:{" "}
          {topReasons
            .map(([reason, count]) => {
              const label = REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
              return `${label} ${count}`;
            })
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
