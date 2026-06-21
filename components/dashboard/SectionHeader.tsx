import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

interface SectionBadgeProps {
  type: "evidence" | "interpretation";
}

export function SectionBadge({ type }: SectionBadgeProps) {
  const isEvidence = type === "evidence";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        isEvidence
          ? "bg-primary/10 text-primary"
          : "bg-tertiary-container/30 text-tertiary"
      }`}
    >
      <Icon name={isEvidence ? "analytics" : "psychology"} className="text-sm" />
      {isEvidence ? "Evidence" : "Interpretation"}
    </span>
  );
}

export function SectionHeader({
  title,
  type,
  description,
}: {
  title: string;
  type: "evidence" | "interpretation";
  description?: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <SectionBadge type={type} />
      </div>
      {description && (
        <p className="text-sm text-on-surface-variant">{description}</p>
      )}
    </div>
  );
}

export function EvidenceSection({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="space-y-gutter">{children}</div>;
}
