import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({
  title,
  subtitle,
  children,
  className = "",
}: CardProps) {
  return (
    <section
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-6 ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold text-on-surface">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
