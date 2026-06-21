import type { ReactNode } from "react";
import Link from "next/link";
import AppSidebar, { type SidebarSection } from "./AppSidebar";
import Icon from "@/components/ui/Icon";

interface RepositoryLayoutProps {
  children: ReactNode;
  active: SidebarSection;
  title: string;
  subtitle?: string;
  runId?: string;
}

export default function RepositoryLayout({
  children,
  active,
  title,
  subtitle,
  runId,
}: RepositoryLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar active={active} runId={runId} />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-gutter">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-primary">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                {subtitle}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-all hover:opacity-90 active:scale-95"
          >
            <Icon name="upload_file" className="text-base" />
            New analysis
          </Link>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto p-gutter">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
