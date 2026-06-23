import type { ReactNode } from "react";
import DashboardScrollControls from "@/components/dashboard/DashboardScrollControls";
import {
  DASHBOARD_EXPORT_ROOT_ID,
  DASHBOARD_LAYOUT_COLUMN_ID,
  DASHBOARD_LAYOUT_SHELL_ID,
  DASHBOARD_SCROLL_CONTENT_ID,
  DASHBOARD_SCROLL_MAIN_ID,
} from "@/lib/dashboard-constants";
import AppSidebar from "./AppSidebar";
import DashboardHeader from "./DashboardHeader";

interface DashboardLayoutProps {
  children: ReactNode;
  reviewCount: number;
  discoveryRelevantCount?: number;
  datasetName?: string;
  runId?: string;
  runDemoMode?: boolean;
  onReupload: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onExportCsv?: () => void;
  onExportDashboardPdf?: () => void | Promise<void>;
  onExportPmReport?: (format: "md" | "json" | "pdf") => void;
  onOpenChat?: () => void;
  onOpenEvidenceList?: () => void;
}

export default function DashboardLayout({
  children,
  reviewCount,
  discoveryRelevantCount,
  datasetName,
  runId,
  runDemoMode = false,
  onReupload,
  onExportMarkdown,
  onExportJson,
  onExportCsv,
  onExportDashboardPdf,
  onExportPmReport,
  onOpenChat,
  onOpenEvidenceList,
}: DashboardLayoutProps) {
  return (
    <div
      id={DASHBOARD_LAYOUT_SHELL_ID}
      className="flex h-screen w-full overflow-hidden bg-background"
    >
      <AppSidebar active="dashboard" runId={runId} runDemoMode={runDemoMode} />

      <div
        id={DASHBOARD_LAYOUT_COLUMN_ID}
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
      >
        <div
          id={DASHBOARD_EXPORT_ROOT_ID}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DashboardHeader
            reviewCount={reviewCount}
            discoveryRelevantCount={discoveryRelevantCount}
            datasetName={datasetName}
            onReupload={onReupload}
            onExportMarkdown={onExportMarkdown}
            onExportJson={onExportJson}
            onExportCsv={onExportCsv}
            onExportDashboardPdf={onExportDashboardPdf}
            onExportPmReport={onExportPmReport}
            onOpenChat={onOpenChat}
            onOpenEvidenceList={onOpenEvidenceList}
          />

          <main
            id={DASHBOARD_SCROLL_MAIN_ID}
            className="custom-scrollbar flex-1 overflow-y-auto p-gutter"
          >
            <div
              id={DASHBOARD_SCROLL_CONTENT_ID}
              className="mx-auto max-w-[1400px] space-y-gutter"
            >
              {children}
            </div>
          </main>
          <DashboardScrollControls />
        </div>
      </div>
    </div>
  );
}
