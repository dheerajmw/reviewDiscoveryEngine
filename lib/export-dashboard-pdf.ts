import {
  DASHBOARD_EXPORT_ROOT_ID,
  DASHBOARD_LAYOUT_COLUMN_ID,
  DASHBOARD_LAYOUT_SHELL_ID,
  DASHBOARD_SCROLL_CONTENT_ID,
  DASHBOARD_SCROLL_MAIN_ID,
} from "@/lib/dashboard-constants";

export { DASHBOARD_EXPORT_ROOT_ID };

interface ExportDashboardPdfOptions {
  filename: string;
}

const LAYOUT_SHELL_IDS = [
  DASHBOARD_LAYOUT_SHELL_ID,
  DASHBOARD_LAYOUT_COLUMN_ID,
  DASHBOARD_EXPORT_ROOT_ID,
  DASHBOARD_SCROLL_MAIN_ID,
  DASHBOARD_SCROLL_CONTENT_ID,
] as const;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "dashboard";
}

interface StyleSnapshot {
  element: HTMLElement;
  overflow: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  flex: string;
  display: string;
}

function collectLayoutElements(): HTMLElement[] {
  const elements = new Set<HTMLElement>([
    document.documentElement,
    document.body,
  ]);

  for (const id of LAYOUT_SHELL_IDS) {
    const element = document.getElementById(id);
    if (element) elements.add(element);
  }

  const scrollMain = document.getElementById(DASHBOARD_SCROLL_MAIN_ID);
  let parent = scrollMain?.parentElement ?? null;
  while (parent && parent !== document.body) {
    elements.add(parent);
    parent = parent.parentElement;
  }

  return [...elements];
}

function preparePrintLayout(): () => void {
  const elements = collectLayoutElements();
  const snapshots: StyleSnapshot[] = elements.map((element) => ({
    element,
    overflow: element.style.overflow,
    height: element.style.height,
    minHeight: element.style.minHeight,
    maxHeight: element.style.maxHeight,
    flex: element.style.flex,
    display: element.style.display,
  }));

  for (const element of elements) {
    element.style.overflow = "visible";
    element.style.height = "auto";
    element.style.minHeight = "auto";
    element.style.maxHeight = "none";
  }

  for (const id of LAYOUT_SHELL_IDS) {
    const element = document.getElementById(id);
    if (!element) continue;
    element.style.display = "block";
    element.style.flex = "none";
  }

  return () => {
    for (const snapshot of snapshots) {
      snapshot.element.style.overflow = snapshot.overflow;
      snapshot.element.style.height = snapshot.height;
      snapshot.element.style.minHeight = snapshot.minHeight;
      snapshot.element.style.maxHeight = snapshot.maxHeight;
      snapshot.element.style.flex = snapshot.flex;
      snapshot.element.style.display = snapshot.display;
    }
  };
}

export async function exportDashboardPdf(
  options: ExportDashboardPdfOptions,
): Promise<void> {
  const root = document.getElementById(DASHBOARD_EXPORT_ROOT_ID);
  if (!root) {
    throw new Error("Dashboard content not found.");
  }

  const scrollMain = document.getElementById(DASHBOARD_SCROLL_MAIN_ID);
  const previousScroll = scrollMain?.scrollTop ?? 0;
  scrollMain?.scrollTo({ top: 0 });

  const pdfTitle = sanitizeFilename(options.filename).replace(/\.pdf$/i, "");
  const previousTitle = document.title;
  document.title = pdfTitle;

  const restoreLayout = preparePrintLayout();
  document.documentElement.classList.add("dashboard-pdf-export");
  document.body.classList.add("dashboard-pdf-export");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    restoreLayout();
    document.documentElement.classList.remove("dashboard-pdf-export");
    document.body.classList.remove("dashboard-pdf-export");
    document.title = previousTitle;
    scrollMain?.scrollTo({ top: previousScroll });
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 5_000);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 200);
  });

  window.print();
}
