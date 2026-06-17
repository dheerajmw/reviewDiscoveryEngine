interface ProgressBarProps {
  completed: number;
  total: number;
  label?: string;
  shimmer?: boolean;
}

export default function ProgressBar({
  completed,
  total,
  label,
  shimmer = false,
}: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="text-sm font-medium text-on-surface">{label}</p>
      )}
      <div
        className={`h-2 w-full overflow-hidden rounded-full bg-surface-container-high ${shimmer ? "shimmer-bar" : ""}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-on-surface-variant">
        {completed} / {total} reviews ({pct}%)
      </p>
    </div>
  );
}
