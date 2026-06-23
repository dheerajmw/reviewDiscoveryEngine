import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "flat";
}

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  id,
  variant = "default",
}: CardProps) {
  const shell =
    variant === "flat"
      ? "stitch-dash-card p-6"
      : "stitch-dash-card p-6";

  return (
    <section id={id} className={`${shell} ${className}`}>
      {title && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-on-surface">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
