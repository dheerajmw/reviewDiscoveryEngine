"use client";

import { useEffect, useRef, useState } from "react";
import { PLATFORM_ASSISTANT_NAME } from "@/lib/brand";
import Icon from "@/components/ui/Icon";

interface DashboardHeaderProps {
  reviewCount: number;
  discoveryRelevantCount?: number;
  datasetName?: string;
  onReupload: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onExportCsv?: () => void;
  onExportDashboardPdf?: () => void | Promise<void>;
  onExportPmReport?: (format: "md" | "json" | "pdf") => void;
  onOpenChat?: () => void;
  onOpenEvidenceList?: () => void;
}

function HeaderButton({
  onClick,
  icon,
  label,
  className = "",
  title,
}: {
  onClick: () => void;
  icon: string;
  label?: string;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors active:scale-[0.98] ${className}`}
    >
      <Icon name={icon} className="text-base" />
      {label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

export default function DashboardHeader({
  reviewCount,
  discoveryRelevantCount,
  datasetName,
  onReupload,
  onExportMarkdown,
  onExportJson,
  onExportCsv,
  onExportDashboardPdf,
  onExportPmReport,
  onOpenChat,
  onOpenEvidenceList,
}: DashboardHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingDashboardPdf, setExportingDashboardPdf] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (
        exportRef.current &&
        !exportRef.current.contains(event.target as Node)
      ) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportOpen]);

  const runExport = (action: () => void) => {
    action();
    setExportOpen(false);
  };

  const runDashboardPdfExport = async () => {
    if (!onExportDashboardPdf || exportingDashboardPdf) return;
    setExportingDashboardPdf(true);
    try {
      await onExportDashboardPdf();
      setExportOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Dashboard PDF export failed.";
      window.alert(message);
    } finally {
      setExportingDashboardPdf(false);
    }
  };

  return (
    <header className="shrink-0 border-b border-outline-variant bg-surface-container-lowest px-3 py-2.5 sm:px-gutter">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="truncate text-sm font-bold tracking-tight text-primary sm:text-base"
              title={datasetName ?? "Spotify analysis"}
            >
              {datasetName ?? "Spotify analysis"}
            </h2>
            <span className="hidden shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
              Spotify
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-on-surface-variant sm:text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Icon name="verified" className="text-sm" />
              {reviewCount.toLocaleString()} analyzed
            </span>
            {discoveryRelevantCount !== undefined && (
              <>
                <span className="text-outline" aria-hidden>
                  ·
                </span>
                <span>
                  {discoveryRelevantCount.toLocaleString()} discovery-related
                </span>
              </>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 sm:gap-1.5"
          data-dashboard-no-print
        >
          <div className="relative" ref={exportRef}>
            <HeaderButton
              onClick={() => setExportOpen((open) => !open)}
              icon="file_download"
              label="Export"
              title="Export analysis"
              className="bg-surface-container-high text-on-surface hover:bg-surface-variant"
            />
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
              >
                {onExportDashboardPdf && (
                  <>
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-outline">
                      Dashboard
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={exportingDashboardPdf}
                      onClick={() => void runDashboardPdfExport()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low disabled:cursor-wait disabled:opacity-60"
                    >
                      <Icon name="picture_as_pdf" className="text-base text-primary" />
                      {exportingDashboardPdf ? "Opening print…" : "Dashboard PDF"}
                    </button>
                    <div className="my-1 border-t border-outline-variant" />
                  </>
                )}
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-outline">
                  Reports
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runExport(onExportMarkdown)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="description" className="text-base text-primary" />
                  Markdown report
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runExport(onExportJson)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="code" className="text-base text-primary" />
                  JSON data
                </button>
                {onExportCsv && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runExport(onExportCsv)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                  >
                    <Icon name="table_view" className="text-base text-primary" />
                    Classified CSV
                  </button>
                )}
                {onExportPmReport && (
                  <>
                    <div className="my-1 border-t border-outline-variant" />
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-outline">
                      PM research
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => runExport(() => onExportPmReport("md"))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                    >
                      PM report (Markdown)
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => runExport(() => onExportPmReport("json"))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                    >
                      PM report (JSON)
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => runExport(() => onExportPmReport("pdf"))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low"
                    >
                      PM report (PDF)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {onOpenEvidenceList && (
            <HeaderButton
              onClick={onOpenEvidenceList}
              icon="fact_check"
              label="Evidence"
              title="View matched evidence review list"
              className="bg-surface-container-high text-on-surface hover:bg-surface-variant"
            />
          )}

          {onOpenChat && (
            <HeaderButton
              onClick={onOpenChat}
              icon="forum"
              label="Assistant"
              title={`Ask ${PLATFORM_ASSISTANT_NAME}`}
              className="border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
            />
          )}

          <HeaderButton
            onClick={onReupload}
            icon="upload_file"
            label="New"
            title="Start new analysis"
            className="bg-primary text-on-primary hover:opacity-90"
          />
        </div>
      </div>
    </header>
  );
}
