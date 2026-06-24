import { PLATFORM_NAME } from "@/lib/brand";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import NewAnalysisLink from "./NewAnalysisLink";
import SidebarDemoFooter from "./SidebarDemoFooter";

export type SidebarSection = "dashboard" | "repository" | "compare" | "quotes";

interface AppSidebarProps {
  active: SidebarSection;
  runId?: string;
  runDemoMode?: boolean;
}

const navLinkClass = (isActive: boolean) =>
  isActive
    ? "flex items-center gap-3 rounded-lg bg-secondary-container px-3 py-2 text-xs font-medium text-on-secondary-container transition-all active:scale-[0.98]"
    : "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface active:scale-[0.98]";

export default function AppSidebar({
  active,
  runId,
  runDemoMode = false,
}: AppSidebarProps) {
  const dashboardHref = runId ? `/runs/${runId}` : "/";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col gap-2 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Icon name="insights" filled />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-primary">
            {PLATFORM_NAME}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-outline">
            Review intelligence
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {active === "dashboard" ? (
          <div className={navLinkClass(true)}>
            <Icon name="dashboard" className="text-lg" />
            <span>Dashboard</span>
          </div>
        ) : (
          <Link href={dashboardHref} className={navLinkClass(false)}>
            <Icon name="dashboard" className="text-lg" />
            Dashboard
          </Link>
        )}

        {active === "repository" ? (
          <div className={navLinkClass(true)}>
            <Icon name="history" className="text-lg" />
            <span>Repository</span>
          </div>
        ) : (
          <Link href="/history" className={navLinkClass(false)}>
            <Icon name="history" className="text-lg" />
            Repository
          </Link>
        )}

        {active === "compare" ? (
          <div className={navLinkClass(true)}>
            <Icon name="compare" className="text-lg" />
            <span>Compare runs</span>
          </div>
        ) : (
          <Link href="/runs/compare" className={navLinkClass(false)}>
            <Icon name="compare" className="text-lg" />
            Compare runs
          </Link>
        )}

        {(runId || active === "quotes") &&
          (active === "quotes" ? (
            <div className={navLinkClass(true)}>
              <Icon name="format_quote" className="text-lg" />
              <span>Quote explorer</span>
            </div>
          ) : (
            <Link href={`/runs/${runId}/quotes`} className={navLinkClass(false)}>
              <Icon name="format_quote" className="text-lg" />
              Quote explorer
            </Link>
          ))}
      </nav>
      <div className="mt-auto space-y-3 border-t border-outline-variant pt-4">
        <SidebarDemoFooter runDemoMode={runDemoMode} />
        <NewAnalysisLink
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-90"
          icon="add"
        />
      </div>
    </aside>
  );
}
