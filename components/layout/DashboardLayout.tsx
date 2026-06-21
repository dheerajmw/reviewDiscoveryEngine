import type { ReactNode } from "react";
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
  onExportPmReport,
  onOpenChat,
  onOpenEvidenceList,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar active="dashboard" runId={runId} runDemoMode={runDemoMode} />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          reviewCount={reviewCount}
          discoveryRelevantCount={discoveryRelevantCount}
          datasetName={datasetName}
          onReupload={onReupload}
          onExportMarkdown={onExportMarkdown}
          onExportJson={onExportJson}
          onExportCsv={onExportCsv}
          onExportPmReport={onExportPmReport}
          onOpenChat={onOpenChat}
          onOpenEvidenceList={onOpenEvidenceList}
        />

        <main className="custom-scrollbar flex-1 overflow-y-auto p-gutter">
          <div className="mx-auto max-w-[1400px] space-y-gutter">{children}</div>
        </main>
      </div>
    </div>
  );
}
