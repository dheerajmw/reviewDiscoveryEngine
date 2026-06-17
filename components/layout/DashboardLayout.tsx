import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

interface DashboardLayoutProps {
  children: ReactNode;
  reviewCount: number;
  onReupload: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

export default function DashboardLayout({
  children,
  reviewCount,
  onReupload,
  onExportMarkdown,
  onExportJson,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low p-4 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Icon name="insights" filled />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary leading-none">
              Discovery Engine
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-outline">
              Analytics
            </p>
          </div>
        </div>
        <nav className="flex-1">
          <div className="flex items-center gap-3 rounded-lg bg-secondary-container px-3 py-2 text-on-secondary-container">
            <Icon name="dashboard" className="text-lg" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Dashboard
            </span>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-gutter">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-primary">Dashboard</h2>
            <div className="hidden h-4 w-px bg-outline-variant md:block" />
            <div className="hidden items-center gap-2 text-on-surface-variant md:flex">
              <Icon name="verified" className="text-lg text-primary" />
              <span className="text-xs font-medium uppercase tracking-wide text-primary">
                {reviewCount} reviews analyzed
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportMarkdown}
              className="flex items-center gap-2 rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-surface-variant active:scale-95"
            >
              <Icon name="file_download" className="text-base" />
              <span className="hidden sm:inline">Download Report</span>
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="flex items-center gap-2 rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-surface-variant active:scale-95"
            >
              <Icon name="code" className="text-base" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <div className="mx-1 hidden h-6 w-px bg-outline-variant sm:block" />
            <button
              type="button"
              onClick={onReupload}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-all hover:opacity-90 active:scale-95"
            >
              <Icon name="upload_file" className="text-base" />
              Re-upload
            </button>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto p-gutter">
          <div className="mx-auto max-w-[1400px] space-y-gutter">{children}</div>
        </main>
      </div>
    </div>
  );
}
